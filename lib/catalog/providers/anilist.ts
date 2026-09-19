import type { MetadataCandidate } from '../types';

const ANILIST_ENDPOINT = 'https://graphql.anilist.co';

type AniListMedia = {
  id: number;
  idMal: number | null;
  title: { romaji: string | null; english: string | null; native: string | null };
  synonyms: string[];
  description: string | null;
  countryOfOrigin: string | null;
  status: string | null;
  genres: string[];
  coverImage: { extraLarge: string | null; large: string | null } | null;
  bannerImage: string | null;
};

const query = `
  query MangaMorphMetadata($search: String!) {
    Page(page: 1, perPage: 10) {
      media(search: $search, type: MANGA, isAdult: false) {
        id
        idMal
        title { romaji english native }
        synonyms
        description(asHtml: false)
        countryOfOrigin
        status
        genres
        coverImage { extraLarge large }
        bannerImage
      }
    }
  }
`;

export async function searchAniListMetadata(search: string): Promise<MetadataCandidate[]> {
  const title = search.trim();
  if (!title) return [];

  const response = await fetch(ANILIST_ENDPOINT, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: { search: title } }),
    next: { revalidate: 86400 },
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new Error(`AniList respondeu com status ${response.status}.`);
  }

  const payload = (await response.json()) as { data?: { Page?: { media?: AniListMedia[] } } };
  const media = payload.data?.Page?.media ?? [];

  return media.map((item) => ({
    provider: 'anilist',
    externalId: String(item.id),
    titles: [...new Set([item.title.english, item.title.romaji, item.title.native, ...item.synonyms].filter((value): value is string => Boolean(value)))],
    description: item.description,
    coverUrl: item.coverImage?.extraLarge ?? item.coverImage?.large ?? null,
    bannerUrl: item.bannerImage,
    countryOfOrigin: item.countryOfOrigin,
    status: item.status,
    genres: item.genres,
    linkedIds: item.idMal ? { myanimelist: String(item.idMal) } : {},
  }));
}
