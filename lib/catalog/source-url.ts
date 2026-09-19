import type { ChapterSource } from './types';

const SOURCE_HOSTS = new Set(['mangastop.net', 'www.mangastop.net']);

export function parseChapterSourceUrl(input: string): ChapterSource {
  let url: URL;

  try {
    url = new URL(input);
  } catch {
    throw new Error('URL de fonte inválida.');
  }

  if (url.protocol !== 'https:') {
    throw new Error('A fonte precisa usar HTTPS.');
  }

  if (!SOURCE_HOSTS.has(url.hostname.toLowerCase())) {
    throw new Error('Fonte ainda não suportada.');
  }

  const obraMatch = url.pathname.match(/^\/obra\/(\d+)(?:\/([a-z0-9%_-]+))?\/?$/i);

  if (obraMatch) {
    const pathname = obraMatch[2]
      ? `/obra/${obraMatch[1]}/${obraMatch[2]}`
      : `/obra/${obraMatch[1]}`;

    return {
      source: 'mangastop',
      profileUrl: `https://mangastop.net${pathname}`,
      externalWorkId: obraMatch[1],
    };
  }

  const mangaMatch = url.pathname.match(/^\/manga\/([a-z0-9%_-]+)\/?$/i);

  if (mangaMatch) {
    const slug = mangaMatch[1].toLowerCase();

    return {
      source: 'mangastop',
      profileUrl: `https://mangastop.net/manga/${slug}/`,
      externalWorkId: `manga:${slug}`,
    };
  }

  throw new Error('URL de obra do MangásTop inválida.');
}
