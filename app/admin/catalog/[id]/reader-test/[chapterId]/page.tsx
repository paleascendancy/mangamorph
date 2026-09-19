import { notFound } from 'next/navigation';
import { getChapterReaderSnapshot } from '../../../../../../lib/catalog/chapter-reader';
import { createClient } from '../../../../../../lib/supabase/server';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ id: string; chapterId: string }>;
};

export default async function ReaderDiagnosticPage({ params }: PageProps) {
  const { id, chapterId } = await params;
  const supabase = await createClient();

  const [{ data: work }, { data: source }, { data: chapter }] = await Promise.all([
    supabase
      .from('catalog_works')
      .select('id,title')
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('catalog_work_sources')
      .select('profile_url,external_work_id')
      .eq('work_id', id)
      .maybeSingle(),
    supabase
      .from('catalog_chapters')
      .select('id,work_id,title,external_id,source_url')
      .eq('id', chapterId)
      .eq('work_id', id)
      .maybeSingle(),
  ]);

  if (!work || !chapter) notFound();

  let imageCount = 0;
  let hosts: string[] = [];
  let error: string | null = null;

  try {
    const snapshot = await getChapterReaderSnapshot(
      chapter.source_url,
      source?.profile_url ?? null,
      chapter.external_id,
    );
    imageCount = snapshot.images.length;
    hosts = [...new Set(
      snapshot.images
        .map((url) => {
          try {
            return new URL(url).hostname;
          } catch {
            return null;
          }
        })
        .filter((value): value is string => Boolean(value)),
    )].slice(0, 8);
  } catch (readerError) {
    error = readerError instanceof Error
      ? readerError.message
      : 'Falha desconhecida ao testar o leitor.';
  }

  return (
    <section className="admin-page">
      <div className="admin-shell admin-shell-narrow">
        <a className="admin-back-link" href={`/admin/catalog/${work.id}`}>
          Voltar para a obra
        </a>

        <header className="admin-heading">
          <span className="admin-eyebrow">Diagnóstico do leitor</span>
          <h1>{chapter.title}</h1>
          <p>{work.title}</p>
        </header>

        <article className="admin-card">
          <dl className="admin-inspection-list">
            <div>
              <dt>Capítulo</dt>
              <dd>{chapter.external_id}</dd>
            </div>
            <div>
              <dt>Páginas encontradas</dt>
              <dd>{imageCount}</dd>
            </div>
            <div>
              <dt>Hosts de imagem</dt>
              <dd>{hosts.length > 0 ? hosts.join(', ') : 'Nenhum'}</dd>
            </div>
          </dl>

          {error ? (
            <div className="admin-feedback" role="status">
              <strong>O leitor ainda não conseguiu renderizar este capítulo.</strong>
              <span>{error}</span>
            </div>
          ) : null}

          <div className="admin-sync-actions">
            <a
              className="admin-primary-action"
              href={`/obra/${work.id}/capitulo/${chapter.id}`}
            >
              Abrir leitor público
            </a>

            <a
              className="admin-secondary-action"
              href={chapter.source_url}
              target="_blank"
              rel="noreferrer"
            >
              Abrir fonte
            </a>
          </div>
        </article>
      </div>
    </section>
  );
}
