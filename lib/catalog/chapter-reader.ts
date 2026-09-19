import { unstable_cache } from 'next/cache';
import {
  scrapeMangaStopChapter,
  type MangaStopChapterSnapshot,
} from './sources/mangastop-chapter';

const getCachedChapterSnapshot = unstable_cache(
  async (chapterUrl: string): Promise<MangaStopChapterSnapshot> => {
    const snapshot = await scrapeMangaStopChapter(chapterUrl);

    if (snapshot.images.length === 0) {
      throw new Error('A fonte não expôs páginas válidas para este capítulo.');
    }

    return snapshot;
  },
  ['mangamorph-chapter-reader'],
  {
    revalidate: 1800,
  },
);

export async function getChapterReaderSnapshot(
  chapterUrl: string,
): Promise<MangaStopChapterSnapshot> {
  return getCachedChapterSnapshot(chapterUrl);
}
