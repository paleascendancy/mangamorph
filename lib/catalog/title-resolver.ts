import type { MatchCandidate, MatchDecision, MetadataCandidate } from './types';

export function normalizeTitle(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('en-US')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function bigrams(value: string): Set<string> {
  const compact = normalizeTitle(value).replace(/\s/g, '');
  const result = new Set<string>();

  if (compact.length < 2) {
    if (compact) result.add(compact);
    return result;
  }

  for (let index = 0; index < compact.length - 1; index += 1) {
    result.add(compact.slice(index, index + 2));
  }

  return result;
}

export function titleSimilarity(left: string, right: string): number {
  const a = normalizeTitle(left);
  const b = normalizeTitle(right);

  if (!a || !b) return 0;
  if (a === b) return 1;

  const aPairs = bigrams(a);
  const bPairs = bigrams(b);
  let intersection = 0;

  for (const pair of aPairs) {
    if (bPairs.has(pair)) intersection += 1;
  }

  return (2 * intersection) / (aPairs.size + bPairs.size);
}

export function rankMetadataCandidates(sourceTitle: string, candidates: MetadataCandidate[]): MatchCandidate[] {
  return candidates
    .map((candidate) => {
      let bestScore = 0;
      let matchedTitle: string | null = null;

      for (const title of candidate.titles) {
        const score = titleSimilarity(sourceTitle, title);
        if (score > bestScore) {
          bestScore = score;
          matchedTitle = title;
        }
      }

      return { ...candidate, score: bestScore, matchedTitle };
    })
    .sort((a, b) => b.score - a.score);
}

export function decideMetadataMatch(sourceTitle: string, candidates: MetadataCandidate[]): MatchDecision {
  const ranked = rankMetadataCandidates(sourceTitle, candidates);
  const first = ranked[0];
  const second = ranked[1];

  if (!first) return { status: 'not-found', candidates: [] };

  // Correspondência automática somente quando o título é praticamente idêntico
  // e não existe outro candidato próximo. Casos ambíguos ficam para revisão.
  const safelyMatched = first.score >= 0.96 && (!second || first.score - second.score >= 0.08);

  if (safelyMatched) return { status: 'matched', candidate: first };
  return { status: 'review', candidates: ranked.slice(0, 5) };
}
