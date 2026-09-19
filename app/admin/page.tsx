import Image from 'next/image';
import { createClient } from '../../lib/supabase/server';

export default async function AdminPage() {
  const supabase = await createClient();

  const [{ data: works }, { data: sources }] = await Promise.all([
    supabase
      .from('catalog_works')
      .select('id,title,is_published,metadata_provider,cover_url,created_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('catalog_work_sources')
      .select('work_id,local_chapter_count,remote_chapter_count,sync_phase'),
  ]);

  const sourceByWork = new Map(
    (sources ?? []).map((source) => [source.work_id, source]),
  );

  const catalogWorks = (works ?? []).map((work) => ({
    ...work,
    source: sourceByWork.get(work.id) ?? null,
  }));

  return (
    <section className="admin-page">
      <div className="admin-shell">
        <header className="admin-heading">
          <span className="admin-eyebrow">Painel protegido</span>
          <h1>Administração</h1>
          <p>Sessão administrativa ativa.</p>
        </header>

        <div className="admin-grid">
          <article className="admin-card">
            <div>
              <span className="admin-card-label">Catálogo</span>
              <h2>Cadastrar obra</h2>
              <p>
                Analise a fonte e os metadados antes de publicar a obra no MangaMorph.
              </p>
            </div>
            <a className="admin-primary-action" href="/admin/catalog/new">
              Iniciar cadastro
            </a>
          </article>

          <article className="admin-card admin-card-muted">
            <div>
              <span className="admin-card-label">Obras</span>
              <h2>
                {catalogWorks.length === 0
                  ? 'Nenhuma obra cadastrada'
                  : `${catalogWorks.length} ${catalogWorks.length === 1 ? 'obra cadastrada' : 'obras cadastradas'}`}
              </h2>
              <p>
                {catalogWorks.length === 0
                  ? 'O catálogo continuará vazio até você adicionar a primeira obra.'
                  : 'Acompanhe publicação, metadados e sincronização das obras cadastradas.'}
              </p>
            </div>
          </article>
        </div>

        {catalogWorks.length > 0 && (
          <section className="admin-catalog-list" aria-labelledby="admin-catalog-title">
            <div className="admin-inspection-heading">
              <span className="admin-card-label">Catálogo atual</span>
              <h2 id="admin-catalog-title">Obras cadastradas</h2>
            </div>

            <div className="admin-work-list">
              {catalogWorks.map((work) => (
                <a
                  className="admin-work-row"
                  href={`/admin/catalog/${work.id}`}
                  key={work.id}
                >
                  <div className="admin-work-cover">
                    {work.cover_url ? (
                      <Image
                        src={work.cover_url}
                        alt=""
                        fill
                        sizes="56px"
                      />
                    ) : null}
                  </div>

                  <span className="admin-work-copy">
                    <strong>{work.title}</strong>
                    <small>
                      {work.is_published ? 'Publicado' : 'Rascunho'}
                      {' · '}
                      {work.metadata_provider ?? 'sem metadados'}
                    </small>
                  </span>

                  <span className="admin-work-stats">
                    <strong>{work.source?.local_chapter_count ?? 0}</strong>
                    <small>
                      de {work.source?.remote_chapter_count ?? 0} capítulos
                    </small>
                  </span>
                </a>
              ))}
            </div>
          </section>
        )}
      </div>
    </section>
  );
}
