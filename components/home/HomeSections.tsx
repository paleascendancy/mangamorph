import Image from 'next/image';

export type HomeWork = {
  id: string;
  title: string;
  coverUrl: string;
  href: string;
};

type WorkSectionProps = {
  id: string;
  eyebrow: string;
  title: string;
  works: HomeWork[];
};

function WorkSection({ id, eyebrow, title, works }: WorkSectionProps) {
  if (works.length === 0) return null;

  return (
    <section className="work-section" id={id} aria-labelledby={`${id}-title`}>
      <div className="work-section-heading">
        <div>
          <span className="work-section-eyebrow">{eyebrow}</span>
          <h2 id={`${id}-title`} className="work-section-title">{title}</h2>
        </div>
      </div>

      <div className="work-grid">
        {works.map((work) => (
          <article className="work-card" key={work.id}>
            <a className="work-card-link" href={work.href} aria-label={work.title}>
              <div className="work-card-cover">
                <Image src={work.coverUrl} alt={`Capa de ${work.title}`} fill sizes="(max-width: 560px) 42vw, (max-width: 900px) 28vw, 210px" />
              </div>
              <h3 className="work-card-title">{work.title}</h3>
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}

// Sem dados de demonstração. Estas listas só recebem obras cadastradas de verdade.
const favoriteWorks: HomeWork[] = [];
const mostReadWorks: HomeWork[] = [];
const newWorks: HomeWork[] = [];

export function HomeSections() {
  return (
    <div className="home-sections">
      <WorkSection id="mais-favoritadas" eyebrow="Preferidas" title="Mais favoritadas" works={favoriteWorks} />
      <WorkSection id="mais-lidos" eyebrow="Em alta" title="Mais lidos" works={mostReadWorks} />
      <WorkSection id="obras-novas" eyebrow="Novidades" title="Obras novas" works={newWorks} />
    </div>
  );
}
