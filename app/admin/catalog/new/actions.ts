'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '../../../../lib/admin/require-admin';
import { inspectCatalogSource } from '../../../../lib/catalog';
import { translateSynopsisPtBr } from '../../../../lib/catalog/translate-description';
import { translateGenresPtBr, translateStatusPtBr } from '../../../../lib/catalog/translation';
import type { SourceChapter } from '../../../../lib/catalog/types';
import { createClient } from '../../../../lib/supabase/server';

const SYNC_MODES = new Set(['5m', '30m', '1h', '7d']);

function chapterNumber(chapter: SourceChapter): number | null {
  const value = Number(chapter.externalId);
  return Number.isFinite(value) ? value : null;
}

function pickInitialChapter(chapters: SourceChapter[]): SourceChapter | null {
  if (chapters.length === 0) return null;

  return [...chapters].sort((left, right) => {
    const a = chapterNumber(left);
    const b = chapterNumber(right);

    if (a !== null && b !== null) return a - b;
    if (a !== null) return -1;
    if (b !== null) return 1;
    return left.externalId.localeCompare(right.externalId);
  })[0] ?? null;
}

export async function saveCatalogWork(formData: FormData) {
  await requireAdmin();

  const sourceUrl = String(formData.get('source') ?? '').trim();
  const titleHint = String(formData.get('titleHint') ?? '').trim();
  const requestedMode = String(formData.get('syncMode') ?? '1h');
  const syncMode = SYNC_MODES.has(requestedMode) ? requestedMode : '1h';

  if (!sourceUrl) {
    redirect('/admin/catalog/new?error=missing-source');
  }

  let inspection: Awaited<ReturnType<typeof inspectCatalogSource>>;

  try {
    inspection = await inspectCatalogSource(sourceUrl, titleHint || undefined);
  } catch {
    redirect(
      `/admin/catalog/new?source=${encodeURIComponent(sourceUrl)}&error=inspect-before-save`,
    );
  }

  const initialChapter = pickInitialChapter(inspection.source.chapters);
  const matchedMetadata = inspection.metadata.status === 'matched'
    ? inspection.metadata.candidate
    : null;

  let synopsisPtBr: string | null = null;

  if (matchedMetadata?.description) {
    try {
      synopsisPtBr = await translateSynopsisPtBr(matchedMetadata.description);
    } catch {
      synopsisPtBr = null;
    }
  }

  const payload = {
    title: inspection.source.title,
    sourceProfileUrl: inspection.source.profileUrl,
    sourceExternalId: inspection.source.externalWorkId,
    remoteChapterCount: inspection.source.chapters.length,
    syncMode,
    initialChapter: initialChapter
      ? {
          externalId: initialChapter.externalId,
          title: initialChapter.title,
          url: initialChapter.url,
        }
      : null,
    metadata: matchedMetadata
      ? {
          provider: matchedMetadata.provider,
          externalId: matchedMetadata.externalId,
          profileUrl: matchedMetadata.profileUrl,
          synopsisOriginal: matchedMetadata.description,
          synopsisPtBr,
          genresOriginal: matchedMetadata.genres,
          genresPtBr: translateGenresPtBr(matchedMetadata.genres),
          authors: matchedMetadata.authors,
          artists: matchedMetadata.artists,
          status: translateStatusPtBr(matchedMetadata.status),
          countryOrigin: matchedMetadata.countryOfOrigin,
          coverUrl: matchedMetadata.coverUrl,
          bannerUrl: matchedMetadata.bannerUrl,
          myAnimeListId: matchedMetadata.linkedIds.myanimelist ?? null,
        }
      : null,
  };

  const supabase = await createClient();
  const { data: workId, error } = await supabase.rpc('admin_create_catalog_work', {
    p_payload: payload,
  });

  if (error || !workId) {
    console.error('[MangaMorph catalog] save failed', {
      sourceUrl,
      message: error?.message ?? 'missing-work-id',
    });

    const reason = error?.message.includes('already registered') ? 'already-exists' : 'save-failed';

    redirect(
      `/admin/catalog/new?source=${encodeURIComponent(sourceUrl)}&error=${reason}`,
    );
  }

  console.info('[MangaMorph catalog] save completed', {
    workId,
    sourceUrl,
    syncMode,
    remoteChapterCount: inspection.source.chapters.length,
  });

  revalidatePath('/');
  revalidatePath('/admin');
  redirect(`/admin/catalog/${workId}`);
}
