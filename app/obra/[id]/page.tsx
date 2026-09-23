import Image from 'next/image';
import { notFound } from 'next/navigation';
import { loadPublicWork } from '../../../lib/catalog/public-catalog';
import { externalHtmlToPlainText } from '../../../lib/catalog/text';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function PublicWorkPage({ params }: PageProps) {
  const { id } = await params;
  const catalog = await loadPublicWork(id);

  if (!catalog) notFound();

  const { work, chapters, links } = catalog;

  return (
    <article className="work-profile-page">
      <div className="work-profile-shell">
        <section className="work-profile-hero">
          <div className="work-profile-cover">
            {work.cover_url ? (
              <Image
                src={work.cover_url}
                alt={`Capa de ${work.title}`}
                fill
                sizes="(max-width: 760px) 42vw, 260px"
              />
            ) : null}
          </div>

          <div className="work-profile-copy">
            <span className="work-profile-eyebrow">MangaMorph</span>
            <h1>{work.title}</h1>

            <div className="work-profile-tags">
              {(work.genres_pt_br ?? []).map((genre: string) => (
                <span key={genre}>{genre}</span>
              ))}
            </div>

            {work.status ? <p className="work-profile-status">{work.status}</p> : null}

            <div className="work-profile-links">
              {links.map((link) => (
                <a href={link.profile_url} target="_blank" rel="noreferrer" key={link.id}>
                  {link.provider}
                </a>
              ))}
            </div>
          </div>
        </section>

        {(work.synopsis_pt_br || work.synopsis_original) ? (
          <section className="work-profile-section">
            <h2>Sinopse</h2>
            <p>{externalHtmlToPlainText(work.synopsis_pt_br ?? work.synopsis_original)}</p>
          </section>
        ) : null}

        {((work.authors ?? []).length > 0 || (work.artists ?? []).length > 0) ? (
          <section className="work-profile-section work-profile-credits">
            {(work.authors ?? []).length > 0 ? (
              <div>
                <span>Autor</span>
                <p>{(work.authors ?? []).join(', ')}</p>
              </div>
            ) : null}

            {(work.artists ?? []).length > 0 ? (
              <div>
                <span>Artista</span>
                <p>{(work.artists ?? []).join(', ')}</p>
              </div>
            ) : null}
          </section>
        ) : null}

        <section className="work-profile-section">
          <div className="work-profile-section-heading">
            <h2>Capítulos</h2>
            <span>{chapters.length}</span>
          </div>

          {chapters.length === 0 ? (
            <p className="work-profile-muted">A sincronização ainda não adicionou capítulos.</p>
          ) : (
            <div className="work-profile-chapters">
              {chapters.map((chapter) => (
                <a href={`/obra/${work.id}/capitulo/${chapter.id}`} key={chapter.id}>
                  <span>{chapter.title}</span>
                  <small>Ler no MangaMorph</small>
                </a>
              ))}
            </div>
          )}
        </section>
      </div>
    </article>
  );
}
