import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { resolveMetadata } from '../../../../lib/catalog/resolve-metadata';
import { fetchMangasTopWork } from '../../../../lib/catalog/sources/mangastop';
import { translateSynopsisPtBr } from '../../../../lib/catalog/translate-description';
import { translateGenresPtBr } from '../../../../lib/catalog/translation';

export const maxDuration = 60;

type ClaimedSyncJob = {
  source_id: string;
  work_id: string;
  profile_url: string;
  source_title: string | null;
  sync_mode: string;
  sync_phase: string;
  catchup_batch_size: number;
};

function createSyncClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}

export async function POST(request: Request) {
  let token = '';

  try {
    const body = (await request.json()) as { token?: unknown };
    token = typeof body.token === 'string' ? body.token.trim() : '';
  } catch {
    return NextResponse.json({ error: 'invalid-body' }, { status: 400 });
  }

  if (token.length < 32) {
    return NextResponse.json({ error: 'invalid-token' }, { status: 401 });
  }

  const supabase = createSyncClient();

  const { data: claimed, error: claimError } = await supabase
    .rpc('claim_catalog_sync_job', { p_token: token });

  if (claimError) {
    console.error('[MangaMorph sync] claim failed', { message: claimError.message });
    return NextResponse.json({ error: 'claim-failed' }, { status: 500 });
  }

  const job = (Array.isArray(claimed) ? claimed[0] : null) as ClaimedSyncJob | undefined;

  if (!job) {
    return NextResponse.json({ error: 'expired-or-used-token' }, { status: 401 });
  }

  try {
    const snapshot = await fetchMangasTopWork(
      job.profile_url,
      job.source_title ?? undefined,
    );

    const metadataDecision = await resolveMetadata(
      snapshot.title,
      snapshot.alternativeTitles,
    );

    if (metadataDecision.status === 'matched') {
      const metadata = metadataDecision.candidate;
      let synopsisPtBr: string | null = null;

      try {
        synopsisPtBr = await translateSynopsisPtBr(metadata.description);
      } catch (error) {
        console.warn('[MangaMorph sync] synopsis translation failed', {
          sourceId: job.source_id,
          message: error instanceof Error ? error.message : 'unknown',
        });
      }

      const { error: metadataError } = await supabase.rpc(
        'apply_catalog_sync_metadata',
        {
          p_token: token,
          p_metadata: {
            provider: metadata.provider,
            externalId: metadata.externalId,
            profileUrl: metadata.profileUrl,
            synopsisOriginal: metadata.description,
            synopsisPtBr,
            genresOriginal: metadata.genres,
            genresPtBr: translateGenresPtBr(metadata.genres),
            authors: metadata.authors,
            artists: metadata.artists,
            status: metadata.status,
            countryOrigin: metadata.countryOfOrigin,
            coverUrl: metadata.coverUrl,
            bannerUrl: metadata.bannerUrl,
            myAnimeListId: metadata.linkedIds.myanimelist ?? null,
          },
        },
      );

      if (metadataError) {
        console.warn('[MangaMorph sync] metadata update failed', {
          sourceId: job.source_id,
          message: metadataError.message,
        });
      }
    }

    const payload = {
      title: snapshot.title,
      profileUrl: snapshot.profileUrl,
      chapters: snapshot.chapters.map((chapter) => ({
        externalId: chapter.externalId,
        title: chapter.title,
        url: chapter.url,
      })),
    };

    const { data: result, error: completeError } = await supabase.rpc(
      'complete_catalog_sync_job',
      {
        p_token: token,
        p_payload: payload,
      },
    );

    if (completeError) {
      throw new Error(completeError.message);
    }

    console.info('[MangaMorph sync] completed', {
      sourceId: job.source_id,
      discovered: snapshot.chapters.length,
      phaseBefore: job.sync_phase,
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'sync failed';

    console.error('[MangaMorph sync] failed', {
      sourceId: job.source_id,
      message,
    });

    await supabase.rpc('fail_catalog_sync_job', {
      p_token: token,
      p_error: message,
    });

    return NextResponse.json({ error: 'sync-failed' }, { status: 500 });
  }
}
