import { Hero } from '../components/home/Hero';
import { HomeSections } from '../components/home/HomeSections';
import { externalHtmlToPlainText } from '../lib/catalog/text';
import { createClient } from '../lib/supabase/server';

function cleanHeroDescription(value: string | null) {
  const clean = externalHtmlToPlainText(value);
  if (!clean) return undefined;

  return clean
    .replace(/\\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export default async function Home() {
  const supabase = await createClient();

  const { data: works } = await supabase
    .from('catalog_works')
    .select(
      'id, title, synopsis_pt_br, synopsis_original, cover_url, banner_url, genres_pt_br, genres_original, status, created_at',
    )
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(18);

  const realWorks = works ?? [];
  const highlighted = realWorks.slice(0, 5);
  const highlightIds = highlighted.map((work) => work.id);
  const firstChapterByWork = new Map<string, string>();

  if (highlightIds.length > 0) {
    const { data: chapters } = await supabase
      .from('catalog_chapters')
      .select('id, work_id, chapter_number')
      .in('work_id', highlightIds)
      .order('chapter_number', { ascending: true });

    for (const chapter of chapters ?? []) {
      if (!firstChapterByWork.has(chapter.work_id)) {
        firstChapterByWork.set(chapter.work_id, chapter.id);
      }
    }
  }

  const highlightWorks = highlighted.map((work) => {
    const firstChapterId = firstChapterByWork.get(work.id);
    const genres = work.genres_pt_br?.length
      ? work.genres_pt_br
      : work.genres_original ?? [];

    return {
      id: work.id,
      title: work.title,
      description: cleanHeroDescription(work.synopsis_pt_br ?? work.synopsis_original),
      coverUrl: work.cover_url ?? undefined,
      backdropUrl: work.banner_url ?? undefined,
      genres,
      status: work.status ?? undefined,
      readingHref: firstChapterId
        ? `/obra/${work.id}/capitulo/${firstChapterId}`
        : `/obra/${work.id}`,
      detailsHref: `/obra/${work.id}`,
    };
  });

  const newWorks = realWorks.map((work) => ({
    id: work.id,
    title: work.title,
    coverUrl: work.cover_url ?? undefined,
    href: `/obra/${work.id}`,
  }));

  return (
    <>
      <Hero works={highlightWorks} />
      <HomeSections newWorks={newWorks} />
    </>
  );
}
