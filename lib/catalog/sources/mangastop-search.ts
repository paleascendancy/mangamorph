import { parseChapterSourceUrl } from '../source-url';
import { normalizeTitle, titleSimilarity } from '../title-resolver';
import type { SourceChapter } from '../types';

const MANGASTOP_ORIGIN = 'https://mangastop.net';
const SEARCH_ENDPOINT = `${MANGASTOP_ORIGIN}/`;
const REQUEST_TIMEOUT_MS = 8000;
const MAX_HTML_BYTES = 2_000_000;
const MAX_QUERY_LENGTH = 140;
const HEADING_LINK_WINDOW = 2600;

export type MangaStopSearchResult = {
  title: string;
  url: string;
  score: number;
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

function stripTags(value: string): string {
  return decodeHtml(value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim());
}

function readAnchorTitle(anchor: string, body: string): string {
  const titleAttr = anchor.match(/\btitle=["']([^"']+)["']/i)?.[1];
  const ariaLabel = anchor.match(/\baria-label=["']([^"']+)["']/i)?.[1];
  const imageAlt = body.match(/<img\b[^>]*alt=["']([^"']+)["']/i)?.[1];
  return stripTags(titleAttr ?? ariaLabel ?? imageAlt ?? body);
}

function collectRawRouteCandidates(
  html: string,
  cleanQuery: string,
  candidates: Map<string, MangaStopSearchResult>,
) {
  const normalizedQuery = normalizeTitle(cleanQuery);
  if (!normalizedQuery) return;

  const textPatterns = [
    /<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/gi,
    /<img\b[^>]*alt=["']([^"']+)["'][^>]*>/gi,
    /["'](?:title|name|titulo|nome)["']\s*:\s*["']([^"']+)["']/gi,
  ];

  for (const pattern of textPatterns) {
    for (const match of html.matchAll(pattern)) {
      if (match.index === undefined) continue;

      const title = stripTags(match[1]);
      if (!title || normalizeTitle(title) !== normalizedQuery) continue;

      const start = Math.max(0, match.index - 5000);
      const end = Math.min(html.length, match.index + match[0].length + 5000);
      const neighborhood = decodeHtml(html.slice(start, end));

      const routePatterns = [
        /https:\/\/mangastop\.net\/(obra\/\d+(?:\/[a-z0-9%_-]+)?|manga\/[a-z0-9%_-]+)\/?/gi,
        /(?:["'(=:]|\s)(\/(?:obra\/\d+(?:\/[a-z0-9%_-]+)?|manga\/[a-z0-9%_-]+)\/?)\b/gi,
      ];

      let best: { href: string; distance: number } | null = null;

      for (const routePattern of routePatterns) {
        for (const routeMatch of neighborhood.matchAll(routePattern)) {
          if (routeMatch.index === undefined) continue;

          const raw = routeMatch[1] ?? routeMatch[0];
          const href = raw.startsWith('http')
            ? raw
            : raw.startsWith('/')
              ? new URL(raw, MANGASTOP_ORIGIN).href
              : new URL(`/${raw}`, MANGASTOP_ORIGIN).href;

          try {
            parseChapterSourceUrl(href);
          } catch {
            continue;
          }

          const absolutePosition = start + routeMatch.index;
          const distance = Math.abs(absolutePosition - match.index);

          if (!best || distance < best.distance) {
            best = { href, distance };
          }
        }
      }

      if (best) {
        addCandidate(candidates, cleanQuery, title, best.href);
        continue;
      }

      const idPatterns = [
        /["'](?:obra[_-]?id|work[_-]?id|manga[_-]?id|id)["']\s*:\s*["']?(\d{3,})["']?/gi,
        /\b(?:obra[_-]?id|work[_-]?id|manga[_-]?id)\s*[=:]\s*["']?(\d{3,})["']?/gi,
      ];

      let nearestId: { id: string; distance: number } | null = null;

      for (const idPattern of idPatterns) {
        for (const idMatch of neighborhood.matchAll(idPattern)) {
          if (idMatch.index === undefined) continue;
          const distance = Math.abs((start + idMatch.index) - match.index);

          if (!nearestId || distance < nearestId.distance) {
            nearestId = { id: idMatch[1], distance };
          }
        }
      }

      if (nearestId && nearestId.distance <= 1600) {
        addCandidate(
          candidates,
          cleanQuery,
          title,
          `${MANGASTOP_ORIGIN}/obra/${nearestId.id}`,
        );
      }
    }
  }
}

async function fetchHtml(url: URL): Promise<string> {
  const response = await fetch(url, {
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      'User-Agent': 'MangaMorph/2.0 (+https://mangamorph-alpha.vercel.app)',
    },
    redirect: 'error',
    cache: 'no-store',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`MangásTop respondeu com status ${response.status} durante a busca.`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('text/html')) {
    throw new Error('A busca do MangásTop não retornou HTML.');
  }

  const declaredLength = Number(response.headers.get('content-length') ?? 0);
  if (declaredLength > MAX_HTML_BYTES) {
    throw new Error('A página de busca excede o limite permitido.');
  }

  const html = await response.text();
  if (new TextEncoder().encode(html).byteLength > MAX_HTML_BYTES) {
    throw new Error('A página de busca excede o limite permitido.');
  }

  return html;
}

async function fetchSearchHtml(query: string): Promise<string> {
  const cleanQuery = query.trim();

  if (!cleanQuery || cleanQuery.length > MAX_QUERY_LENGTH) {
    return '';
  }

  // A consulta é feita no próprio MangásTop. Mesmo quando a página pública
  // devolve a Home, o parser abaixo procura os cards reais renderizados ali.
  const searchUrl = new URL(SEARCH_ENDPOINT);
  searchUrl.searchParams.set('s', cleanQuery);

  return fetchHtml(searchUrl);
}

function addCandidate(
  candidates: Map<string, MangaStopSearchResult>,
  cleanQuery: string,
  title: string,
  href: string,
) {
  const cleanTitle = stripTags(title);
  if (!cleanTitle) return;

  let absoluteUrl: URL;
  try {
    absoluteUrl = new URL(decodeHtml(href), SEARCH_ENDPOINT);
  } catch {
    return;
  }

  let parsed;
  try {
    parsed = parseChapterSourceUrl(absoluteUrl.href);
  } catch {
    return;
  }

  const score = titleSimilarity(cleanQuery, cleanTitle);
  if (score < 0.45) return;

  const previous = candidates.get(parsed.profileUrl);
  if (!previous || score > previous.score) {
    candidates.set(parsed.profileUrl, {
      title: cleanTitle,
      url: parsed.profileUrl,
      score,
    });
  }
}

function collectAnchorCandidates(
  html: string,
  cleanQuery: string,
  candidates: Map<string, MangaStopSearchResult>,
) {
  const anchorPattern = /<a\b([^>]*)href=["']([^"']+)["']([^>]*)>([\s\S]*?)<\/a>/gi;

  for (const match of html.matchAll(anchorPattern)) {
    const attrs = `${match[1]} ${match[3]}`;
    const title = readAnchorTitle(attrs, match[4]);
    addCandidate(candidates, cleanQuery, title, match[2]);
  }
}

function findNearestWorkHref(html: string, position: number): string | null {
  const start = Math.max(0, position - HEADING_LINK_WINDOW);
  const end = Math.min(html.length, position + HEADING_LINK_WINDOW);
  const neighborhood = html.slice(start, end);
  const hrefPattern = /href=["']([^"']+)["']/gi;

  let nearest: { href: string; distance: number } | null = null;

  for (const hrefMatch of neighborhood.matchAll(hrefPattern)) {
    if (hrefMatch.index === undefined) continue;

    const href = hrefMatch[1];

    let absoluteUrl: URL;
    try {
      absoluteUrl = new URL(decodeHtml(href), SEARCH_ENDPOINT);
      parseChapterSourceUrl(absoluteUrl.href);
    } catch {
      continue;
    }

    const absoluteHrefPosition = start + hrefMatch.index;
    const distance = Math.abs(absoluteHrefPosition - position);

    if (!nearest || distance < nearest.distance) {
      nearest = { href, distance };
    }
  }

  return nearest?.href ?? null;
}

function collectHeadingCandidates(
  html: string,
  cleanQuery: string,
  candidates: Map<string, MangaStopSearchResult>,
) {
  const headingPattern = /<h[1-4]\b[^>]*>([\s\S]*?)<\/h[1-4]>/gi;

  for (const heading of html.matchAll(headingPattern)) {
    const title = stripTags(heading[1]);
    const score = titleSimilarity(cleanQuery, title);

    if (!title || score < 0.45 || heading.index === undefined) continue;

    const href = findNearestWorkHref(html, heading.index);
    if (href) addCandidate(candidates, cleanQuery, title, href);
  }
}

function collectImageCandidates(
  html: string,
  cleanQuery: string,
  candidates: Map<string, MangaStopSearchResult>,
) {
  const imagePattern = /<img\b[^>]*alt=["']([^"']+)["'][^>]*>/gi;

  for (const image of html.matchAll(imagePattern)) {
    const title = stripTags(image[1]);
    const score = titleSimilarity(cleanQuery, title);

    if (!title || score < 0.45 || image.index === undefined) continue;

    const href = findNearestWorkHref(html, image.index);
    if (href) addCandidate(candidates, cleanQuery, title, href);
  }
}

function rankCandidates(
  query: string,
  candidates: Map<string, MangaStopSearchResult>,
): MangaStopSearchResult[] {
  const normalizedQuery = normalizeTitle(query);

  return [...candidates.values()]
    .sort((left, right) => {
      const leftExact = normalizeTitle(left.title) === normalizedQuery ? 1 : 0;
      const rightExact = normalizeTitle(right.title) === normalizedQuery ? 1 : 0;

      if (leftExact !== rightExact) return rightExact - leftExact;
      return right.score - left.score;
    })
    .slice(0, 5);
}


function sourceSlugQuery(profileUrl: string): string | null {
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

function collectVisibleTitles(html: string): string[] {
  const titles = new Set<string>();
  const patterns = [
    /<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/gi,
    /<img\b[^>]*alt=["']([^"']+)["'][^>]*>/gi,
    /["'](?:title|name|titulo|nome)["']\s*:\s*["']([^"']+)["']/gi,
  ];

  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      const title = stripTags(match[1]);
      if (title) titles.add(title);
    }
  }

  return [...titles];
}

export async function resolveMangaStopTitleFromSourceUrl(profileUrl: string): Promise<string | null> {
  const parsed = parseChapterSourceUrl(profileUrl);
  const slugQuery = sourceSlugQuery(parsed.profileUrl);
  if (!slugQuery) return null;

  const candidateTitles = new Map<string, number>();
  const surfaces = [
    `/?s=${encodeURIComponent(slugQuery)}`,
    `/?q=${encodeURIComponent(slugQuery)}`,
    '/',
  ];

  for (const path of surfaces) {
    let html: string;

    try {
      html = await fetchHtml(new URL(path, MANGASTOP_ORIGIN));
    } catch {
      continue;
    }

    for (const title of collectVisibleTitles(html)) {
      const score = titleSimilarity(slugQuery, title);
      if (score < 0.72) continue;

      const previous = candidateTitles.get(title) ?? 0;
      if (score > previous) candidateTitles.set(title, score);
    }
  }

  const ranked = [...candidateTitles.entries()].sort((a, b) => b[1] - a[1]);
  return ranked[0]?.[0] ?? null;
}

export async function searchMangaStopWorks(query: string): Promise<MangaStopSearchResult[]> {
  const cleanQuery = query.trim();
  if (!cleanQuery || cleanQuery.length > MAX_QUERY_LENGTH) return [];

  const candidates = new Map<string, MangaStopSearchResult>();
  const directUrls = [
    `/?s=${encodeURIComponent(cleanQuery)}`,
    `/?q=${encodeURIComponent(cleanQuery)}`,
    `/titulos/?q=${encodeURIComponent(cleanQuery)}`,
    `/biblioteca/?q=${encodeURIComponent(cleanQuery)}`,
    '/',
  ];

  for (const path of directUrls) {
    let html: string;

    try {
      html = await fetchHtml(new URL(path, MANGASTOP_ORIGIN));
    } catch {
      continue;
    }

    collectAnchorCandidates(html, cleanQuery, candidates);
    collectHeadingCandidates(html, cleanQuery, candidates);
    collectImageCandidates(html, cleanQuery, candidates);
    collectRawRouteCandidates(html, cleanQuery, candidates);

    const results = rankCandidates(cleanQuery, candidates);
    if (results.some((result) => normalizeTitle(result.title) === normalizeTitle(cleanQuery))) {
      return results;
    }
  }

  return rankCandidates(cleanQuery, candidates);
}

export async function searchMangaStopChapters(workTitle: string): Promise<SourceChapter[]> {
  const cleanTitle = workTitle.trim();
  const html = await fetchSearchHtml(cleanTitle);
  if (!html) return [];

  const chapters = new Map<string, SourceChapter>();
  const anchorPattern = /<a\b([^>]*)href=["']([^"']+)["']([^>]*)>([\s\S]*?)<\/a>/gi;
  const normalizedWorkTitle = normalizeTitle(cleanTitle);

  for (const match of html.matchAll(anchorPattern)) {
    const attrs = `${match[1]} ${match[3]}`;
    const href = decodeHtml(match[2]);
    const label = readAnchorTitle(attrs, match[4]);

    let absoluteUrl: URL;
    try {
      absoluteUrl = new URL(href, SEARCH_ENDPOINT);
    } catch {
      continue;
    }

    if (!['mangastop.net', 'www.mangastop.net'].includes(absoluteUrl.hostname.toLowerCase())) continue;

    const urlText = decodeURIComponent(absoluteUrl.pathname.replace(/[-_]+/g, ' '));
    const combinedText = `${label} ${urlText}`;
    const chapterMatch = combinedText.match(/cap(?:[íi]tulo|\.)?\s*([0-9]+(?:\.[0-9]+)?)/i);

    if (!chapterMatch) continue;

    const withoutChapter = combinedText
      .replace(/cap(?:[íi]tulo|\.)?\s*[0-9]+(?:\.[0-9]+)?/ig, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const titleScore = titleSimilarity(cleanTitle, withoutChapter);
    const normalizedCombined = normalizeTitle(combinedText);

    if (titleScore < 0.55 && !normalizedCombined.includes(normalizedWorkTitle)) continue;

    const externalId = chapterMatch[1];
    chapters.set(absoluteUrl.href, {
      externalId,
      title: label || `Capítulo ${externalId}`,
      url: absoluteUrl.href,
    });
  }

  return [...chapters.values()].sort((left, right) => {
    const a = Number(left.externalId);
    const b = Number(right.externalId);
    return Number.isFinite(a) && Number.isFinite(b) ? b - a : right.externalId.localeCompare(left.externalId);
  });
}
