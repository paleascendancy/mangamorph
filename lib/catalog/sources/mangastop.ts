import type { SourceWorkSnapshot } from '../types';
import { parseChapterSourceUrl } from '../source-url';
import { resolveMangaStopTitleFromSourceUrl, searchMangaStopChapters } from './mangastop-search';

const REQUEST_TIMEOUT_MS = 8000;
const MAX_HTML_BYTES = 2_000_000;
const MAX_REDIRECTS = 3;

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&nbsp;/gi, ' ');
}

function stripTags(value: string): string {
  return decodeHtml(value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim());
}

function isGenericSiteTitle(value: string): boolean {
  const normalized = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  return normalized.includes('mangastop - ler mangas')
    || normalized.includes('mangas top - ler mangas');
}

function extractTitle(html: string): string | null {
  for (const tag of ['h1', 'h2', 'h3']) {
    const heading = html.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))?.[1];

    if (heading) {
      const title = stripTags(heading);
      if (title && !isGenericSiteTitle(title)) return title;
    }
  }

  const openGraph = html.match(/<meta\b[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["'][^>]*>/i)?.[1]
    ?? html.match(/<meta\b[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["'][^>]*>/i)?.[1];

  if (!openGraph) return null;

  const title = stripTags(openGraph);
  return title && !isGenericSiteTitle(title) ? title : null;
}

function extractChapters(html: string, baseUrl: string) {
  const chapters = new Map<string, { externalId: string; title: string; url: string }>();
  const anchorPattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

  for (const match of html.matchAll(anchorPattern)) {
    const href = decodeHtml(match[1]);
    const label = stripTags(match[2]);
    const chapterMatch = label.match(/cap(?:[íi]tulo|\.)?\s*([0-9]+(?:\.[0-9]+)?)/i);

    if (!chapterMatch) continue;

    let url: URL;
    try {
      url = new URL(href, baseUrl);
    } catch {
      continue;
    }

    if (!['mangastop.net', 'www.mangastop.net'].includes(url.hostname.toLowerCase())) continue;

    const externalId = chapterMatch[1];
    const chapterTitle = label || `Capítulo ${externalId}`;

    chapters.set(url.href, {
      externalId,
      title: chapterTitle,
      url: url.href,
    });
  }

  return [...chapters.values()];
}

function getSourceSlug(profileUrl: string): string | null {
  const url = new URL(profileUrl);

  return url.pathname.match(/^\/obra\/\d+\/([^/]+)\/?$/i)?.[1]
    ?? url.pathname.match(/^\/manga\/([^/]+)\/?$/i)?.[1]
    ?? null;
}

function titleFromSourceSlug(profileUrl: string): string | null {
  const slug = getSourceSlug(profileUrl);
  if (!slug) return null;

  const words = decodeURIComponent(slug)
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);

  if (words.length === 0) return null;

  const smallWords = new Set([
    'a', 'as', 'o', 'os', 'de', 'da', 'das', 'do', 'dos',
    'e', 'em', 'na', 'nas', 'no', 'nos', 'por', 'para',
  ]);

  return words
    .map((word, index) => {
      const lower = word.toLowerCase();

      if (index > 0 && smallWords.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

function isSafeWorkRedirect(
  original: ReturnType<typeof parseChapterSourceUrl>,
  next: ReturnType<typeof parseChapterSourceUrl>,
): boolean {
  if (original.externalWorkId === next.externalWorkId) return true;

  const originalSlug = getSourceSlug(original.profileUrl);
  const nextSlug = getSourceSlug(next.profileUrl);

  return Boolean(
    originalSlug
    && nextSlug
    && decodeURIComponent(originalSlug).toLowerCase() === decodeURIComponent(nextSlug).toLowerCase(),
  );
}

export async function fetchMangasTopWork(profileUrl: string, titleHint?: string): Promise<SourceWorkSnapshot> {
  const source = parseChapterSourceUrl(profileUrl);
  let resolvedSource = source;

  let currentUrl = source.profileUrl;
  let response: Response | null = null;

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    response = await fetch(currentUrl, {
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'MangaMorph/2.0 (+https://mangamorph-alpha.vercel.app)',
      },
      redirect: 'manual',
      cache: 'no-store',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (![301, 302, 303, 307, 308].includes(response.status)) break;

    const location = response.headers.get('location');
    if (!location || redirectCount === MAX_REDIRECTS) {
      throw new Error('A fonte excedeu o limite seguro de redirecionamentos.');
    }

    const nextUrl = new URL(location, currentUrl);
    const nextSource = parseChapterSourceUrl(nextUrl.href);

    if (!isSafeWorkRedirect(resolvedSource, nextSource)) {
      throw new Error('A fonte tentou redirecionar para outra obra.');
    }

    resolvedSource = nextSource;
    currentUrl = nextSource.profileUrl;
  }

  if (!response?.ok) {
    throw new Error(`MangásTop respondeu com status ${response?.status ?? 'desconhecido'}.`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('text/html')) {
    throw new Error('A fonte não retornou uma página HTML.');
  }

  const declaredLength = Number(response.headers.get('content-length') ?? 0);
  if (declaredLength > MAX_HTML_BYTES) {
    throw new Error('A página da fonte excede o limite permitido.');
  }

  const html = await response.text();
  if (new TextEncoder().encode(html).byteLength > MAX_HTML_BYTES) {
    throw new Error('A página da fonte excede o limite permitido.');
  }

  let title = extractTitle(html);
  let chapters = extractChapters(html, currentUrl);

  if ((!title || isGenericSiteTitle(title)) && titleHint?.trim()) {
    title = titleHint.trim();
  }

  if (!title || isGenericSiteTitle(title)) {
    try {
      title = await resolveMangaStopTitleFromSourceUrl(resolvedSource.profileUrl);
    } catch {
      // Continua para os fallbacks seguintes.
    }
  }

  if (!title || isGenericSiteTitle(title)) {
    title = titleFromSourceSlug(resolvedSource.profileUrl);

    if (title) {
      console.info('[MangaMorph catalog] title recovered from MangaStop source slug', {
        externalWorkId: resolvedSource.externalWorkId,
      });
    }
  }

  const slug = getSourceSlug(resolvedSource.profileUrl);

  // A rota nova de obra pode devolver apenas o shell genérico no HTML do servidor.
  // Quando isso acontece, a página pública de categoria da mesma obra é usada
  // somente como fallback de metadados básicos e lista de capítulos.
  if (slug && (!title || chapters.length === 0)) {
    const legacyUrl = `https://mangastop.net/Categorias/${slug}/`;

    try {
      const legacyResponse = await fetch(legacyUrl, {
        headers: {
          Accept: 'text/html,application/xhtml+xml',
          'User-Agent': 'MangaMorph/2.0 (+https://mangamorph-alpha.vercel.app)',
        },
        redirect: 'manual',
        cache: 'no-store',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (legacyResponse.ok) {
        const legacyType = legacyResponse.headers.get('content-type') ?? '';
        const legacyLength = Number(legacyResponse.headers.get('content-length') ?? 0);

        if (legacyType.includes('text/html') && legacyLength <= MAX_HTML_BYTES) {
          const legacyHtml = await legacyResponse.text();

          if (new TextEncoder().encode(legacyHtml).byteLength <= MAX_HTML_BYTES) {
            title = title ?? extractTitle(legacyHtml);

            if (chapters.length === 0) {
              chapters = extractChapters(legacyHtml, legacyUrl);
            }
          }
        }
      }
    } catch {
      // O fallback legado é opcional; a análise principal continua abaixo.
    }
  }

  if (!title) {
    throw new Error('Não foi possível identificar o título da obra com segurança.');
  }

  if (chapters.length === 0) {
    try {
      chapters = await searchMangaStopChapters(title);
    } catch {
      // A busca por capítulos é fallback; a obra ainda pode ser analisada sem capítulos.
    }
  }

  return {
    ...resolvedSource,
    title,
    chapters,
  };
}
