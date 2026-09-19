import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import type { SourceChapter } from '../types';
import { parseChapterSourceUrl } from '../source-url';
import { normalizeTitle, titleSimilarity } from '../title-resolver';

const REQUEST_TIMEOUT_MS = 20_000;

type BrowserScrapeResult = {
  title: string | null;
  alternativeTitles: string[];
  chapters: SourceChapter[];
  finalUrl: string;
};

type NetworkChapterCandidate = {
  externalId: string;
  title: string;
  url: string;
};

function slugQuery(profileUrl: string): string | null {
  const url = new URL(profileUrl);
  const slug = url.pathname.match(/^\/obra\/\d+\/([^/]+)\/?$/i)?.[1]
    ?? url.pathname.match(/^\/manga\/([^/]+)\/?$/i)?.[1]
    ?? null;

  if (!slug) return null;

  return decodeURIComponent(slug)
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function pickBestTitle(candidates: string[], query: string | null): string | null {
  const cleanCandidates = [...new Set(
    candidates
      .map((value) => value.replace(/\s+/g, ' ').trim())
      .filter(Boolean),
  )];

  if (cleanCandidates.length === 0) return null;

  if (!query) return cleanCandidates[0];

  let best: { title: string; score: number } | null = null;

  for (const title of cleanCandidates) {
    const score = titleSimilarity(query, title);

    if (!best || score > best.score) {
      best = { title, score };
    }
  }

  return best && best.score >= 0.55 ? best.title : null;
}

function chapterIdFromRecord(record: Record<string, unknown>): string | null {
  const directKeys = [
    'chapter',
    'chapterNumber',
    'chapter_number',
    'number',
    'numero',
    'capitulo',
  ];

  for (const key of directKeys) {
    const value = record[key];

    if (
      (typeof value === 'number' || typeof value === 'string')
      && String(value).trim().match(/^[0-9]+(?:\.[0-9]+)?$/)
    ) {
      return String(value).trim();
    }
  }

  const textKeys = ['title', 'name', 'label', 'chapterTitle', 'chapter_title'];

  for (const key of textKeys) {
    const value = record[key];
    if (typeof value !== 'string') continue;

    const match = value.match(/cap(?:[íi]tulo|\.)?\s*([0-9]+(?:\.[0-9]+)?)/i);
    if (match) return match[1];
  }

  return null;
}

function chapterUrlFromRecord(
  record: Record<string, unknown>,
  baseUrl: string,
): string | null {
  const preferredKeys = [
    'url',
    'href',
    'link',
    'path',
    'permalink',
    'chapterUrl',
    'chapter_url',
    'readerUrl',
    'reader_url',
  ];

  const values: string[] = [];

  for (const key of preferredKeys) {
    const value = record[key];
    if (typeof value === 'string') values.push(value);
  }

  for (const value of Object.values(record)) {
    if (typeof value === 'string') values.push(value);
  }

  for (const value of values) {
    const clean = value.replace(/\\\//g, '/').trim();

    if (
      !clean.match(/^https?:\/\//i)
      && !clean.startsWith('/')
    ) {
      continue;
    }

    try {
      const url = new URL(clean, baseUrl);

      if (!['mangastop.net', 'www.mangastop.net'].includes(url.hostname.toLowerCase())) {
        continue;
      }

      const path = decodeURIComponent(url.pathname).toLowerCase();

      if (
        path.includes('capitulo')
        || path.includes('chapter')
        || path.includes('leitor')
        || path.includes('reader')
        || path.includes('/ler/')
      ) {
        return url.href;
      }
    } catch {
      continue;
    }
  }

  return null;
}

function collectNetworkChapterCandidates(
  payloads: unknown[],
  baseUrl: string,
): NetworkChapterCandidate[] {
  const chapters = new Map<string, NetworkChapterCandidate>();
  const visited = new Set<object>();

  const visit = (value: unknown, depth: number) => {
    if (depth > 12 || value === null || value === undefined) return;

    if (Array.isArray(value)) {
      for (const item of value) visit(item, depth + 1);
      return;
    }

    if (typeof value !== 'object') return;

    if (visited.has(value)) return;
    visited.add(value);

    const record = value as Record<string, unknown>;
    const externalId = chapterIdFromRecord(record);
    const url = chapterUrlFromRecord(record, baseUrl);

    if (externalId && url) {
      chapters.set(`${url}::${externalId}`, {
        externalId,
        title: `Capítulo ${externalId}`,
        url,
      });
    }

    for (const nested of Object.values(record)) {
      visit(nested, depth + 1);
    }
  };

  for (const payload of payloads) visit(payload, 0);

  return [...chapters.values()];
}

export async function scrapeMangaStopWithBrowser(
  profileUrl: string,
  titleHint?: string,
): Promise<BrowserScrapeResult> {
  const source = parseChapterSourceUrl(profileUrl);
  const query = titleHint?.trim() || slugQuery(source.profileUrl);

  chromium.setGraphicsMode = false;

  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: 'shell',
    defaultViewport: {
      width: 1280,
      height: 900,
      deviceScaleFactor: 1,
      isMobile: false,
      hasTouch: false,
      isLandscape: false,
    },
  });

  try {
    const page = await browser.newPage();
    const networkPayloads: unknown[] = [];
    const pendingNetworkReads = new Set<Promise<void>>();

    page.on('response', (response) => {
      const task = (async () => {
        try {
          const request = response.request();
          const resourceType = request.resourceType();

          if (!['fetch', 'xhr'].includes(resourceType)) return;

          const responseUrl = new URL(response.url());

          if (!['mangastop.net', 'www.mangastop.net'].includes(responseUrl.hostname.toLowerCase())) {
            return;
          }

          const contentType = response.headers()['content-type'] ?? '';
          if (!contentType.includes('application/json')) return;

          const text = await response.text();
          if (!text || text.length > 2_000_000) return;

          const payload = JSON.parse(text) as unknown;
          networkPayloads.push(payload);
        } catch {
          // Respostas auxiliares podem não ser JSON válido.
        }
      })();

      pendingNetworkReads.add(task);
      task.finally(() => pendingNetworkReads.delete(task)).catch(() => undefined);
    });

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

    await page.goto(source.profileUrl, {
      waitUntil: 'domcontentloaded',
      timeout: REQUEST_TIMEOUT_MS,
    });

    await page.waitForFunction(
      () => {
        const headings = Array.from(document.querySelectorAll('h1,h2,h3'))
          .map((element) => element.textContent?.trim() ?? '')
          .filter(Boolean);

        return headings.length > 0;
      },
      { timeout: 7000 },
    ).catch(() => undefined);

    // O MangásTop mantém a lista de capítulos dentro de uma aba renderizada
    // no cliente. Abrimos essa aba antes de capturar o DOM.
    await page.evaluate(() => {
      const candidates = Array.from(
        document.querySelectorAll<HTMLElement>('button,a,[role="button"]'),
      );

      const chapterTab = candidates.find((element) => {
        const label = (element.textContent ?? '').replace(/\s+/g, ' ').trim();
        return /^capítulos$/i.test(label) || /^capitulos$/i.test(label);
      });

      chapterTab?.click();
    });

    await page.waitForFunction(
      () => /cap(?:[íi]tulo)?\s*\d+/i.test(document.body.innerText),
      { timeout: 7000 },
    ).catch(() => undefined);

    await page.evaluate(async () => {
      let previousHeight = 0;

      for (let index = 0; index < 12; index += 1) {
        const currentHeight = document.body.scrollHeight;

        window.scrollTo({ top: currentHeight, behavior: 'auto' });
        await new Promise((resolve) => setTimeout(resolve, 450));

        if (currentHeight === previousHeight) break;
        previousHeight = currentHeight;
      }

      window.scrollTo({ top: 0, behavior: 'auto' });
    });

    await new Promise((resolve) => setTimeout(resolve, 700));
    await Promise.allSettled([...pendingNetworkReads]);

    const finalUrl = page.url();
    const final = new URL(finalUrl);

    if (!['mangastop.net', 'www.mangastop.net'].includes(final.hostname.toLowerCase())) {
      throw new Error('O navegador foi redirecionado para um domínio não permitido.');
    }

    const snapshot = await page.evaluate(() => {
      const textOf = (element: Element | null) =>
        element?.textContent?.replace(/\s+/g, ' ').trim() ?? '';

      const primaryHeading = document.querySelector('main h1, article h1, h1');
      const structuralAliases: string[] = [];

      if (primaryHeading) {
        let sibling = primaryHeading.nextElementSibling;

        for (let index = 0; sibling && index < 4; index += 1, sibling = sibling.nextElementSibling) {
          const value = textOf(sibling);

          if (
            value.length >= 3
            && value.length <= 140
            && !/^(escolher status|cap[ií]tulos|coment[aá]rios|arte|relacionados?)$/i.test(value)
          ) {
            structuralAliases.push(value);
          }
        }
      }

      const titleCandidates = [
        textOf(primaryHeading),
        ...structuralAliases,
        document.querySelector('meta[property="og:title"]')?.getAttribute('content') ?? '',
        document.querySelector('meta[name="twitter:title"]')?.getAttribute('content') ?? '',
        document.title,
      ].filter(Boolean);

      const chapterPattern = /cap(?:[íi]tulo|\.)?\s*([0-9]+(?:\.[0-9]+)?)/i;
      const chapterCandidates: Array<{ externalId: string; title: string; url: string }> = [];
      const seen = new Set<string>();

      const addChapter = (anchor: HTMLAnchorElement, rawLabel: string) => {
        const label = rawLabel.replace(/\s+/g, ' ').trim();
        const match = label.match(chapterPattern);

        if (!match || !anchor.href) return;

        const externalId = match[1];
        const key = `${anchor.href}::${externalId}`;
        if (seen.has(key)) return;

        seen.add(key);

        chapterCandidates.push({
          externalId,
          title: `Capítulo ${externalId}`,
          url: anchor.href,
        });
      };

      // 1) Preferimos links que já representam uma linha de capítulo.
      for (const anchor of Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]'))) {
        const label = (
          anchor.textContent
          || anchor.getAttribute('title')
          || anchor.getAttribute('aria-label')
          || ''
        ).replace(/\s+/g, ' ').trim();

        if (!chapterPattern.test(label)) continue;
        addChapter(anchor, label);
      }

      // 2) Fallback para interfaces em que o texto fica fora do <a>.
      for (const element of Array.from(
        document.querySelectorAll<HTMLElement>('li,[role="listitem"],tr,article,section,div,button,[role="button"]'),
      )) {
        const label = (element.textContent ?? '').replace(/\s+/g, ' ').trim();
        const occurrences = label.match(/cap(?:[íi]tulo|\.)?\s*[0-9]+(?:\.[0-9]+)?/gi) ?? [];

        if (occurrences.length !== 1 || label.length > 220) continue;

        const externalId = label.match(chapterPattern)?.[1];
        if (!externalId) continue;

        const clickable = element.closest<HTMLElement>('a[href],[data-href],[data-url],[data-link],[role="link"]')
          ?? element.querySelector<HTMLElement>('a[href],[data-href],[data-url],[data-link],[role="link"]');

        const rawUrl = clickable instanceof HTMLAnchorElement
          ? clickable.href
          : clickable?.getAttribute('data-href')
            ?? clickable?.getAttribute('data-url')
            ?? clickable?.getAttribute('data-link')
            ?? null;

        if (!rawUrl) continue;

        try {
          const url = new URL(rawUrl, window.location.href);
          const key = `${url.href}::${externalId}`;

          if (!seen.has(key)) {
            seen.add(key);
            chapterCandidates.push({
              externalId,
              title: `Capítulo ${externalId}`,
              url: url.href,
            });
          }
        } catch {
          continue;
        }
      }

      const chapters = chapterCandidates;

      return { titleCandidates, chapters };
    });

    const title = pickBestTitle(snapshot.titleCandidates, query);
    const alternativeTitles = [...new Set(
      snapshot.titleCandidates
        .map((value) => value.replace(/\s+/g, ' ').trim())
        .filter((value) => value && value !== title && value.length <= 140),
    )].slice(0, 6);
    const chapters = new Map<string, SourceChapter>();
    const networkChapters = collectNetworkChapterCandidates(networkPayloads, finalUrl);

    for (const chapter of [...snapshot.chapters, ...networkChapters]) {
      try {
        const url = new URL(chapter.url);

        if (!['mangastop.net', 'www.mangastop.net'].includes(url.hostname.toLowerCase())) continue;

        chapters.set(url.href, chapter);
      } catch {
        continue;
      }
    }

    console.info('[MangaMorph scraper] browser scrape completed', {
      externalWorkId: source.externalWorkId,
      finalPath: final.pathname,
      titleFound: Boolean(title),
      chapterCount: chapters.size,
      networkPayloadCount: networkPayloads.length,
      networkChapterCount: networkChapters.length,
    });

    return {
      title,
      alternativeTitles,
      chapters: [...chapters.values()],
      finalUrl,
    };
  } finally {
    await browser.close();
  }
}
