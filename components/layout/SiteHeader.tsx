export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="header-inner">
        <div className="header-brand-group">
          <button className="menu-button" type="button" aria-label="Abrir menu" aria-expanded="false">
            <span className="menu-lines" aria-hidden="true">
              <span className="menu-line" />
              <span className="menu-line" />
              <span className="menu-line" />
            </span>
          </button>

          <a className="brand" href="/" aria-label="MangaMorph — Início">
            Manga<span>Morph</span>
          </a>
        </div>

        <div className="header-search">
          <label className="search">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-4-4" />
            </svg>
            <input type="search" aria-label="Pesquisar" placeholder="Pesquisar" />
          </label>
        </div>

        <div className="header-actions">
          <button className="header-icon-button notification" type="button" aria-label="Notificações">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
              <path d="M10 21h4" />
            </svg>
            <span className="notification-dot" aria-hidden="true" />
          </button>

          <button className="profile-button" type="button" aria-label="Perfil">
            <span className="profile-placeholder">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
                <circle cx="12" cy="8" r="3.5" />
                <path d="M5 20c.8-4 3.2-6 7-6s6.2 2 7 6" />
              </svg>
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}