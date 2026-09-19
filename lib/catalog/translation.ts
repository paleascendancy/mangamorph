const GENRE_PT_BR: Record<string, string> = {
  Action: 'Ação',
  Adventure: 'Aventura',
  Comedy: 'Comédia',
  Drama: 'Drama',
  Fantasy: 'Fantasia',
  Horror: 'Terror',
  Mystery: 'Mistério',
  Psychological: 'Psicológico',
  Romance: 'Romance',
  'Sci-Fi': 'Ficção científica',
  'Slice of Life': 'Cotidiano',
  Sports: 'Esportes',
  Supernatural: 'Sobrenatural',
  Thriller: 'Suspense',
  Mecha: 'Mecha',
  Music: 'Música',
};

export function translateGenresPtBr(genres: string[]): string[] {
  return genres.map((genre) => GENRE_PT_BR[genre] ?? genre);
}
