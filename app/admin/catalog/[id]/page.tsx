import { notFound } from 'next/navigation';
import { createClient } from '../../../../lib/supabase/server';
import {
  restoreAutomaticMetadata,
  syncCatalogNow,
  updateCatalogSyncMode,
  updateCatalogWork,
} from './actions';

type PageProps = {
  params: Promise<{ id: string }>;
};

function formatInterval(seconds: number) {
  if (seconds === 180) return '3 minutos';
  if (seconds === 300) return '5 minutos';
  if (seconds === 1800) return '30 minutos';
  if (seconds === 3600) return '1 hora';
  if (seconds === 604800) return '7 dias';
  return `${Math.round(seconds / 60)} minutos`;
}

function phaseLabel(phase: string) {
  const labels: Record<string, string> = {
    bootstrap: 'Iniciando',
    catchup_fast: 'Sincronização rápida',
    catchup_mid: 'Sincronização intermediária',
    catchup_slow: 'Sincronização final',
    steady: 'Sincronizado',
    paused: 'Pausado',
    error: 'Erro',
  };

  return labels[phase] ?? phase;
}

export default async function CatalogWorkAdminPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: work }, { data: source }, { data: links }, { data: chapters }] = await Promise.all([
    supabase
      .from('catalog_works')
      .select('*')
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('catalog_work_sources')
      .select('*')
      .eq('work_id', id)
      .maybeSingle(),
    supabase
      .from('catalog_metadata_links')
      .select('*')
      .eq('work_id', id)
      .order('is_primary', { ascending: false }),
    supabase
      .from('catalog_chapters')
      .select('id, external_id, chapter_number, title, source_url')
      .eq('work_id', id)
      .order('chapter_number', { ascending: false })
      .limit(20),
  ]);

  if (!work || !source) notFound();

  const progress = source.remote_chapter_count > 0
    ? Math.min(100, Math.round((source.local_chapter_count / source.remote_chapter_count) * 100))
    : 0;

  return (
    <section className="admin-page">
      <div className="admin-shell admin-shell-narrow">
        <a className="admin-back-link" href="/admin">Voltar para Administração</a>

        <header className="admin-heading">
          <span className="admin-eyebrow">Obra cadastrada</span>
          <h1>{work.title}</h1>
          <p>A sincronização acompanha a fonte e atualiza os capítulos automaticamente.</p>
        </header>

        <div className="admin-grid admin-grid-single">
          <article className="admin-card">
            <div>
              <span className="admin-card-label">Sincronização</span>
              <h2>{phaseLabel(source.sync_phase)}</h2>
            </div>

            <dl className="admin-inspection-list">
              <div><dt>Progresso</dt><dd>{progress}%</dd></div>
              <div><dt>Capítulos locais</dt><dd>{source.local_chapter_count}</dd></div>
              <div><dt>Capítulos na fonte</dt><dd>{source.remote_chapter_count}</dd></div>
              <div><dt>Intervalo atual</dt><dd>{formatInterval(source.current_interval_seconds)}</dd></div>
              <div><dt>Modo escolhido</dt><dd>{source.sync_mode}</dd></div>
            </dl>

            {source.last_error && (
              <div className="admin-feedback">
                <strong>Última falha de sincronização</strong>
                <span>{source.last_error}</span>
              </div>
            )}

            <div className="admin-sync-actions">
              <form action={updateCatalogSyncMode}>
                <input type="hidden" name="workId" value={work.id} />
                <label htmlFor="syncMode">Modo após alcançar a fonte</label>
                <select id="syncMode" name="syncMode" defaultValue={source.sync_mode}>
                  <option value="5m">A cada 5 minutos</option>
                  <option value="30m">A cada 30 minutos</option>
                  <option value="1h">A cada 1 hora</option>
                  <option value="7d">A cada 7 dias</option>
                </select>
                <button className="admin-secondary-action" type="submit">Atualizar modo</button>
              </form>

              <form action={syncCatalogNow}>
                <input type="hidden" name="workId" value={work.id} />
                <button className="admin-primary-action" type="submit">Sincronizar agora</button>
              </form>
            </div>
          </article>

          <article className="admin-card">
            <div>
              <span className="admin-card-label">Metadados</span>
              <h2>{work.metadata_provider ? 'Fonte conectada' : 'Aguardando correspondência'}</h2>
              <p>
                Título, sinopse, gêneros, autores, artistas e imagens podem ser atualizados pela fonte de metadados.
                Campos editados manualmente poderão ser preservados.
              </p>
            </div>

            <div className="admin-result-list">
              {(links ?? []).map((link) => (
                <a
                  className="admin-result-item"
                  href={link.profile_url}
                  target="_blank"
                  rel="noreferrer"
                  key={link.id}
                >
                  <span>
                    <strong>{link.provider}</strong>
                    <small>ID {link.external_id}</small>
                  </span>
                  <span className="admin-result-action">Abrir</span>
                </a>
              ))}
            </div>

            <form action={syncCatalogNow}>
              <input type="hidden" name="workId" value={work.id} />
              <button className="admin-secondary-action" type="submit">
                {work.metadata_provider === 'anilist' ? 'Atualizar com AniList' : 'Atualizar metadados'}
              </button>
            </form>
          </article>
        </div>

        <section className="admin-inspection">
          <div className="admin-inspection-heading">
            <span className="admin-card-label">Informações editáveis</span>
            <h2>Perfil da obra</h2>
          </div>

          <form action={updateCatalogWork} className="admin-metadata-form">
            <input type="hidden" name="workId" value={work.id} />

            <label>
              Título
              <input name="title" defaultValue={work.title} required />
            </label>

            <label>
              Sinopse em português
              <textarea name="synopsisPtBr" defaultValue={work.synopsis_pt_br ?? ''} rows={7} />
            </label>

            <label>
              Gêneros em português
              <input name="genresPtBr" defaultValue={(work.genres_pt_br ?? []).join(', ')} />
            </label>

            <label>
              Autores
              <input name="authors" defaultValue={(work.authors ?? []).join(', ')} />
            </label>

            <label>
              Artistas
              <input name="artists" defaultValue={(work.artists ?? []).join(', ')} />
            </label>

            <label>
              Status
              <input name="status" defaultValue={work.status ?? ''} />
            </label>

            <label>
              Capa
              <input name="coverUrl" type="url" defaultValue={work.cover_url ?? ''} />
            </label>

            <label>
              Banner
              <input name="bannerUrl" type="url" defaultValue={work.banner_url ?? ''} />
            </label>

            <p className="admin-result-note">
              Ao salvar manualmente, esses campos ficam protegidos contra sobrescrita automática.
            </p>

            <button className="admin-primary-action" type="submit">Salvar alterações</button>
          </form>

          {work.locked_fields?.length > 0 && (
            <form action={restoreAutomaticMetadata} className="admin-restore-form">
              <input type="hidden" name="workId" value={work.id} />
              <button className="admin-secondary-action" type="submit">
                Voltar metadados para atualização automática
              </button>
            </form>
          )}
        </section>

        <section className="admin-inspection">
          <div className="admin-inspection-heading">
            <span className="admin-card-label">Capítulos sincronizados</span>
            <h2>Últimos capítulos</h2>
          </div>

          {(chapters ?? []).length === 0 ? (
            <p className="admin-empty-copy">A sincronização ainda não adicionou capítulos.</p>
          ) : (
            <div className="admin-chapter-list">
              {(chapters ?? []).map((chapter) => (
                <a
                  className="admin-result-item"
                  href={chapter.source_url}
                  target="_blank"
                  rel="noreferrer"
                  key={chapter.id}
                >
                  <span>
                    <strong>{chapter.title}</strong>
                    <small>ID da fonte: {chapter.external_id}</small>
                  </span>
                  <span className="admin-result-action">Fonte</span>
                </a>
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
