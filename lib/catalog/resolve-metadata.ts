import { searchAniListMetadata } from './providers/anilist';
import { decideMetadataMatch } from './title-resolver';
import type { MatchDecision } from './types';

export async function resolveMetadata(sourceTitle: string): Promise<MatchDecision> {
  const candidates = await searchAniListMetadata(sourceTitle);
  return decideMetadataMatch(sourceTitle, candidates);
}
