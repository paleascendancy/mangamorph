'use client';

import { useEffect, useState } from 'react';

type HighlightWork = {
  id: string;
  title: string;
  description?: string;
  coverUrl?: string;
  backdropUrl?: string;
};

const ROTATION_TIME_MS = 8000;

// A lista começa vazia de propósito.
// Obras só entram aqui quando existirem dados reais cadastrados no MangaMorph.
const highlightWorks: HighlightWork[] = [];

export function Hero() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (highlightWorks.length <= 1) return;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % highlightWorks.length);
    }, ROTATION_TIME_MS);

    return () => window.clearInterval(timer);
  }, []);

  if (highlightWorks.length === 0) {
    return <section className="home-hero home-hero-empty" aria-label="Destaques" />;
  }

  const activeWork = highlightWorks[activeIndex];

  return (
    <section className="home-hero" aria-label="Destaques">
      <article className="hero-slide" key={activeWork.id}>
        {activeWork.backdropUrl ? (
          <img className="hero-backdrop" src={activeWork.backdropUrl} alt="" aria-hidden="true" />
        ) : null}

        <div className="hero-content">
          <div className="hero-copy">
            <span className="hero-eyebrow">Em destaque</span>
            <h1 className="hero-title">{activeWork.title}</h1>
            {activeWork.description ? <p className="hero-description">{activeWork.description}</p> : null}

            <div className="hero-actions">
              <button className="hero-primary-action" type="button">Ler agora</button>
              <button className="hero-secondary-action" type="button">Detalhes</button>
            </div>
          </div>

          {activeWork.coverUrl ? (
            <div className="hero-cover-wrap">
              <img className="hero-cover" src={activeWork.coverUrl} alt="" />
            </div>
          ) : null}
        </div>
      </article>
    </section>
  );
}
