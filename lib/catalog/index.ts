import { fetchMangasTopWork } from './sources/mangastop';
import { resolveMetadata } from './resolve-metadata';
import type { MatchDecision, SourceWorkSnapshot } from './types';

export type CatalogInspection = {
  source: SourceWorkSnapshot;
  metadata: MatchDecision;
};

// Inspeciona e resolve uma obra, mas não publica nem persiste nada.
export async function inspectCatalogSource(
  profileUrl: string,
  titleHint?: string,
): Promise<CatalogInspection> {
  const source = await fetchMangasTopWork(profileUrl, titleHint);
  const metadata = await resolveMetadata(source.title);

  return { source, metadata };
}
