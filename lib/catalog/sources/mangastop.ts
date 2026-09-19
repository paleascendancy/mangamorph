import type { SourceWorkSnapshot } from '../types';
import { parseChapterSourceUrl } from '../source-url';
import { scrapeMangaStopWork } from './mangastop-scraper';

export async function fetchMangasTopWork(
  profileUrl: string,
  titleHint?: string,
): Promise<SourceWorkSnapshot> {
  const requestedSource = parseChapterSourceUrl(profileUrl);
  const scraped = await scrapeMangaStopWork(requestedSource.profileUrl, titleHint);

  const canonicalSource = parseChapterSourceUrl(scraped.canonicalUrl);
  const title = scraped.title?.trim() || titleHint?.trim() || null;

  if (!title) {
    throw new Error('O scraping não conseguiu identificar o título da obra no MangásTop.');
  }

  return {
    ...canonicalSource,
    title,
    chapters: scraped.chapters,
  };
}
