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

  const match = url.pathname.match(/^\/obra\/(\d+)\/?$/);

  if (!match) {
    throw new Error('URL de obra do MangásTop inválida.');
  }

  return {
    source: 'mangastop',
    profileUrl: `https://mangastop.net/obra/${match[1]}`,
    externalWorkId: match[1],
  };
}
