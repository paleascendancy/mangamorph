import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

const API_TIMEOUT_MS = 10_000;
const BROWSER_TIMEOUT_MS = 15_000;
const MAX_READER_IMAGES = 220;

export type MangaStopChapterSnapshot = {
  title: string | null;
  images: string[];
  finalUrl: string;
};

function validateChapterUrl(input: string): URL {
  const url = new URL(input);

  if (url.protocol !== 'https:') {
    throw new Error('A URL do capítulo precisa usar HTTPS.');
  }

  if (!['mangastop.net', 'www.mangastop.net'].includes(url.hostname.toLowerCase())) {
    throw new Error('A fonte do capítulo não é permitida.');
  }

  return url;
}

function isMangaStopHostname(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === 'mangastop.net' || host.endsWith('.mangastop.net');
}

function isPrivateHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');

  if (
    host === 'localhost'
    || host.endsWith('.localhost')
    || host.endsWith('.local')
    || host.endsWith('.internal')
    || host === '::1'
    || (
      host.includes(':')
      && (
        host.startsWith('fc')
        || host.startsWith('fd')
        || host.startsWith('fe80:')
      )
    )
  ) {
    return true;
  }

  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);

  if (!ipv4) return false;

  const octets = ipv4.slice(1).map(Number);
  if (octets.some((value) => value > 255)) return true;

  const [a, b] = octets;

  return (
    a === 10
    || a === 127
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 198 && (b === 18 || b === 19))
    || a === 0
  );
}

function isSafeBrowserRequest(value: string): boolean {
  try {
    const url = new URL(value);

    return (
      ['https:', 'http:'].includes(url.protocol)
      && !isPrivateHostname(url.hostname)
    );
  } catch {
    return false;
  }
}

