import type { SourceWorkSnapshot } from '../types';
import { parseChapterSourceUrl } from '../source-url';

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

function extractTitle(html: string): string | null {
  const heading = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  if (heading) {
    const title = stripTags(heading);
    if (title) return title;
  }

  const openGraph = html.match(/<meta\b[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["'][^>]*>/i)?.[1]
    ?? html.match(/<meta\b[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["'][^>]*>/i)?.[1];

  return openGraph ? stripTags(openGraph) : null;
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
    chapters.set(url.href, {
      externalId,
      title: `Capítulo ${externalId}`,
      url: url.href,
    });
  }

  return [...chapters.values()];
}

export async function fetchMangasTopWork(profileUrl: string): Promise<SourceWorkSnapshot> {
  const source = parseChapterSourceUrl(profileUrl);

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

    if (nextSource.externalWorkId !== source.externalWorkId) {
      throw new Error('A fonte tentou redirecionar para outra obra.');
    }

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

  const title = extractTitle(html);
  if (!title) {
    throw new Error('Não foi possível identificar o título da obra com segurança.');
  }

  return {
    ...source,
    title,
    chapters: extractChapters(html, source.profileUrl),
  };
}
