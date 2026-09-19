export type SourceKind = 'mangastop';

export type ChapterSource = {
  source: SourceKind;
  profileUrl: string;
  externalWorkId: string;
};

export type SourceWorkSnapshot = {
  source: SourceKind;
  profileUrl: string;
  externalWorkId: string;
  title: string;
  chapters: SourceChapter[];
};

export type SourceChapter = {
  externalId: string;
  title: string;
  url: string;
};

export type MetadataProvider = 'anilist' | 'myanimelist' | 'mangaupdates' | 'kitsu' | 'novelupdates';

export type MetadataCandidate = {
  provider: MetadataProvider;
  externalId: string;
  titles: string[];
  description: string | null;
  coverUrl: string | null;
  bannerUrl: string | null;
  countryOfOrigin: string | null;
  status: string | null;
  genres: string[];
  linkedIds: Partial<Record<MetadataProvider, string>>;
};

export type MatchCandidate = MetadataCandidate & {
  score: number;
  matchedTitle: string | null;
};

export type MatchDecision =
  | { status: 'matched'; candidate: MatchCandidate }
  | { status: 'review'; candidates: MatchCandidate[] }
  | { status: 'not-found'; candidates: [] };
