'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

export type HighlightWork = {
  id: string;
  title: string;
  description?: string;
  coverUrl?: string;
  backdropUrl?: string;
  genres?: string[];
  status?: string;
  readingHref: string;
  detailsHref: string;
};

const ROTATION_TIME_MS = 8000;

function FeaturedIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m12 3 2.55 5.17 5.7.83-4.12 4.02.97 5.68L12 16l-5.1 2.7.97-5.68L3.75 9l5.7-.83L12 3Z" />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 13 13 20 4 11V4h7l9 9Z" />
      <circle cx="8.5" cy="8.5" r="1.2" />
    </svg>
  );
}

function StatusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 19V9M10 19V5M15 19v-7M20 19V3" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H11v17H7.5A3.5 3.5 0 0 0 4 22V5.5Z" />
      <path d="M20 5.5A3.5 3.5 0 0 0 16.5 2H13v17h3.5A3.5 3.5 0 0 1 20 22V5.5Z" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 10v6M12 7h.01" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m9 5 7 7-7 7" />
    </svg>
  );
}

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
  const metadataGenres = activeWork.genres?.slice(0, 3) ?? [];

  return (
    <section
      className="home-hero home-hero-v2"
      aria-label="Destaques"
      aria-roledescription="carrossel"
    >
      <article className="hero-slide hero-slide-v2" key={activeWork.id}>
        {activeWork.backdropUrl ? (
          <Image
            className="hero-backdrop"
            src={activeWork.backdropUrl}
            alt=""
            fill
            sizes="100vw"
            priority={activeIndex === 0}
            aria-hidden="true"
          />
        ) : null}

        {activeWork.coverUrl ? (
          <div className="hero-art" aria-hidden="true">
            <Image
              className="hero-art-image"
              src={activeWork.coverUrl}
              alt=""
              fill
              sizes="(max-width: 760px) 72vw, 48vw"
              priority={activeIndex === 0}
            />
          </div>
        ) : null}

        <div className="hero-content hero-content-v2">
          <div className="hero-copy hero-copy-v2">
            <span className="hero-featured-badge">
              <FeaturedIcon />
              Em destaque
            </span>

            <h1 className="hero-title hero-title-v2">{activeWork.title}</h1>

            {activeWork.description ? (
              <p className="hero-description hero-description-v2">
                {activeWork.description}
              </p>
            ) : null}

            {(metadataGenres.length > 0 || activeWork.status) ? (
              <div className="hero-metadata" aria-label="Informações da obra">
                {metadataGenres.map((genre) => (
                  <span className="hero-metadata-item" key={genre}>
                    <TagIcon />
                    {genre}
                  </span>
                ))}

                {activeWork.status ? (
                  <span className="hero-metadata-item">
                    <StatusIcon />
                    {activeWork.status}
                  </span>
                ) : null}
              </div>
            ) : null}

            <div className="hero-actions hero-actions-v2">
              <a className="hero-primary-action hero-primary-action-v2" href={activeWork.readingHref}>
                <BookIcon />
                <span>Ler agora</span>
                <ChevronIcon />
              </a>

              <a className="hero-secondary-action hero-secondary-action-v2" href={activeWork.detailsHref}>
                <InfoIcon />
                <span>Detalhes</span>
              </a>
            </div>

            {works.length > 1 ? (
              <div className="hero-pagination" aria-label="Selecionar destaque">
                {works.map((work, index) => (
                  <button
                    className={index === activeIndex ? 'is-active' : ''}
                    type="button"
                    aria-label={`Mostrar ${work.title}`}
                    aria-current={index === activeIndex ? 'true' : undefined}
                    onClick={() => setActiveIndex(index)}
                    key={work.id}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </article>
    </section>
  );
}
