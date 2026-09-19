import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import type { SourceChapter } from '../types';
import { parseChapterSourceUrl } from '../source-url';
import { normalizeTitle, titleSimilarity } from '../title-resolver';

const REQUEST_TIMEOUT_MS = 20_000;

type BrowserScrapeResult = {
  title: string | null;
  chapters: SourceChapter[];
  finalUrl: string;
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

      for (let index = 0; index < 8; index += 1) {
        const currentHeight = document.body.scrollHeight;

        window.scrollTo({ top: currentHeight, behavior: 'auto' });
        await new Promise((resolve) => setTimeout(resolve, 350));

        if (currentHeight === previousHeight) break;
        previousHeight = currentHeight;
      }

      window.scrollTo({ top: 0, behavior: 'auto' });
    });

    const finalUrl = page.url();
    const final = new URL(finalUrl);

    if (!['mangastop.net', 'www.mangastop.net'].includes(final.hostname.toLowerCase())) {
      throw new Error('O navegador foi redirecionado para um domínio não permitido.');
    }

    const snapshot = await page.evaluate(() => {
      const textOf = (element: Element | null) =>
        element?.textContent?.replace(/\s+/g, ' ').trim() ?? '';

      const titleCandidates = [
        ...Array.from(document.querySelectorAll('main h1, article h1, h1, h2, h3'))
          .map((element) => textOf(element))
          .filter(Boolean),
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

      // 2) Fallback para interfaces em que o texto fica fora do <a>, mas ainda
      // pertence a uma única linha. Ignoramos containers que agregam vários capítulos.
      for (const element of Array.from(
        document.querySelectorAll<HTMLElement>('li,[role="listitem"],tr,article,section,div'),
      )) {
        const label = (element.textContent ?? '').replace(/\s+/g, ' ').trim();
        const occurrences = label.match(/cap(?:[íi]tulo|\.)?\s*[0-9]+(?:\.[0-9]+)?/gi) ?? [];

        if (occurrences.length !== 1 || label.length > 220) continue;

        const anchor = element.closest('a[href]') as HTMLAnchorElement | null
          ?? element.querySelector('a[href]') as HTMLAnchorElement | null;

        if (!anchor?.href) continue;
        addChapter(anchor, label);
      }

      const chapters = chapterCandidates;

      return { titleCandidates, chapters };
    });

    const title = pickBestTitle(snapshot.titleCandidates, query);
    const chapters = new Map<string, SourceChapter>();

    for (const chapter of snapshot.chapters) {
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
    });

    return {
      title,
      chapters: [...chapters.values()],
      finalUrl,
    };
  } finally {
    await browser.close();
  }
}
