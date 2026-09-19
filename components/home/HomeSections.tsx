// Estas listas permanecem vazias até existirem obras reais cadastradas.
const favoriteWorks: never[] = [];
const mostReadWorks: never[] = [];
const newWorks: never[] = [];

export function HomeSections() {
  return (
    <div className="home-sections">
      {favoriteWorks.length > 0 ? <section id="mais-favoritadas" aria-label="Mais favoritadas" /> : null}
      {mostReadWorks.length > 0 ? <section id="mais-lidos" aria-label="Mais lidos" /> : null}
      {newWorks.length > 0 ? <section id="obras-novas" aria-label="Obras novas" /> : null}
    </div>
  );
}
