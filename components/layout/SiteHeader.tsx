'use client';

import { useEffect, useState } from 'react';

export function SiteHeader() {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light' | 'blue'>('dark');

  useEffect(() => {
    document.body.classList.toggle('profile-panel-open', isProfileOpen);
    return () => document.body.classList.remove('profile-panel-open');
  }, [isProfileOpen]);

  function closeProfile() {
    setIsProfileOpen(false);
    setIsThemeOpen(false);
  }

  function selectTheme(nextTheme: 'dark' | 'light' | 'blue') {
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  }

  const themeLabel = theme === 'dark' ? 'Escuro' : theme === 'light' ? 'Claro' : 'Azul';

  return (
    <>
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
            <button className="header-icon-button" type="button" aria-label="Notificações">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                <path d="M10 21h4" />
              </svg>
            </button>

            <button
              className="profile-button"
              type="button"
              aria-label="Abrir perfil"
              aria-expanded={isProfileOpen}
              onClick={() => setIsProfileOpen(true)}
            >
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

      <button
        className={`profile-overlay${isProfileOpen ? ' is-open' : ''}`}
        type="button"
        aria-label="Fechar perfil"
        tabIndex={isProfileOpen ? 0 : -1}
        onClick={closeProfile}
      />

      <aside className={`profile-panel${isProfileOpen ? ' is-open' : ''}`} aria-hidden={!isProfileOpen}>
        <div className="profile-panel-topbar">
          <span className="profile-panel-label">Perfil</span>
          <button className="profile-close-button" type="button" aria-label="Fechar perfil" onClick={closeProfile}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="guest-profile">
          <div className="guest-avatar" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="8" r="3.5" />
              <path d="M5 20c.8-4 3.2-6 7-6s6.2 2 7 6" />
            </svg>
          </div>
          <div>
            <strong>Perfil convidado</strong>
            <p>Entre para salvar suas obras</p>
          </div>
        </div>

        <div className="guest-auth-actions">
          <button type="button" className="profile-primary-action">Entrar</button>
          <button type="button" className="profile-secondary-action">Cadastrar</button>
        </div>

        <div className="profile-panel-divider" />

        <div className="profile-options">
          <button className="profile-option" type="button">
            <span className="profile-option-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3v-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.1a1.7 1.7 0 0 0 1.1 1.5 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.12.37.33.7.6 1 .3.28.68.42 1.1.4h.1v4h-.1a1.7 1.7 0 0 0-1.7.6Z" /></svg>
            </span>
            <span>Configuração</span>
            <svg className="profile-option-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
          </button>

          <div className={`theme-option${isThemeOpen ? ' is-open' : ''}`}>
            <button className="profile-option" type="button" aria-expanded={isThemeOpen} onClick={() => setIsThemeOpen((open) => !open)}>
              <span className="profile-option-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 9 9c0-1-.8-1.8-1.8-1.8h-1.5a2 2 0 0 1-2-2V6.8C15.7 4.7 14 3 12 3Z" /><circle cx="7.5" cy="11" r=".7" /><circle cx="10" cy="7.5" r=".7" /><circle cx="7.8" cy="15" r=".7" /></svg>
              </span>
              <span className="profile-option-copy"><span>Tema</span><small>{themeLabel}</small></span>
              <svg className="profile-option-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
            </button>

            <div className="theme-choices">
              {([['dark', 'Escuro'], ['light', 'Claro'], ['blue', 'Azul']] as const).map(([value, label]) => (
                <button key={value} type="button" className={`theme-choice${theme === value ? ' is-active' : ''}`} onClick={() => selectTheme(value)}>
                  <span>{label}</span>
                  <span className="theme-choice-indicator" aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
