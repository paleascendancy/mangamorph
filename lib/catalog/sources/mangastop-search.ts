import { parseChapterSourceUrl } from '../source-url';
import { normalizeTitle, titleSimilarity } from '../title-resolver';
import type { SourceChapter } from '../types';

const SEARCH_ENDPOINT = 'https://mangastop.net/';
const REQUEST_TIMEOUT_MS = 8000;
const MAX_HTML_BYTES = 2_000_000;
const MAX_QUERY_LENGTH = 140;

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
  return stripTags(titleAttr ?? ariaLabel ?? body);
}

async function fetchSearchHtml(query: string): Promise<string> {
  const cleanQuery = query.trim();

  if (!cleanQuery || cleanQuery.length > MAX_QUERY_LENGTH) {
    return '';
  }

  const searchUrl = new URL(SEARCH_ENDPOINT);
  searchUrl.searchParams.set('s', cleanQuery);

  const response = await fetch(searchUrl, {
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

export async function searchMangaStopWorks(query: string): Promise<MangaStopSearchResult[]> {
  const cleanQuery = query.trim();
  const html = await fetchSearchHtml(cleanQuery);
  if (!html) return [];

  const candidates = new Map<string, MangaStopSearchResult>();
  const anchorPattern = /<a\b([^>]*)href=["']([^"']+)["']([^>]*)>([\s\S]*?)<\/a>/gi;

  for (const match of html.matchAll(anchorPattern)) {
    const attrs = `${match[1]} ${match[3]}`;
    const href = decodeHtml(match[2]);
    const title = readAnchorTitle(attrs, match[4]);

    if (!title) continue;

    let absoluteUrl: URL;
    try {
      absoluteUrl = new URL(href, SEARCH_ENDPOINT);
    } catch {
      continue;
    }

    let parsed;
    try {
      parsed = parseChapterSourceUrl(absoluteUrl.href);
    } catch {
      continue;
    }

    const score = titleSimilarity(cleanQuery, title);
    if (score < 0.45) continue;

    const previous = candidates.get(parsed.profileUrl);
    if (!previous || score > previous.score) {
      candidates.set(parsed.profileUrl, {
        title,
        url: parsed.profileUrl,
        score,
      });
    }
  }

  const normalizedQuery = normalizeTitle(cleanQuery);

  return [...candidates.values()]
    .sort((left, right) => {
      const leftExact = normalizeTitle(left.title) === normalizedQuery ? 1 : 0;
      const rightExact = normalizeTitle(right.title) === normalizedQuery ? 1 : 0;

      if (leftExact !== rightExact) return rightExact - leftExact;
      return right.score - left.score;
    })
    .slice(0, 5);
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
