import { searchAniListMetadata } from './providers/anilist';
import { searchKitsuMetadata } from './providers/kitsu';
import { decideMetadataMatch } from './title-resolver';
import type { MatchDecision, MetadataCandidate } from './types';

function uniqueTitles(primary: string, alternatives: string[]): string[] {
  return [...new Set(
    [primary, ...alternatives]
      .map((value) => value.trim())
      .filter(Boolean),
  )].slice(0, 6);
}

async function collectProviderCandidates(
  queries: string[],
  search: (query: string) => Promise<MetadataCandidate[]>,
): Promise<MetadataCandidate[]> {
  const merged = new Map<string, MetadataCandidate>();

  for (const query of queries.slice(0, 4)) {
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
  const combined = [...aniListCandidates, ...kitsuCandidates];

  if (combined.length === 0) {
    return { status: 'not-found', candidates: [] };
  }

  return decideMetadataMatch(queries, combined);
}
