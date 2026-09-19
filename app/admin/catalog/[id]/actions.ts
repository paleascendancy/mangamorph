'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '../../../../lib/admin/require-admin';
import { createClient } from '../../../../lib/supabase/server';

const SYNC_SECONDS: Record<string, number> = {
  '5m': 300,
  '30m': 1800,
  '1h': 3600,
  '7d': 604800,
};

function textList(value: FormDataEntryValue | null): string[] {
  return String(value ?? '')
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function updateCatalogWork(formData: FormData) {
  await requireAdmin();

  const workId = String(formData.get('workId') ?? '').trim();
  if (!workId) return;

  const title = String(formData.get('title') ?? '').trim();
  const synopsisPtBr = String(formData.get('synopsisPtBr') ?? '').trim();
  const status = String(formData.get('status') ?? '').trim();
  const coverUrl = String(formData.get('coverUrl') ?? '').trim();
  const bannerUrl = String(formData.get('bannerUrl') ?? '').trim();

  const supabase = await createClient();

  await supabase
    .from('catalog_works')
    .update({
      title: title || undefined,
      synopsis_pt_br: synopsisPtBr || null,
      genres_pt_br: textList(formData.get('genresPtBr')),
      authors: textList(formData.get('authors')),
      artists: textList(formData.get('artists')),
      status: status || null,
      cover_url: coverUrl || null,
      banner_url: bannerUrl || null,
      locked_fields: [
        'title',
        'synopsis',
        'genres',
        'authors',
        'artists',
        'status',
        'cover_url',
        'banner_url',
      ],
      translation_state: synopsisPtBr ? 'translated' : 'pending',
    })
    .eq('id', workId);

  revalidatePath(`/admin/catalog/${workId}`);
  revalidatePath('/');
}

export async function restoreAutomaticMetadata(formData: FormData) {
  await requireAdmin();

  const workId = String(formData.get('workId') ?? '').trim();
  if (!workId) return;

  const supabase = await createClient();

  await supabase
    .from('catalog_works')
    .update({ locked_fields: [] })
    .eq('id', workId);

  await supabase
    .from('catalog_work_sources')
    .update({
      next_sync_at: new Date().toISOString(),
      sync_locked_until: null,
    })
    .eq('work_id', workId);

  revalidatePath(`/admin/catalog/${workId}`);
}

export async function updateCatalogSyncMode(formData: FormData) {
  await requireAdmin();

  const workId = String(formData.get('workId') ?? '').trim();
  const mode = String(formData.get('syncMode') ?? '1h');
  const seconds = SYNC_SECONDS[mode];

  if (!workId || !seconds) return;

  const supabase = await createClient();

  const { data: source } = await supabase
    .from('catalog_work_sources')
    .select('sync_phase')
    .eq('work_id', workId)
    .maybeSingle();

  const update: Record<string, unknown> = { sync_mode: mode };

  if (source?.sync_phase === 'steady') {
    update.current_interval_seconds = seconds;
    update.next_sync_at = new Date(Date.now() + seconds * 1000).toISOString();
  }

  await supabase
    .from('catalog_work_sources')
    .update(update)
    .eq('work_id', workId);

  revalidatePath(`/admin/catalog/${workId}`);
}

export async function syncCatalogNow(formData: FormData) {
  await requireAdmin();

  const workId = String(formData.get('workId') ?? '').trim();
  if (!workId) return;

  const supabase = await createClient();

  await supabase
    .from('catalog_work_sources')
    .update({
      next_sync_at: new Date().toISOString(),
      sync_locked_until: null,
      is_active: true,
    })
    .eq('work_id', workId);

  revalidatePath(`/admin/catalog/${workId}`);
}
