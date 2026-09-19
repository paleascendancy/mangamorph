import type { MetadataCandidate } from '../types';

const JIKAN_ENDPOINT = 'https://api.jikan.moe/v4/manga';

type JikanTitle = {
  type?: string | null;
  title?: string | null;
};

type JikanPerson = {
  mal_id?: number;
  name?: string | null;
  url?: string | null;
};

type JikanGenre = {
  mal_id?: number;
  name?: string | null;
};

type JikanManga = {
  mal_id: number;
  url?: string | null;
  title?: string | null;
  title_english?: string | null;
  title_japanese?: string | null;
  title_synonyms?: string[] | null;
  titles?: JikanTitle[] | null;
  synopsis?: string | null;
  background?: string | null;
  status?: string | null;
  type?: string | null;
  authors?: JikanPerson[] | null;
  genres?: JikanGenre[] | null;
  images?: {
    jpg?: {
      image_url?: string | null;
      large_image_url?: string | null;
    } | null;
    webp?: {
      image_url?: string | null;
      large_image_url?: string | null;
    } | null;
  } | null;
};

type JikanPayload = {
  data?: JikanManga[];
};

export async function searchMyAnimeListMetadata(search: string): Promise<MetadataCandidate[]> {
  const query = search.trim();
  if (!query) return [];

  const url = new URL(JIKAN_ENDPOINT);
  url.searchParams.set('q', query);
  url.searchParams.set('limit', '10');
  url.searchParams.set('sfw', 'true');

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'MangaMorph/2.0 (+https://mangamorph-alpha.vercel.app)',
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new Error(`MyAnimeList/Jikan respondeu com status ${response.status}.`);
  }

  const payload = (await response.json()) as JikanPayload;

  return (payload.data ?? []).map((item) => {
    const titles = [
      item.title,
      item.title_english,
      item.title_japanese,
      ...(item.title_synonyms ?? []),
      ...(item.titles ?? []).map((entry) => entry.title ?? null),
    ].filter((value): value is string => Boolean(value));

    const authors = (item.authors ?? [])
      .map((person) => person.name?.trim() ?? '')
      .filter(Boolean);

    const genres = (item.genres ?? [])
      .map((genre) => genre.name?.trim() ?? '')
      .filter(Boolean);

    const coverUrl = item.images?.webp?.large_image_url
      ?? item.images?.jpg?.large_image_url
      ?? item.images?.webp?.image_url
      ?? item.images?.jpg?.image_url
      ?? null;

    return {
      provider: 'myanimelist',
      externalId: String(item.mal_id),
      titles: [...new Set(titles)],
      description: item.synopsis ?? item.background ?? null,
      coverUrl,
      bannerUrl: null,
      countryOfOrigin: null,
      status: item.status ?? null,
      genres: [...new Set(genres)],
      authors: [...new Set(authors)],
      artists: [],
      profileUrl: item.url ?? `https://myanimelist.net/manga/${item.mal_id}`,
      linkedIds: {
        myanimelist: String(item.mal_id),
      },
    };
  });
}
