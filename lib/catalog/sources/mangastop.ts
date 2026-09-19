import type { SourceWorkSnapshot } from '../types';
import { parseChapterSourceUrl } from '../source-url';
import { scrapeMangaStopWork } from './mangastop-scraper';

function titleFromCanonicalSlug(profileUrl: string): string | null {
  const url = new URL(profileUrl);
  const slug = url.pathname.match(/^\/obra\/\d+\/([^/]+)\/?$/i)?.[1]
    ?? url.pathname.match(/^\/manga\/([^/]+)\/?$/i)?.[1]
    ?? null;

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

export async function fetchMangasTopWork(
  profileUrl: string,
  titleHint?: string,
): Promise<SourceWorkSnapshot> {
  const requestedSource = parseChapterSourceUrl(profileUrl);
  const scraped = await scrapeMangaStopWork(requestedSource.profileUrl, titleHint);

  const canonicalSource = parseChapterSourceUrl(scraped.canonicalUrl);
  const title = scraped.title?.trim()
    || titleHint?.trim()
    || titleFromCanonicalSlug(canonicalSource.profileUrl);

  if (!title) {
    throw new Error('O scraping não conseguiu identificar o título da obra no MangásTop.');
  }

  return {
    ...canonicalSource,
    title,
    alternativeTitles: scraped.alternativeTitles,
    chapters: scraped.chapters,
  };
}
