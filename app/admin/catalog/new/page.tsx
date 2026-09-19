import { inspectCatalogSource } from '../../../../lib/catalog';

type PageProps = {
  searchParams: Promise<{
    source?: string;
  }>;
};

export default async function NewCatalogWorkPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const sourceUrl = typeof params.source === 'string' ? params.source.trim() : '';

  let inspection: Awaited<ReturnType<typeof inspectCatalogSource>> | null = null;
  let inspectionFailed = false;

  if (sourceUrl) {
    try {
      inspection = await inspectCatalogSource(sourceUrl);
    } catch {
      inspectionFailed = true;
    }
  }

  return (
    <section className="admin-page">
      <div className="admin-shell admin-shell-narrow">
        <a className="admin-back-link" href="/admin">Voltar para Administração</a>

        <header className="admin-heading">
          <span className="admin-eyebrow">Catálogo</span>
          <h1>Cadastrar obra</h1>
          <p>Primeiro, analise a página da obra na fonte. Esta etapa não publica nem salva nada.</p>
        </header>

        <form className="admin-source-form" action="/admin/catalog/new" method="get">
          <label htmlFor="source">
            URL da obra
            <input
              id="source"
              name="source"
              type="url"
              required
              placeholder="https://mangastop.net/obra/..."
              defaultValue={sourceUrl}
            />
          </label>
          <button className="admin-primary-action" type="submit">Analisar fonte</button>
        </form>

        {inspectionFailed && (
          <div className="admin-feedback" role="status">
            Não foi possível analisar essa URL. Verifique se é uma página de obra válida da fonte configurada.
          </div>
        )}

        {inspection && (
          <section className="admin-inspection" aria-labelledby="inspection-title">
            <div className="admin-inspection-heading">
              <span className="admin-card-label">Resultado real da fonte</span>
              <h2 id="inspection-title">{inspection.source.title}</h2>
            </div>

            <dl className="admin-inspection-list">
              <div>
                <dt>Fonte</dt>
                <dd>MangásTop</dd>
              </div>
              <div>
                <dt>Capítulos encontrados</dt>
                <dd>{inspection.source.chapters.length}</dd>
              </div>
              <div>
                <dt>Metadados</dt>
                <dd>
                  {inspection.metadata.status === 'matched' && 'Correspondência automática encontrada'}
                  {inspection.metadata.status === 'review' && 'Revisão manual necessária'}
                  {inspection.metadata.status === 'not-found' && 'Correspondência não encontrada'}
                </dd>
              </div>
            </dl>

            {inspection.metadata.status === 'matched' && (
              <div className="admin-match-card">
                <span className="admin-card-label">AniList</span>
                <strong>{inspection.metadata.candidate.matchedTitle ?? inspection.metadata.candidate.titles[0]}</strong>
                <small>Similaridade: {Math.round(inspection.metadata.candidate.score * 100)}%</small>
              </div>
            )}

            {inspection.metadata.status === 'review' && (
              <div className="admin-feedback">
                Foram encontrados {inspection.metadata.candidates.length} candidatos. Nenhum será associado automaticamente até existir uma etapa de revisão.
              </div>
            )}
          </section>
        )}
      </div>
    </section>
  );
}
