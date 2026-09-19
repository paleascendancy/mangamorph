import { notFound } from 'next/navigation';
import { scrapeMangaStopChapter } from '../../../../../lib/catalog/sources/mangastop-chapter';
import { createClient } from '../../../../../lib/supabase/server';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ id: string; chapterId: string }>;
};

export default async function MangaMorphChapterPage({ params }: PageProps) {
  const { id, chapterId } = await params;
  const supabase = await createClient();

  const [{ data: work }, { data: chapter }, { data: chapterList }] = await Promise.all([
    supabase
      .from('catalog_works')
      .select('id,title,is_published')
      .eq('id', id)
      .eq('is_published', true)
      .maybeSingle(),
    supabase
      .from('catalog_chapters')
      .select('id,work_id,external_id,chapter_number,title,source_url')
      .eq('id', chapterId)
      .eq('work_id', id)
      .maybeSingle(),
    supabase
      .from('catalog_chapters')
      .select('id,chapter_number,title')
      .eq('work_id', id)
      .order('chapter_number', { ascending: true })
      .limit(500),
  ]);

  if (!work || !chapter) notFound();

  const chapters = chapterList ?? [];
  const currentIndex = chapters.findIndex((item) => item.id === chapter.id);
  const previousChapter = currentIndex > 0 ? chapters[currentIndex - 1] : null;
  const nextChapter = currentIndex >= 0 && currentIndex < chapters.length - 1
    ? chapters[currentIndex + 1]
    : null;

  let pages: string[] = [];
  let readerError: string | null = null;

  try {
    const snapshot = await scrapeMangaStopChapter(chapter.source_url);
    pages = snapshot.images;

    if (pages.length === 0) {
      readerError = 'A fonte não expôs as páginas deste capítulo para o leitor.';
    }
  } catch (error) {
    readerError = error instanceof Error
      ? error.message
      : 'Não foi possível carregar este capítulo.';
  }

  return (
    <article className="chapter-reader-page">
      <div className="chapter-reader-topbar">
        <a className="chapter-reader-back" href={`/obra/${work.id}`}>
          Voltar para a obra
        </a>

        <div className="chapter-reader-heading">
          <span>{work.title}</span>
          <h1>{chapter.title}</h1>
        </div>

        <a
          className="chapter-reader-source"
          href={chapter.source_url}
          target="_blank"
          rel="noreferrer"
        >
          Fonte
        </a>
      </div>

      <nav className="chapter-reader-nav" aria-label="Navegação entre capítulos">
        {previousChapter ? (
          <a href={`/obra/${work.id}/capitulo/${previousChapter.id}`}>
            Capítulo anterior
          </a>
        ) : (
          <span />
        )}

        <span className="chapter-reader-position">
          {currentIndex >= 0 ? `${currentIndex + 1} de ${chapters.length}` : chapter.external_id}
        </span>

        {nextChapter ? (
          <a href={`/obra/${work.id}/capitulo/${nextChapter.id}`}>
            Próximo capítulo
          </a>
        ) : (
          <span />
        )}
      </nav>

      {pages.length > 0 ? (
        <section className="chapter-reader-pages" aria-label={`Páginas de ${chapter.title}`}>
          {pages.map((imageUrl, index) => (
            <img
              src={imageUrl}
              alt={`Página ${index + 1} de ${chapter.title}`}
              loading={index < 2 ? 'eager' : 'lazy'}
              decoding="async"
              referrerPolicy="no-referrer"
              key={imageUrl}
            />
          ))}
        </section>
      ) : (
        <section className="chapter-reader-empty">
          <h2>Não foi possível renderizar as páginas</h2>
          <p>{readerError}</p>
          <a href={chapter.source_url} target="_blank" rel="noreferrer">
            Abrir capítulo na fonte
          </a>
        </section>
      )}

      <nav className="chapter-reader-nav chapter-reader-nav-bottom" aria-label="Continuar leitura">
        {previousChapter ? (
          <a href={`/obra/${work.id}/capitulo/${previousChapter.id}`}>
            Capítulo anterior
          </a>
        ) : (
          <span />
        )}

        <a className="chapter-reader-work-link" href={`/obra/${work.id}`}>
          Voltar para a obra
        </a>

        {nextChapter ? (
          <a href={`/obra/${work.id}/capitulo/${nextChapter.id}`}>
            Próximo capítulo
          </a>
        ) : (
          <span />
        )}
      </nav>
    </article>
  );
}
