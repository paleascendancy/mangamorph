import { Hero } from '../components/home/Hero';
import { HomeSections } from '../components/home/HomeSections';
import { loadHomeCatalog } from '../lib/catalog/public-catalog';
import { externalHtmlToPlainText } from '../lib/catalog/text';

function cleanHeroDescription(value: string | null) {
  const clean = externalHtmlToPlainText(value);
  if (!clean) return undefined;

  return clean
    .replace(/\\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export default async function Home() {
  const { works: realWorks, chapters } = await loadHomeCatalog();

  const highlighted = realWorks.slice(0, 5);
  const firstChapterByWork = new Map<string, string>();

  for (const chapter of chapters) {
    if (!firstChapterByWork.has(chapter.work_id)) {
      firstChapterByWork.set(chapter.work_id, chapter.id);
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