function isUsableImageUrl(value: string): boolean {
  try {
    const url = new URL(value);

    if (url.protocol !== 'https:' || isPrivateHostname(url.hostname)) return false;

    const path = url.pathname.toLowerCase();

    if (
      path.endsWith('.svg')
      || path.includes('logo')
      || path.includes('avatar')
      || path.includes('favicon')
      || path.includes('icon')
      || path.includes('emoji')
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

type MangaStopApiWork = {
  capitulos?: Array<{
    id?: number | string;
    numero?: number | string;
  }>;
};

type MangaStopApiReader = {
  imagens?: Array<{
    url?: string;
  }>;
};

function normalizeChapterNumber(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(',', '.')
    .replace(/^0+(?=\d)/, '')
    .trim();
}

function externalWorkIdFromProfile(profileUrl: string): string | null {
  try {
    const url = validateChapterUrl(profileUrl);
    return url.pathname.match(/^\/obra\/(\d+)(?:\/|$)/i)?.[1] ?? null;
  } catch {
    return null;
  }
}

async function fetchMangaStopJson<T>(path: string): Promise<T> {
  const url = new URL(path, 'https://mangastop.net');

  if (!isMangaStopHostname(url.hostname) || url.protocol !== 'https:') {
    throw new Error('Endpoint da fonte não permitido.');
  }

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'MangaMorph/2.0 (+https://mangamorph-alpha.vercel.app)',
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(API_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`MangásTop API respondeu com status ${response.status}.`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    throw new Error('MangásTop API não retornou JSON.');
  }

  return response.json() as Promise<T>;
}

async function fetchMangaStopChapterFromApi(
  chapterUrl: string,
  profileUrl: string,
  externalChapterId: string,
): Promise<MangaStopChapterSnapshot | null> {
  const sourceUrl = validateChapterUrl(chapterUrl);
  const externalWorkId = externalWorkIdFromProfile(profileUrl);

  if (!externalWorkId) return null;

  const work = await fetchMangaStopJson<MangaStopApiWork>(
    `/wp-json/mangastop/v1/obra/${encodeURIComponent(externalWorkId)}`,
  );

  const targetNumber = normalizeChapterNumber(externalChapterId);
  const chapter = work.capitulos?.find((item) =>
    normalizeChapterNumber(item.numero) === targetNumber,
  );

  if (!chapter?.id) {
    console.warn('[MangaMorph reader] chapter id not found in MangaStop API', {
      externalWorkId,
      externalChapterId,
    });
    return null;
  }

  const reader = await fetchMangaStopJson<MangaStopApiReader>(
    `/wp-json/mangastop/v1/leitor/${encodeURIComponent(String(chapter.id))}`,
  );

  const images = [...new Set(
    (reader.imagens ?? [])
      .map((image) => {
        try {
          return new URL(image.url ?? '', 'https://mangastop.net').href;
        } catch {
          return null;
        }
      })
      .filter((url): url is string => Boolean(url) && isUsableImageUrl(url)),
  )].slice(0, MAX_READER_IMAGES);

  console.info('[MangaMorph reader] MangaStop API resolved chapter', {
    externalWorkId,
    externalChapterId,
    sourceChapterId: String(chapter.id),
    imageCount: images.length,
  });

  if (images.length === 0) return null;

  return {
    title: `Capítulo ${externalChapterId}`,
    images,
    finalUrl: sourceUrl.href,
  };
}

async function scrapeMangaStopChapterWithBrowser(
  chapterUrl: string,
): Promise<MangaStopChapterSnapshot> {
  const sourceUrl = validateChapterUrl(chapterUrl);

  chromium.setGraphicsMode = false;

  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: 'shell',
    defaultViewport: {
      width: 1100,
      height: 900,
      deviceScaleFactor: 1,
      isMobile: false,
      hasTouch: false,
      isLandscape: false,
    },
  });

  try {
    const page = await browser.newPage();
    const requestedImageUrls: string[] = [];

    await page.setUserAgent(
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
    );

    await page.setRequestInterception(true);

    page.on('request', (request) => {
      const resourceType = request.resourceType();
      const requestUrl = request.url();

      if (!isSafeBrowserRequest(requestUrl)) {
        request.abort().catch(() => undefined);
        return;
      }

      try {
        const target = new URL(requestUrl);
        const sourceBoundResource = ['document', 'xhr', 'fetch'].includes(resourceType);

        // O MangásTop depende de scripts hospedados em CDN para montar partes
        // da página no cliente. Scripts HTTPS públicos podem carregar, mas
        // navegação e chamadas de dados continuam presas ao domínio da fonte.
        if (sourceBoundResource && !isMangaStopHostname(target.hostname)) {
          request.abort().catch(() => undefined);
          return;
        }
      } catch {
        request.abort().catch(() => undefined);
        return;
      }

      if (resourceType === 'image') {
        requestedImageUrls.push(requestUrl);
        request.abort().catch(() => undefined);
        return;
      }

      if (['media', 'font'].includes(resourceType)) {
        request.abort().catch(() => undefined);
        return;
      }

      request.continue().catch(() => undefined);
    });

    await page.goto(sourceUrl.href, {
      waitUntil: 'domcontentloaded',
      timeout: BROWSER_TIMEOUT_MS,
    });

    await page.waitForFunction(
      () => document.querySelectorAll('img').length > 0,
      { timeout: 7000 },
    ).catch(() => undefined);

    await page.evaluate(async () => {
      let previousHeight = 0;

      for (let index = 0; index < 24; index += 1) {
        const height = document.body.scrollHeight;

        window.scrollTo({ top: height, behavior: 'auto' });
        await new Promise((resolve) => setTimeout(resolve, 300));

        if (height === previousHeight) break;
        previousHeight = height;
      }

      window.scrollTo({ top: 0, behavior: 'auto' });
    });

    const finalUrl = page.url();
    const final = validateChapterUrl(finalUrl);

    const snapshot = await page.evaluate(() => {
      const normalize = (value: string | null | undefined) =>
        (value ?? '').replace(/\s+/g, ' ').trim();

      const title = normalize(
        document.querySelector('main h1, article h1, h1')?.textContent
        || document.querySelector('meta[property="og:title"]')?.getAttribute('content')
        || document.title,
      ) || null;

      const readerRoots = Array.from(
        document.querySelectorAll<HTMLElement>(
          'main,article,[class*="reader"],[class*="chapter"],[class*="reading"],[id*="reader"],[id*="chapter"]',
        ),
      );

      const elements = readerRoots.length > 0
        ? readerRoots.flatMap((root) => Array.from(root.querySelectorAll<HTMLImageElement>('img')))
        : Array.from(document.querySelectorAll<HTMLImageElement>('img'));

      const candidates = elements.map((image, index) => {
        const rect = image.getBoundingClientRect();

        const urls = [
          image.currentSrc,
          image.src,
          image.getAttribute('data-src'),
          image.getAttribute('data-lazy-src'),
          image.getAttribute('data-original'),
          image.getAttribute('data-url'),
          image.getAttribute('data-image'),
          image.parentElement?.querySelector('source')?.getAttribute('src'),
        ].filter((value): value is string => Boolean(value));

        const srcsetValues = [
          image.srcset,
          image.getAttribute('data-srcset') ?? '',
          image.parentElement?.querySelector('source')?.getAttribute('srcset') ?? '',
        ]
          .flatMap((srcset) => srcset
            .split(',')
            .map((part) => part.trim().split(/\s+/)[0])
            .filter(Boolean));

        return {
          index,
          urls: [...urls, ...srcsetValues],
          alt: normalize(image.alt),
          className: normalize(image.className),
          width: rect.width,
          height: rect.height,
          top: rect.top + window.scrollY,
        };
      });

      return { title, candidates };
    });

    const images = new Map<string, { url: string; order: number; score: number }>();

    for (const candidate of snapshot.candidates) {
      for (const raw of candidate.urls) {
        let absolute: string;

        try {
          absolute = new URL(raw, final.href).href;
        } catch {
          continue;
        }

        if (!isUsableImageUrl(absolute)) continue;

        const label = `${candidate.alt} ${candidate.className}`.toLowerCase();
        const path = new URL(absolute).pathname.toLowerCase();
        let score = 0;

        if (candidate.width >= 300) score += 3;
        if (candidate.height >= 300) score += 2;
        if (candidate.top > 250) score += 1;
        if (/page|chapter|reader|reading|webtoon|comic|manga|scan/.test(label)) score += 3;
        if (/page|chapter|capitulo|reader|reading|webtoon|comic|manga|scan|upload/.test(path)) score += 3;
        if (/cover|thumb|avatar|logo|icon|profile|banner|favicon|emoji|advert|ads?/.test(`${label} ${path}`)) score -= 5;

        const previous = images.get(absolute);

        if (!previous || score > previous.score) {
          images.set(absolute, {
            url: absolute,
            order: candidate.index,
            score,
          });
        }
      }
    }

    const requestGroups = new Map<string, number>();
    const normalizedRequests = [...new Set(requestedImageUrls)]
      .filter(isUsableImageUrl);

    for (const imageUrl of normalizedRequests) {
      try {
        const url = new URL(imageUrl);
        const parts = url.pathname.split('/').filter(Boolean);
        const group = `${url.origin}/${parts.slice(0, -1).join('/')}`;
        requestGroups.set(group, (requestGroups.get(group) ?? 0) + 1);
      } catch {
        continue;
      }
    }

    let requestOrder = snapshot.candidates.length + 1;

    for (const imageUrl of normalizedRequests) {
      try {
        const url = new URL(imageUrl);
        const path = url.pathname.toLowerCase();
        const parts = url.pathname.split('/').filter(Boolean);
        const group = `${url.origin}/${parts.slice(0, -1).join('/')}`;
        const groupSize = requestGroups.get(group) ?? 0;

        let score = 0;

        if (/\.(?:jpe?g|png|webp|avif)(?:$|\?)/i.test(imageUrl)) score += 2;
        if (/page|chapter|capitulo|reader|reading|webtoon|comic|manga|scan|upload/.test(path)) score += 4;
        if (groupSize >= 5) score += 3;
        if (/assets?|icons?|logo|avatar|favicon|emoji|advert|ads?|banner|thumb/.test(path)) score -= 6;

        const previous = images.get(imageUrl);

        if (!previous || score > previous.score) {
          images.set(imageUrl, {
            url: imageUrl,
            order: requestOrder,
            score,
          });
        }

        requestOrder += 1;
      } catch {
        continue;
      }
    }

    const ranked = [...images.values()]
      .filter((image) => image.score >= 4)
      .sort((left, right) => left.order - right.order)
      .slice(0, MAX_READER_IMAGES)
      .map((image) => image.url);

    console.info('[MangaMorph reader] chapter rendered', {
      path: final.pathname,
      imageCount: ranked.length,
      domCandidateCount: snapshot.candidates.length,
      requestedImageCount: normalizedRequests.length,
    });

    return {
      title: snapshot.title,
      images: ranked,
      finalUrl: final.href,
    };
  } finally {
    await browser.close();
  }
}


function isSourceTimeout(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();
  return (
    error.name === 'TimeoutError'
    || error.name === 'AbortError'
    || message.includes('timeout')
    || message.includes('aborted')
  );
}

export async function scrapeMangaStopChapter(
  chapterUrl: string,
  profileUrl?: string | null,
  externalChapterId?: string | null,
): Promise<MangaStopChapterSnapshot> {
  if (profileUrl && externalChapterId) {
    try {
      const apiSnapshot = await fetchMangaStopChapterFromApi(
        chapterUrl,
        profileUrl,
        externalChapterId,
      );

      if (apiSnapshot) return apiSnapshot;
    } catch (error) {
      if (isSourceTimeout(error)) {
        console.warn('[MangaMorph reader] MangaStop API timed out; skipping slow browser fallback', {
          message: error instanceof Error ? error.message : 'timeout',
        });
        throw new Error('A fonte demorou para responder. Tente recarregar o capítulo em alguns segundos.');
      }

      console.warn('[MangaMorph reader] MangaStop API failed, using browser fallback', {
        message: error instanceof Error ? error.message : 'unknown',
      });
    }
  }

  return scrapeMangaStopChapterWithBrowser(chapterUrl);
}
