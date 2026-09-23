import { createPublicClient } from '../supabase/public';
import {
  getSnapshotChapter,
  getSnapshotChapters,
  getSnapshotMetadataLinks,
  getSnapshotSource,
  getSnapshotWork,
  snapshotChapters,
  snapshotWorks,
} from './catalog-snapshot';

function fallbackLog(scope: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`[MangaMorph catalog fallback] ${scope}`, { message });
}

export async function loadHomeCatalog() {
  try {
    const supabase = createPublicClient();
    const { data: works, error: worksError } = await supabase
      .from('catalog_works')
      .select(
        'id,title,synopsis_pt_br,synopsis_original,cover_url,banner_url,genres_pt_br,genres_original,status,created_at',
      )
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(18);

    if (worksError) throw worksError;

    const workIds = (works ?? []).map((work) => work.id);
    let chapters: Array<{ id: string; work_id: string; chapter_number: number }> = [];

    if (workIds.length > 0) {
      const { data, error } = await supabase
        .from('catalog_chapters')
        .select('id,work_id,chapter_number')
        .in('work_id', workIds)
        .order('chapter_number', { ascending: true });

      if (error) {
        fallbackLog('home chapters', error);
        chapters = snapshotChapters
          .filter((chapter) => workIds.includes(chapter.work_id))
          .map(({ id, work_id, chapter_number }) => ({ id, work_id, chapter_number }));
      } else {
        chapters = data ?? [];
      }
    }

    return {
      works: works ?? [],
      chapters,
      usingFallback: false,
    };
  } catch (error) {
    fallbackLog('home', error);

    return {
      works: snapshotWorks,
      chapters: snapshotChapters.map(({ id, work_id, chapter_number }) => ({
        id,
        work_id,
        chapter_number,
      })),
      usingFallback: true,
    };
  }
}

export async function loadPublicWork(workId: string) {
  const snapshotWork = getSnapshotWork(workId);
  const snapshotChapterList = getSnapshotChapters(workId)
    .slice()
    .sort((a, b) => b.chapter_number - a.chapter_number);
  const snapshotLinks = getSnapshotMetadataLinks(workId);

  try {
    const supabase = createPublicClient();

    const [workResult, chaptersResult, linksResult] = await Promise.all([
      supabase
        .from('catalog_works')
        .select('*')
        .eq('id', workId)
        .eq('is_published', true)
        .maybeSingle(),
      supabase
        .from('catalog_chapters')
        .select('id,external_id,chapter_number,title,source_url')
        .eq('work_id', workId)
        .order('chapter_number', { ascending: false })
        .limit(500),
      supabase
        .from('catalog_metadata_links')
        .select('id,provider,external_id,profile_url,is_primary')
        .eq('work_id', workId)
        .order('is_primary', { ascending: false }),
    ]);

    if (workResult.error) {
      fallbackLog('work profile', workResult.error);
      if (!snapshotWork) return null;

      return {
        work: snapshotWork,
        chapters: snapshotChapterList,
        links: snapshotLinks,
        usingFallback: true,
      };
    }

    if (!workResult.data) return null;

    return {
      work: workResult.data,
      chapters: chaptersResult.error ? snapshotChapterList : chaptersResult.data ?? [],
      links: linksResult.error ? snapshotLinks : linksResult.data ?? [],
      usingFallback: Boolean(chaptersResult.error || linksResult.error),
    };
  } catch (error) {
    fallbackLog('work profile', error);
    if (!snapshotWork) return null;

    return {
      work: snapshotWork,
      chapters: snapshotChapterList,
      links: snapshotLinks,
      usingFallback: true,
    };
  }
}

export async function loadPublicChapter(workId: string, chapterId: string) {
  const snapshotWork = getSnapshotWork(workId);
  const snapshotSource = getSnapshotSource(workId);
  const snapshotChapter = getSnapshotChapter(workId, chapterId);
  const snapshotChapterList = getSnapshotChapters(workId);

  try {
    const supabase = createPublicClient();

    const [workResult, sourceResult, chapterResult, chapterListResult] = await Promise.all([
      supabase
        .from('catalog_works')
        .select('id,title,is_published')
        .eq('id', workId)
        .eq('is_published', true)
        .maybeSingle(),
      supabase
        .from('catalog_work_sources')
        .select('profile_url,external_work_id')
        .eq('work_id', workId)
        .maybeSingle(),
      supabase
        .from('catalog_chapters')
        .select('id,work_id,external_id,chapter_number,title,source_url')
        .eq('id', chapterId)
        .eq('work_id', workId)
        .maybeSingle(),
      supabase
        .from('catalog_chapters')
        .select('id,chapter_number,title')
        .eq('work_id', workId)
        .order('chapter_number', { ascending: true })
        .limit(500),
    ]);

    if (workResult.error || chapterResult.error) {
      fallbackLog('chapter reader', workResult.error ?? chapterResult.error);
      if (!snapshotWork || !snapshotChapter) return null;

      return {
        work: {
          id: snapshotWork.id,
          title: snapshotWork.title,
          is_published: snapshotWork.is_published,
        },
        source: snapshotSource,
        chapter: snapshotChapter,
        chapterList: snapshotChapterList.map(({ id, chapter_number, title }) => ({
          id,
          chapter_number,
          title,
        })),
        usingFallback: true,
      };
    }

    if (!workResult.data || !chapterResult.data) return null;

    return {
      work: workResult.data,
      source: sourceResult.error ? snapshotSource : sourceResult.data ?? snapshotSource,
      chapter: chapterResult.data,
      chapterList: chapterListResult.error
        ? snapshotChapterList.map(({ id, chapter_number, title }) => ({
            id,
            chapter_number,
            title,
          }))
        : chapterListResult.data ?? [],
      usingFallback: Boolean(sourceResult.error || chapterListResult.error),
    };
  } catch (error) {
    fallbackLog('chapter reader', error);
    if (!snapshotWork || !snapshotChapter) return null;

    return {
      work: {
        id: snapshotWork.id,
        title: snapshotWork.title,
        is_published: snapshotWork.is_published,
      },
      source: snapshotSource,
      chapter: snapshotChapter,
      chapterList: snapshotChapterList.map(({ id, chapter_number, title }) => ({
        id,
        chapter_number,
        title,
      })),
      usingFallback: true,
    };
  }
}
