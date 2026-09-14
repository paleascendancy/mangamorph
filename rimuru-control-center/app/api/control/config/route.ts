import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body || !['global','guild','channel','role'].includes(body.scope_type) || typeof body.module !== 'string') {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  const { data, error } = await supabase.rpc('rimuru_publish_config', {
    p_scope_type: body.scope_type,
    p_scope_id: body.scope_id || null,
    p_module: body.module.slice(0, 160),
    p_enabled: body.enabled !== false,
    p_config: body.config && typeof body.config === 'object' ? body.config : {},
    p_note: typeof body.note === 'string' ? body.note.slice(0, 500) : null
  });

  if (error) {
    const forbidden = error.message?.includes('not_authorized');
    return NextResponse.json({ error: forbidden ? 'forbidden' : 'publish_failed' }, { status: forbidden ? 403 : 500 });
  }
  return NextResponse.json({ ok: true, document: data });
}
