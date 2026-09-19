'use client';

import { useEffect, useState } from 'react';

type Theme = 'dark' | 'light' | 'blue';

export function SiteHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    const savedTheme = window.localStorage.getItem('mangamorph-theme') as Theme | null;
    if (savedTheme === 'dark' || savedTheme === 'light' || savedTheme === 'blue') {
      setTheme(savedTheme);
      document.documentElement.dataset.theme = savedTheme;
    }
  }, []);

  useEffect(() => {
    document.body.classList.toggle('panel-open', isMenuOpen || isProfileOpen);
    return () => document.body.classList.remove('panel-open');
  }, [isMenuOpen, isProfileOpen]);

  function closePanels() {
    setIsMenuOpen(false);
    setIsProfileOpen(false);
    setIsThemeOpen(false);
  }

  function openMenu() {
    setIsProfileOpen(false);
    setIsMenuOpen(true);
  }

  function openProfile() {
    setIsMenuOpen(false);
    setIsProfileOpen(true);
  }

  function selectTheme(nextTheme: Theme) {
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem('mangamorph-theme', nextTheme);
  }

  const themeLabel = theme === 'dark' ? 'Escuro' : theme === 'light' ? 'Claro' : 'Azul';

  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <div className="header-brand-group">
            <button className="menu-button" type="button" aria-label="Abrir menu" aria-expanded={isMenuOpen} onClick={openMenu}>
              <span className="menu-lines" aria-hidden="true"><span className="menu-line" /><span className="menu-line" /><span className="menu-line" /></span>
            </button>
            <a className="brand" href="/" aria-label="MangaMorph — Início">Manga<span>Morph</span></a>
          </div>

          <div className="header-search">
            <label className="search">
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
              <input type="search" aria-label="Pesquisar" placeholder="Pesquisar" />
            </label>
          </div>

          <div className="header-actions">
            <button className="header-icon-button" type="button" aria-label="Notificações">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></svg>
            </button>
            <button className="profile-button" type="button" aria-label="Abrir perfil" aria-expanded={isProfileOpen} onClick={openProfile}>
              <span className="profile-placeholder"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.8-4 3.2-6 7-6s6.2 2 7 6" /></svg></span>
            </button>
          </div>
        </div>
      </header>

      <button className={`panel-overlay${isMenuOpen || isProfileOpen ? ' is-open' : ''}`} type="button" aria-label="Fechar painel" tabIndex={isMenuOpen || isProfileOpen ? 0 : -1} onClick={closePanels} />

      <aside className={`menu-panel${isMenuOpen ? ' is-open' : ''}`} aria-hidden={!isMenuOpen}>
        <div className="panel-topbar">
          <span className="panel-label">Menu</span>
          <button className="panel-close-button" type="button" aria-label="Fechar menu" onClick={closePanels}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg></button>
        </div>
        <nav className="menu-navigation" aria-label="Navegação principal">
          <a href="#mais-favoritadas" onClick={closePanels}>Mais favoritadas</a>
          <a href="#mais-lidos" onClick={closePanels}>Mais lidos</a>
          <a href="#obras-novas" onClick={closePanels}>Obras novas</a>
        </nav>
        <div className="menu-spacer" />
        <a className="discord-button" href="https://discord.gg/PHW9eE5PJ6" target="_blank" rel="noreferrer">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.2 8.5c2.5-1.2 5.1-1.2 7.6 0M9 15c2 1.2 4 1.2 6 0M8.7 13h.01M15.3 13h.01" /><path d="M6.5 6.8C8.2 5.5 10 5 12 5s3.8.5 5.5 1.8c1.2 2.1 1.8 4.5 1.8 7-1.5 1.6-3.1 2.7-4.8 3.2l-1-1.4M17.5 6.8c.8-.2 1.5-.2 2.2-.1 1.3 2.7 1.8 5.5 1.3 8.4-1.2 1.1-2.5 1.8-3.9 2.2M6.5 6.8c-.8-.2-1.5-.2-2.2-.1C3 9.4 2.5 12.2 3 15.1c1.2 1.1 2.5 1.8 3.9 2.2M9.5 15.6l-1 1.4" /></svg>
          <span>Discord</span>
        </a>
      </aside>

      <aside className={`profile-panel${isProfileOpen ? ' is-open' : ''}`} aria-hidden={!isProfileOpen}>
        <div className="panel-topbar"><span className="panel-label">Perfil</span><button className="panel-close-button" type="button" aria-label="Fechar perfil" onClick={closePanels}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg></button></div>
        <div className="guest-profile"><div className="guest-avatar" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.8-4 3.2-6 7-6s6.2 2 7 6" /></svg></div><div><strong>Perfil convidado</strong><p>Entre para salvar suas obras</p></div></div>
        <div className="guest-auth-actions"><a href="/auth" className="profile-primary-action">Entrar</a><a href="/auth?mode=signup" className="profile-secondary-action">Cadastrar</a></div>
        <div className="profile-panel-divider" />
        <div className="profile-options">
          <button className="profile-option" type="button"><span className="profile-option-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1A8 8 0 0 0 15 6.2L14.7 4h-4L10.4 6.2a8 8 0 0 0-1.5.9l-2.4-1-2 3.4 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a8 8 0 0 0 1.5.9l.3 2.2h4l.3-2.2a8 8 0 0 0 1.5-.9l2.4 1 2-3.4-2-1.5c.1-.3.1-.7.1-1Z" /></svg></span><span>Configuração</span><svg className="profile-option-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg></button>
          <div className={`theme-option${isThemeOpen ? ' is-open' : ''}`}>
            <button className="profile-option" type="button" aria-expanded={isThemeOpen} onClick={() => setIsThemeOpen((open) => !open)}><span className="profile-option-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 9 9c0-1-.8-1.8-1.8-1.8h-1.5a2 2 0 0 1-2-2V6.8C15.7 4.7 14 3 12 3Z" /></svg></span><span className="profile-option-copy"><span>Tema</span><small>{themeLabel}</small></span><svg className="profile-option-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg></button>
            <div className="theme-choices">{([['dark', 'Escuro'], ['light', 'Claro'], ['blue', 'Azul']] as const).map(([value, label]) => <button key={value} type="button" className={`theme-choice${theme === value ? ' is-active' : ''}`} onClick={() => selectTheme(value)}><span>{label}</span><span className="theme-choice-indicator" aria-hidden="true" /></button>)}</div>
          </div>
        </div>
      </aside>
    </>
  );
}
