import { Hero } from '../components/home/Hero';
import { HomeSections } from '../components/home/HomeSections';
import { externalHtmlToPlainText } from '../lib/catalog/text';
import { createPublicClient } from '../lib/supabase/public';

function cleanHeroDescription(value: string | null) {
  const clean = externalHtmlToPlainText(value);
  if (!clean) return undefined;

  return clean
    .replace(/\\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export default async function Home() {
  const supabase = createPublicClient();

  // Mantemos a consulta principal enxuta para o Home continuar renderizando
  // mesmo se algum campo complementar de metadados falhar.
  const { data: works, error: worksError } = await supabase
    .from('catalog_works')
    .select('id, title, synopsis_pt_br, synopsis_original, cover_url, banner_url, created_at')
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(18);

  if (worksError) {
    console.error('[MangaMorph home] failed to load published works', {
      message: worksError.message,
      code: worksError.code,
    });
  }

  const realWorks = works ?? [];
  const workIds = realWorks.map((work) => work.id);
  const metadataByWork = new Map<
    string,
    { genres_pt_br: string[]; genres_original: string[]; status: string | null }
  >();

  if (workIds.length > 0) {
    const { data: metadata, error: metadataError } = await supabase
      .from('catalog_works')
      .select('id, genres_pt_br, genres_original, status')
      .in('id', workIds);

    if (metadataError) {
      console.warn('[MangaMorph home] complementary metadata unavailable', {
        message: metadataError.message,
        code: metadataError.code,
      });
    }

    for (const item of metadata ?? []) {
      metadataByWork.set(item.id, {
        genres_pt_br: item.genres_pt_br ?? [],
        genres_original: item.genres_original ?? [],
        status: item.status ?? null,
      });
    }
  }

  const highlighted = realWorks.slice(0, 5);
  const highlightIds = highlighted.map((work) => work.id);
  const firstChapterByWork = new Map<string, string>();

  if (highlightIds.length > 0) {
    const { data: chapters, error: chaptersError } = await supabase
      .from('catalog_chapters')
      .select('id, work_id, chapter_number')
      .in('work_id', highlightIds)
      .order('chapter_number', { ascending: true });

    if (chaptersError) {
      console.warn('[MangaMorph home] chapter links unavailable', {
        message: chaptersError.message,
        code: chaptersError.code,
      });
    }

    for (const chapter of chapters ?? []) {
      if (!firstChapterByWork.has(chapter.work_id)) {
        firstChapterByWork.set(chapter.work_id, chapter.id);
      }
    }
  }

  const highlightWorks = highlighted.map((work) => {
    const metadata = metadataByWork.get(work.id);
    const firstChapterId = firstChapterByWork.get(work.id);
    const genres = metadata?.genres_pt_br.length
      ? metadata.genres_pt_br
      : metadata?.genres_original ?? [];

    return {
      id: work.id,
      title: work.title,
      description: cleanHeroDescription(work.synopsis_pt_br ?? work.synopsis_original),
      coverUrl: work.cover_url ?? undefined,
      backdropUrl: work.banner_url ?? undefined,
      genres,
      status: metadata?.status ?? undefined,
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
