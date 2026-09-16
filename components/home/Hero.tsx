export function Hero() {
  return (
    <section className="home-hero" aria-label="Destaque">
      <div className="hero-ambient" aria-hidden="true" />

      <div className="hero-content">
        <div className="hero-copy">
          <span className="hero-eyebrow">MangaMorph</span>
          <h1 className="hero-title">Encontre sua próxima obra.</h1>
          <p className="hero-description">
            Descubra mangás, manhwas e manhuas em uma experiência feita para explorar novas histórias.
          </p>
        </div>

        <div className="hero-character" aria-hidden="true">
          <div className="hero-character-frame" />
        </div>
      </div>
    </section>
  );
}