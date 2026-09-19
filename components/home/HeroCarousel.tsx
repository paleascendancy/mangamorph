'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

export type HighlightWork = {
  id: string;
  title: string;
  description?: string;
  coverUrl?: string;
  backdropUrl?: string;
};

const ROTATION_TIME_MS = 8000;

export function HeroCarousel({ works }: { works: HighlightWork[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setReduceMotion(media.matches);

    updatePreference();
    media.addEventListener('change', updatePreference);
    return () => media.removeEventListener('change', updatePreference);
  }, []);

  useEffect(() => {
    if (works.length <= 1 || reduceMotion) return;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % works.length);
    }, ROTATION_TIME_MS);

    return () => window.clearInterval(timer);
  }, [works.length, reduceMotion]);

  if (works.length === 0) return null;

  const activeWork = works[activeIndex];

  return (
    <section className="home-hero" aria-label="Destaques">
      <article className="hero-slide" key={activeWork.id}>
        {activeWork.backdropUrl ? (
          <Image className="hero-backdrop" src={activeWork.backdropUrl} alt="" fill sizes="100vw" aria-hidden="true" />
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
              <Image className="hero-cover" src={activeWork.coverUrl} alt={`Capa de ${activeWork.title}`} fill sizes="(max-width: 760px) 42vw, 320px" />
            </div>
          ) : null}
        </div>
      </article>
    </section>
  );
}
