import * as cheerio from 'cheerio';
import type { SourceChapter } from '../types';
import { parseChapterSourceUrl } from '../source-url';
import { normalizeTitle, titleSimilarity } from '../title-resolver';

const MANGASTOP_ORIGIN = 'https://mangastop.net';
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_HTML_BYTES = 2_000_000;
const MAX_REDIRECTS = 3;

const GENERIC_TITLE_FRAGMENTS = [
  'mangastop - ler mangas',
  'mangas top - ler mangas',
  'ler mangas, manhwas e manhuas',
];

export type ScrapedMangaStopWork = {
  title: string;
  url: string;
  score: number;
  chapters: SourceChapter[];
};

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&nbsp;/gi, ' ');
}

function cleanText(value: string): string {
  return decodeHtml(value).replace(/\s+/g, ' ').trim();
}

function isGenericTitle(value: string): boolean {
  const normalized = normalizeTitle(value);
  return GENERIC_TITLE_FRAGMENTS.some((fragment) => normalized.includes(normalizeTitle(fragment)));
}

function safeSourceUrl(input: string): string | null {
  try {
    return parseChapterSourceUrl(input).profileUrl;
  } catch {
    return null;
  }
}

function safeMangaStopUrl(input: string, base = MANGASTOP_ORIGIN): URL | null {
  try {
    const url = new URL(input, base);
    if (url.protocol !== 'https:') return null;
    if (!['mangastop.net', 'www.mangastop.net'].includes(url.hostname.toLowerCase())) return null;
    return url;
  } catch {
    return null;
  }
}

async function fetchHtml(input: string): Promise<{ html: string; finalUrl: string }> {
  let currentUrl = new URL(input, MANGASTOP_ORIGIN);

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    const response = await fetch(currentUrl, {
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'MangaMorph/2.0 (+https://mangamorph-alpha.vercel.app)',
      },
      redirect: 'manual',
      cache: 'no-store',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location || redirectCount === MAX_REDIRECTS) {
        throw new Error('A fonte excedeu o limite seguro de redirecionamentos.');
      }

      const nextUrl = safeMangaStopUrl(location, currentUrl.href);
      if (!nextUrl) {
        throw new Error('A fonte tentou redirecionar para um domínio não permitido.');
      }

      currentUrl = nextUrl;
      continue;
    }

    if (!response.ok) {
      throw new Error(`MangásTop respondeu com status ${response.status}.`);
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

    return { html, finalUrl: currentUrl.href };
  }

  throw new Error('Não foi possível carregar a página da fonte.');
}

function chapterFromAnchor(
  href: string | undefined,
  label: string,
  baseUrl: string,
): SourceChapter | null {
  if (!href) return null;

  const url = safeMangaStopUrl(href, baseUrl);
  if (!url) return null;

  const combined = cleanText(`${label} ${decodeURIComponent(url.pathname).replace(/[-_]+/g, ' ')}`);
  const chapterMatch = combined.match(/cap(?:[íi]tulo|\.)?\s*([0-9]+(?:\.[0-9]+)?)/i);

  if (!chapterMatch) return null;

  const externalId = chapterMatch[1];

  return {
    externalId,
    title: cleanText(label) || `Capítulo ${externalId}`,
    url: url.href,
  };
}

function collectChaptersAround(
  $: cheerio.CheerioAPI,
  element: Parameters<cheerio.CheerioAPI>[0],
  baseUrl: string,
): SourceChapter[] {
  const chapters = new Map<string, SourceChapter>();
  let current = $(element);

  for (let depth = 0; depth < 5 && current.length; depth += 1) {
    current.find('a[href]').each((_, anchor) => {
      const link = $(anchor);
      const chapter = chapterFromAnchor(
        link.attr('href'),
        cleanText(link.text() || link.attr('title') || link.attr('aria-label') || ''),
        baseUrl,
      );

      if (chapter) chapters.set(chapter.url, chapter);
    });

    if (chapters.size > 0) break;
    current = current.parent();
  }

  return [...chapters.values()].sort((left, right) => {
    const a = Number(left.externalId);
    const b = Number(right.externalId);

    if (Number.isFinite(a) && Number.isFinite(b)) return b - a;
    return right.externalId.localeCompare(left.externalId);
  });
}

