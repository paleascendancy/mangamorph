import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

const REQUEST_TIMEOUT_MS = 20_000;
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

function isUsableImageUrl(value: string): boolean {
  try {
    const url = new URL(value);

    if (!['https:', 'http:'].includes(url.protocol)) return false;

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

export async function scrapeMangaStopChapter(
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

    await page.setUserAgent(
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
    );

    await page.setRequestInterception(true);

    page.on('request', (request) => {
      const resourceType = request.resourceType();

      if (['image', 'media', 'font'].includes(resourceType)) {
        request.abort().catch(() => undefined);
        return;
      }

      request.continue().catch(() => undefined);
    });

    await page.goto(sourceUrl.href, {
      waitUntil: 'domcontentloaded',
      timeout: REQUEST_TIMEOUT_MS,
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
        ].filter((value): value is string => Boolean(value));

        const srcsetValues = [
          image.srcset,
          image.getAttribute('data-srcset') ?? '',
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
        let score = 0;

        if (candidate.width >= 300) score += 3;
        if (candidate.height >= 300) score += 2;
        if (candidate.top > 250) score += 1;
        if (/page|chapter|reader|reading|webtoon|comic|manga/.test(label)) score += 3;
        if (/cover|thumb|avatar|logo|icon|profile|banner/.test(label)) score -= 5;

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

    const ranked = [...images.values()]
      .filter((image) => image.score >= 2)
      .sort((left, right) => left.order - right.order)
      .slice(0, MAX_READER_IMAGES)
      .map((image) => image.url);

    console.info('[MangaMorph reader] chapter rendered', {
      path: final.pathname,
      imageCount: ranked.length,
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
