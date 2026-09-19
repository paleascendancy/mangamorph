import type { SourceChapter } from '../types';
import {
  scrapeMangaStopSearch,
  scrapeMangaStopWork,
  type ScrapedMangaStopWork,
} from './mangastop-scraper';

export type MangaStopSearchResult = {
  title: string;
  url: string;
  score: number;
};

export async function searchMangaStopWorks(query: string): Promise<MangaStopSearchResult[]> {
  const results = await scrapeMangaStopSearch(query);

  return results.map(({ title, url, score }) => ({
    title,
    url,
    score,
  }));
}

export async function resolveMangaStopTitleFromSourceUrl(profileUrl: string): Promise<string | null> {
  const scraped = await scrapeMangaStopWork(profileUrl);
  return scraped.title;
}

export async function searchMangaStopChapters(workTitle: string): Promise<SourceChapter[]> {
  const results = await scrapeMangaStopSearch(workTitle);
  const chapters = new Map<string, SourceChapter>();

  for (const result of results.slice(0, 3)) {
    for (const chapter of result.chapters) {
      chapters.set(chapter.url, chapter);
    }

    if (chapters.size === 0) {
      try {
        const scraped = await scrapeMangaStopWork(result.url, result.title);

        for (const chapter of scraped.chapters) {
          chapters.set(chapter.url, chapter);
        }
      } catch {
        // Um resultado pode mudar sem impedir as demais tentativas.
      }
    }
  }

  return [...chapters.values()].sort((left, right) => {
    const a = Number(left.externalId);
    const b = Number(right.externalId);

    if (Number.isFinite(a) && Number.isFinite(b)) return b - a;
    return right.externalId.localeCompare(left.externalId);
  });
}

export type { ScrapedMangaStopWork };
