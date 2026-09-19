import { searchAniListMetadata } from './providers/anilist';
import { searchKitsuMetadata } from './providers/kitsu';
import { searchMyAnimeListMetadata } from './providers/myanimelist';
import { decideMetadataMatch, normalizeTitle } from './title-resolver';
import type {
  MatchCandidate,
  MatchDecision,
  MetadataCandidate,
} from './types';

const STOP_WORDS = new Set([
  'a', 'as', 'o', 'os', 'de', 'da', 'das', 'do', 'dos', 'e', 'em',
  'no', 'na', 'nos', 'nas', 'um', 'uma', 'the', 'of', 'and', 'in',
  'to', 'for', 'with', 'from', 'manga', 'manhwa', 'manhua',
]);

function uniqueTitles(primary: string, alternatives: string[]): string[] {
  return [...new Set(
    [primary, ...alternatives]
      .map((value) => value.trim())
      .filter(Boolean),
  )].slice(0, 8);
}

function distinctiveTokens(values: string[]): string[] {
  const tokens = new Set<string>();

  for (const value of values) {
    for (const token of normalizeTitle(value).split(' ')) {
      if (
        token.length >= 8
        && !STOP_WORDS.has(token)
        && !/^\d+(?:\.\d+)?$/.test(token)
      ) {
        tokens.add(token);
      }
    }
  }

  return [...tokens]
    .sort((left, right) => right.length - left.length)
    .slice(0, 3);
}

async function collectProviderCandidates(
  queries: string[],
  search: (query: string) => Promise<MetadataCandidate[]>,
  maxQueries = 4,
): Promise<MetadataCandidate[]> {
  const merged = new Map<string, MetadataCandidate>();

  for (const query of queries.slice(0, maxQueries)) {
    try {
      const candidates = await search(query);

      for (const candidate of candidates) {
        merged.set(`${candidate.provider}:${candidate.externalId}`, candidate);
      }
    } catch {
      // Um provedor pode falhar sem impedir as próximas tentativas.
    }
  }

  return [...merged.values()];
}

function longestSharedDistinctiveToken(
  references: string[],
  candidate: MetadataCandidate,
): { token: string | null; length: number; matchedTitle: string | null } {
  const tokens = distinctiveTokens(references);
  let bestToken: string | null = null;
  let bestTitle: string | null = null;

  for (const title of candidate.titles) {
    const normalized = ` ${normalizeTitle(title)} `;

    for (const token of tokens) {
      if (normalized.includes(` ${token} `) && token.length > (bestToken?.length ?? 0)) {
        bestToken = token;
        bestTitle = title;
      }
    }
  }

  return {
    token: bestToken,
    length: bestToken?.length ?? 0,
    matchedTitle: bestTitle,
  };
}

function pickUniqueAnchorCandidate(
  references: string[],
  candidates: MetadataCandidate[],
): MetadataCandidate | null {
  const ranked = candidates
    .map((candidate) => ({
      candidate,
      anchor: longestSharedDistinctiveToken(references, candidate),
    }))
    .filter((entry) => entry.anchor.length >= 8)
    .sort((left, right) => right.anchor.length - left.anchor.length);

  const first = ranked[0];
  const second = ranked[1];

  if (!first) return null;

  if (
    second
    && second.anchor.length === first.anchor.length
    && second.anchor.token === first.anchor.token
  ) {
    return null;
  }

  return first.candidate;
}

async function findAniListByMalId(
  malCandidate: MetadataCandidate,
): Promise<MatchCandidate | null> {
  const malId = malCandidate.externalId;
  const aniListCandidates = await collectProviderCandidates(
    malCandidate.titles,
    searchAniListMetadata,
    3,
  );

  const linked = aniListCandidates.find(
    (candidate) => candidate.linkedIds.myanimelist === malId,
  );

  if (!linked) return null;

  return {
    ...linked,
    score: 1,
    matchedTitle: malCandidate.titles[0] ?? linked.titles[0] ?? null,
  };
}

export async function resolveMetadata(
  sourceTitle: string,
  alternativeTitles: string[] = [],
): Promise<MatchDecision> {
  const queries = uniqueTitles(sourceTitle, alternativeTitles);

  const aniListCandidates = await collectProviderCandidates(
    queries,
    searchAniListMetadata,
  );
  const aniListDecision = decideMetadataMatch(queries, aniListCandidates);

  if (aniListDecision.status === 'matched') {
    return aniListDecision;
  }

  const kitsuCandidates = await collectProviderCandidates(
    queries,
    searchKitsuMetadata,
  );
  const strictCombined = [...aniListCandidates, ...kitsuCandidates];
  const strictDecision = decideMetadataMatch(queries, strictCombined);

  if (strictDecision.status === 'matched') {
    return strictDecision;
  }

  // Fallback multilíngue: procura no catálogo do MyAnimeList/Jikan por
  // palavras distintivas do título. Só seguimos automaticamente quando
  // existe um candidato único e o AniList confirma o mesmo MAL ID.
  const fallbackQueries = [
    sourceTitle,
    ...distinctiveTokens([sourceTitle]),
  ];

  const malCandidates = await collectProviderCandidates(
    fallbackQueries,
    searchMyAnimeListMetadata,
    3,
  );

  const malAnchor = pickUniqueAnchorCandidate([sourceTitle], malCandidates);

  if (malAnchor) {
    try {
      const aniListByMalId = await findAniListByMalId(malAnchor);

      if (aniListByMalId) {
        return {
          status: 'matched',
          candidate: aniListByMalId,
        };
      }
    } catch {
      // Se o cruzamento falhar, o candidato continua disponível para revisão.
    }
  }

  const reviewCandidates = [
    ...strictCombined,
    ...malCandidates,
  ];

  if (reviewCandidates.length === 0) {
    return { status: 'not-found', candidates: [] };
  }

  return decideMetadataMatch(queries, reviewCandidates);
}