function titleNearAnchor(
  $: cheerio.CheerioAPI,
  anchor: Parameters<cheerio.CheerioAPI>[0],
): string | null {
  const link = $(anchor);
  const direct = [
    link.attr('title'),
    link.attr('aria-label'),
    link.find('img[alt]').first().attr('alt'),
    cleanText(link.text()),
  ]
    .map((value) => cleanText(value ?? ''))
    .find((value) => value && !isGenericTitle(value));

  if (direct) return direct;

  let current = link.parent();

  for (let depth = 0; depth < 5 && current.length; depth += 1) {
    const heading = current.find('h1,h2,h3,h4').first();
    const headingText = cleanText(heading.text());

    if (headingText && !isGenericTitle(headingText)) return headingText;

    const alt = cleanText(current.find('img[alt]').first().attr('alt') ?? '');
    if (alt && !isGenericTitle(alt)) return alt;

    current = current.parent();
  }

  return null;
}

function collectWorkCandidates(
  html: string,
  query: string,
  baseUrl: string,
): ScrapedMangaStopWork[] {
  const $ = cheerio.load(html);
  const results = new Map<string, ScrapedMangaStopWork>();

  $('a[href]').each((_, anchor) => {
    const href = $(anchor).attr('href');
    const absolute = safeMangaStopUrl(href ?? '', baseUrl);
    if (!absolute) return;

    const canonical = safeSourceUrl(absolute.href);
    if (!canonical) return;

    const title = titleNearAnchor($, anchor);
    if (!title) return;

    const score = titleSimilarity(query, title);
    if (score < 0.45) return;

    const chapters = collectChaptersAround($, anchor, baseUrl);
    const previous = results.get(canonical);

    if (!previous || score > previous.score || chapters.length > previous.chapters.length) {
      results.set(canonical, { title, url: canonical, score, chapters });
    }
  });

  return [...results.values()].sort((left, right) => {
    const exactLeft = normalizeTitle(left.title) === normalizeTitle(query) ? 1 : 0;
    const exactRight = normalizeTitle(right.title) === normalizeTitle(query) ? 1 : 0;

    if (exactLeft !== exactRight) return exactRight - exactLeft;
    return right.score - left.score;
  });
}

function extractDirectTitle(html: string): string | null {
  const $ = cheerio.load(html);
  const candidates = [
    $('main h1').first().text(),
    $('article h1').first().text(),
    $('h1').first().text(),
    $('meta[property="og:title"]').attr('content'),
    $('meta[name="twitter:title"]').attr('content'),
    $('title').text(),
  ];

  for (const candidate of candidates) {
    const title = cleanText(candidate ?? '');
    if (title && !isGenericTitle(title)) return title;
  }

  return null;
}

function findBestVisibleTitle(html: string, query: string): string | null {
  const $ = cheerio.load(html);
  const candidates = new Set<string>();

  $('h1,h2,h3,h4,h5,h6').each((_, element) => {
    const value = cleanText($(element).text());
    if (value && !isGenericTitle(value)) candidates.add(value);
  });

  $('img[alt]').each((_, element) => {
    const value = cleanText($(element).attr('alt') ?? '');
    if (value && !isGenericTitle(value)) candidates.add(value);
  });

  $('[title]').each((_, element) => {
    const value = cleanText($(element).attr('title') ?? '');
    if (value && !isGenericTitle(value)) candidates.add(value);
  });

  let best: { title: string; score: number } | null = null;

  for (const title of candidates) {
    const score = titleSimilarity(query, title);

    if (score >= 0.7 && (!best || score > best.score)) {
      best = { title, score };
    }
  }

  return best?.title ?? null;
}

async function scrapeVisibleTitle(query: string): Promise<string | null> {
  const cleanQuery = cleanText(query);
  if (!cleanQuery) return null;

  const surfaces = [
    `/?s=${encodeURIComponent(cleanQuery)}`,
    `/?q=${encodeURIComponent(cleanQuery)}`,
    '/',
    '/page/2/',
    '/page/3/',
    '/page/4/',
  ];

  let best: { title: string; score: number } | null = null;

  for (const path of surfaces) {
    try {
      const { html } = await fetchHtml(new URL(path, MANGASTOP_ORIGIN).href);
      const title = findBestVisibleTitle(html, cleanQuery);
      if (!title) continue;

      const score = titleSimilarity(cleanQuery, title);
      if (!best || score > best.score) best = { title, score };

      if (normalizeTitle(title) === normalizeTitle(cleanQuery)) break;
    } catch {
      // Continua tentando outras superfícies públicas do próprio MangásTop.
    }
  }

  return best?.title ?? null;
}

