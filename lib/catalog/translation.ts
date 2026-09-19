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

const STATUS_PT_BR: Record<string, string> = {
  FINISHED: 'Finalizado',
  RELEASING: 'Em publicação',
  NOT_YET_RELEASED: 'Ainda não lançado',
  CANCELLED: 'Cancelado',
  HIATUS: 'Em hiato',
  Finished: 'Finalizado',
  Ongoing: 'Em publicação',
  Publishing: 'Em publicação',
  Hiatus: 'Em hiato',
  Discontinued: 'Descontinuado',
  Cancelled: 'Cancelado',
};

export function translateGenresPtBr(genres: string[]): string[] {
  return genres.map((genre) => GENRE_PT_BR[genre] ?? genre);
}

export function translateStatusPtBr(status: string | null): string | null {
  if (!status) return null;
  return STATUS_PT_BR[status] ?? status;
}
