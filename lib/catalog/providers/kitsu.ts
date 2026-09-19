import type { MetadataCandidate } from '../types';

const KITSU_ENDPOINT = 'https://kitsu.app/api/edge/manga';

type KitsuResource = {
  id: string;
  attributes: {
    slug?: string | null;
    canonicalTitle?: string | null;
    titles?: Record<string, string | null> | null;
    abbreviatedTitles?: string[] | null;
    synopsis?: string | null;
    description?: string | null;
    status?: string | null;
    posterImage?: {
      original?: string | null;
      large?: string | null;
    } | null;
    coverImage?: {
      original?: string | null;
      large?: string | null;
    } | null;
  };
  relationships?: {
    categories?: {
      data?: Array<{ id: string; type: string }>;
    };
  };
};

type KitsuIncluded = {
  id: string;
  type: string;
  attributes?: {
    title?: string | null;
    name?: string | null;
  };
};

type KitsuPayload = {
  data?: KitsuResource[];
  included?: KitsuIncluded[];
};

export async function searchKitsuMetadata(search: string): Promise<MetadataCandidate[]> {
  const title = search.trim();
  if (!title) return [];

  const url = new URL(KITSU_ENDPOINT);
  url.searchParams.set('filter[text]', title);
  url.searchParams.set('page[limit]', '10');
  url.searchParams.set('include', 'categories');

  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.api+json, application/json',
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new Error(`Kitsu respondeu com status ${response.status}.`);
  }

  const payload = (await response.json()) as KitsuPayload;
  const includedById = new Map(
    (payload.included ?? [])
      .filter((item) => item.type === 'categories')
      .map((item) => [item.id, item]),
  );

  return (payload.data ?? []).map((item) => {
    const titles = [
      item.attributes.canonicalTitle,
      ...Object.values(item.attributes.titles ?? {}),
      ...(item.attributes.abbreviatedTitles ?? []),
    ].filter((value): value is string => Boolean(value));

    const genres = (item.relationships?.categories?.data ?? [])
      .map((ref) => includedById.get(ref.id))
      .map((category) => category?.attributes?.title ?? category?.attributes?.name ?? null)
      .filter((value): value is string => Boolean(value));

    const slug = item.attributes.slug?.trim();

    return {
      provider: 'kitsu',
      externalId: item.id,
      titles: [...new Set(titles)],
      description: item.attributes.synopsis ?? item.attributes.description ?? null,
      coverUrl: item.attributes.posterImage?.original
        ?? item.attributes.posterImage?.large
        ?? null,
      bannerUrl: item.attributes.coverImage?.original
        ?? item.attributes.coverImage?.large
        ?? null,
      countryOfOrigin: null,
      status: item.attributes.status ?? null,
      genres: [...new Set(genres)],
      authors: [],
      artists: [],
      profileUrl: `https://kitsu.app/manga/${slug || item.id}`,
      linkedIds: {},
    };
  });
}