function extractDirectChapters(html: string, baseUrl: string): SourceChapter[] {
  const $ = cheerio.load(html);
  const chapters = new Map<string, SourceChapter>();

  $('a[href]').each((_, anchor) => {
    const link = $(anchor);
    const chapter = chapterFromAnchor(
      link.attr('href'),
      cleanText(link.text() || link.attr('title') || link.attr('aria-label') || ''),
      baseUrl,
    );

    if (chapter) chapters.set(chapter.url, chapter);
  });

  return [...chapters.values()].sort((left, right) => {
    const a = Number(left.externalId);
    const b = Number(right.externalId);

    if (Number.isFinite(a) && Number.isFinite(b)) return b - a;
    return right.externalId.localeCompare(left.externalId);
  });
}

function slugQuery(profileUrl: string): string | null {
  const url = new URL(profileUrl);
  const slug = url.pathname.match(/^\/obra\/\d+\/([^/]+)\/?$/i)?.[1]
    ?? url.pathname.match(/^\/manga\/([^/]+)\/?$/i)?.[1]
    ?? null;

  if (!slug) return null;

  return decodeURIComponent(slug)
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function scrapeMangaStopSearch(query: string): Promise<ScrapedMangaStopWork[]> {
  const cleanQuery = cleanText(query);
  if (!cleanQuery) return [];

  const surfaces = [
    `/?s=${encodeURIComponent(cleanQuery)}`,
    `/?q=${encodeURIComponent(cleanQuery)}`,
    '/',
    '/page/2/',
    '/page/3/',
    '/page/4/',
  ];

  const merged = new Map<string, ScrapedMangaStopWork>();

  for (const path of surfaces) {
    try {
      const { html, finalUrl } = await fetchHtml(new URL(path, MANGASTOP_ORIGIN).href);
      const candidates = collectWorkCandidates(html, cleanQuery, finalUrl);

      for (const candidate of candidates) {
        const previous = merged.get(candidate.url);

        if (!previous || candidate.score > previous.score || candidate.chapters.length > previous.chapters.length) {
          merged.set(candidate.url, candidate);
        }
      }

      if ([...merged.values()].some(
        (candidate) => normalizeTitle(candidate.title) === normalizeTitle(cleanQuery),
      )) {
        break;
      }
    } catch {
      // Uma superfície pode mudar sem impedir as demais tentativas.
    }
  }

  return [...merged.values()]
    .sort((left, right) => {
      const exactLeft = normalizeTitle(left.title) === normalizeTitle(cleanQuery) ? 1 : 0;
      const exactRight = normalizeTitle(right.title) === normalizeTitle(cleanQuery) ? 1 : 0;

      if (exactLeft !== exactRight) return exactRight - exactLeft;
      return right.score - left.score;
    })
    .slice(0, 5);
}

export async function scrapeMangaStopWork(
  profileUrl: string,
  titleHint?: string,
): Promise<{ title: string | null; chapters: SourceChapter[]; canonicalUrl: string }> {
  const source = parseChapterSourceUrl(profileUrl);
  const { html, finalUrl } = await fetchHtml(source.profileUrl);

  let title = extractDirectTitle(html);
  let chapters = extractDirectChapters(html, finalUrl);

  const query = cleanText(titleHint ?? '') || slugQuery(source.profileUrl);

  if ((!title || chapters.length === 0) && query) {
    const matches = await scrapeMangaStopSearch(query);
    const sourceSlug = slugQuery(source.profileUrl);

    const best = matches.find((candidate) => {
      try {
        const candidateSource = parseChapterSourceUrl(candidate.url);

        if (candidateSource.externalWorkId === source.externalWorkId) return true;

        const candidateSlug = slugQuery(candidate.url);
        return Boolean(
          sourceSlug
          && candidateSlug
          && normalizeTitle(sourceSlug) === normalizeTitle(candidateSlug),
        );
      } catch {
        return false;
      }
    }) ?? matches[0];

    if (best) {
      title = title ?? best.title;
      if (chapters.length === 0) chapters = best.chapters;
    }

    if (!title) {
      title = await scrapeVisibleTitle(query);
    }
  }

  return {
    title,
    chapters,
    canonicalUrl: safeSourceUrl(finalUrl) ?? source.profileUrl,
  };
}
