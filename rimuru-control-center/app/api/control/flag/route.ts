import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body.key !== 'string' || !body.key.trim()) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  const rollout = Math.max(0, Math.min(100, Number(body.rollout_percent || 0)));
  const { data, error } = await supabase.rpc('rimuru_publish_feature_flag', {
    p_key: body.key.trim().slice(0, 120),
    p_description: typeof body.description === 'string' ? body.description.slice(0, 500) : null,
    p_enabled: body.enabled === true,
    p_rollout_percent: rollout,
    p_allowed_guilds: Array.isArray(body.allowed_guilds) ? body.allowed_guilds.slice(0, 200) : [],
    p_blocked_guilds: Array.isArray(body.blocked_guilds) ? body.blocked_guilds.slice(0, 200) : [],
    p_config: body.config && typeof body.config === 'object' ? body.config : {}
  });
  if (error) {
    const forbidden = error.message?.includes('not_authorized');
    return NextResponse.json({ error: forbidden ? 'forbidden' : 'publish_failed' }, { status: forbidden ? 403 : 500 });
  }
  return NextResponse.json({ ok: true, flag: data });
}
