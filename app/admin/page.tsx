export default function AdminPage() {
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
              <p>O cadastro começa pela análise da URL da fonte. Nenhuma obra é criada antes da sua confirmação.</p>
            </div>
            <a className="admin-primary-action" href="/admin/catalog/new">
              Iniciar cadastro
            </a>
          </article>

          <article className="admin-card admin-card-muted">
            <div>
              <span className="admin-card-label">Obras</span>
              <h2>Nenhuma obra cadastrada</h2>
              <p>O catálogo continuará vazio até você adicionar a primeira obra.</p>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
