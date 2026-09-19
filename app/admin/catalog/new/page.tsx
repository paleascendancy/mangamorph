import { inspectCatalogSource } from '../../../../lib/catalog';
import { normalizeTitle } from '../../../../lib/catalog/title-resolver';
export const maxDuration = 30;

import {
  searchMangaStopWorks,
  type MangaStopSearchResult,
} from '../../../../lib/catalog/sources/mangastop-search';

type PageProps = {
  searchParams: Promise<{
    source?: string;
    title?: string;
    chapter?: string;
    titleHint?: string;
  }>;
};

export default async function NewCatalogWorkPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const sourceUrl = typeof params.source === 'string' ? params.source.trim() : '';
  const titleQuery = typeof params.title === 'string' ? params.title.trim() : '';
  const chapterQuery = typeof params.chapter === 'string' ? params.chapter.trim() : '';
  const titleHint = typeof params.titleHint === 'string' ? params.titleHint.trim() : '';

  let inspection: Awaited<ReturnType<typeof inspectCatalogSource>> | null = null;
  let inspectionError: string | null = null;
  let sourceMatches: MangaStopSearchResult[] = [];
  let sourceSearchFailed = false;

  if (titleQuery) {
    try {
      sourceMatches = await searchMangaStopWorks(titleQuery);

      const exactMatch = sourceMatches.find(
        (match) => normalizeTitle(match.title) === normalizeTitle(titleQuery),
      );

      if (!sourceUrl && exactMatch) {
        try {
          inspection = await inspectCatalogSource(exactMatch.url, exactMatch.title);
        } catch (error) {
          inspectionError = error instanceof Error
            ? error.message
            : 'Não foi possível analisar a obra encontrada.';
        }
      }
    } catch {
      sourceSearchFailed = true;
    }
  }

  if (sourceUrl) {
    try {
      inspection = await inspectCatalogSource(
        sourceUrl,
        titleHint || titleQuery || undefined,
      );
    } catch (error) {
      inspectionError = error instanceof Error
        ? error.message
        : 'Não foi possível analisar essa URL.';
    }
  }

  const normalizedChapterQuery = normalizeTitle(chapterQuery);
  const matchingChapters = inspection
    ? inspection.source.chapters.filter((chapter) => {
        if (!normalizedChapterQuery) return true;

        return normalizeTitle(chapter.title).includes(normalizedChapterQuery)
          || chapter.externalId.includes(chapterQuery);
      })
    : [];

  const visibleChapters = matchingChapters.slice(0, 20);

  return (
    <section className="admin-page">
      <div className="admin-shell admin-shell-narrow">
        <a className="admin-back-link" href="/admin">Voltar para Administração</a>

        <header className="admin-heading">
          <span className="admin-eyebrow">Catálogo</span>
          <h1>Cadastrar obra</h1>
          <p>Procure pelo título ou informe a URL da fonte. Esta etapa apenas analisa; nada é publicado ou salvo.</p>
        </header>

        <div className="admin-search-stack">
          <form className="admin-source-form" action="/admin/catalog/new" method="get">
            <label htmlFor="title">
              Procurar obra pelo título
              <input
                id="title"
                name="title"
                type="search"
                required
                maxLength={140}
                placeholder="Ex.: O Filho Mais Novo do Mestre Espadachim"
                defaultValue={titleQuery}
              />
            </label>
            <button className="admin-primary-action" type="submit">Procurar obra</button>
          </form>

          {sourceSearchFailed && (
            <div className="admin-feedback" role="status">
              Não foi possível consultar a busca da fonte agora. Você ainda pode analisar pela URL direta.
            </div>
          )}

          {titleQuery && !sourceSearchFailed && (
            <section className="admin-search-results" aria-labelledby="source-search-title">
              <div className="admin-inspection-heading">
                <span className="admin-card-label">Resultados por título</span>
                <h2 id="source-search-title">{titleQuery}</h2>
              </div>

              {sourceMatches.length === 0 ? (
                <p className="admin-empty-copy">Nenhuma obra correspondente foi encontrada na fonte.</p>
              ) : (
                <div className="admin-result-list">
                  {sourceMatches.map((match) => (
                    <a
                      className="admin-result-item"
                      href={`/admin/catalog/new?source=${encodeURIComponent(match.url)}&title=${encodeURIComponent(match.title)}&titleHint=${encodeURIComponent(match.title)}`}
                      key={match.url}
                    >
                      <span>
                        <strong>{match.title}</strong>
                        <small>Correspondência do título: {Math.round(match.score * 100)}%</small>
                      </span>
                      <span className="admin-result-action">Analisar</span>
                    </a>
                  ))}
                </div>
              )}
            </section>
          )}

          <div className="admin-form-divider"><span>ou</span></div>

          <form className="admin-source-form" action="/admin/catalog/new" method="get">
            {titleQuery && <input type="hidden" name="titleHint" value={titleQuery} />}
            <label htmlFor="source">
              URL da obra
              <input
                id="source"
                name="source"
                type="url"
                required
                placeholder="https://mangastop.net/..."
                defaultValue={sourceUrl}
              />
            </label>
            <button className="admin-primary-action" type="submit">Analisar fonte</button>
          </form>
        </div>

        {inspectionError && (
          <div className="admin-feedback" role="status">
            <strong>Não foi possível analisar a obra.</strong>
            <span>{inspectionError}</span>
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

            <div className="admin-chapter-search">
              <div>
                <span className="admin-card-label">Capítulos</span>
                <h3>Procurar capítulo por título ou número</h3>
              </div>

              <form action="/admin/catalog/new" method="get">
                <input type="hidden" name="source" value={sourceUrl} />
                {titleHint && <input type="hidden" name="titleHint" value={titleHint} />}
                <input
                  name="chapter"
                  type="search"
                  placeholder="Ex.: 208 ou nome do capítulo"
                  defaultValue={chapterQuery}
                  aria-label="Procurar capítulo"
                />
                <button className="admin-secondary-action" type="submit">Procurar</button>
              </form>

              {visibleChapters.length === 0 ? (
                <p className="admin-empty-copy">
                  {chapterQuery ? 'Nenhum capítulo corresponde a essa busca.' : 'Nenhum capítulo foi encontrado nessa página da fonte.'}
                </p>
              ) : (
                <div className="admin-chapter-list">
                  {visibleChapters.map((chapter) => (
                    <div className="admin-chapter-item" key={chapter.url}>
                      <span>
                        <strong>{chapter.title}</strong>
                        <small>ID da fonte: {chapter.externalId}</small>
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {matchingChapters.length > visibleChapters.length && (
                <p className="admin-result-note">
                  Mostrando 20 de {matchingChapters.length} capítulos encontrados.
                </p>
              )}
            </div>
          </section>
        )}
      </div>
    </section>
  );
}
