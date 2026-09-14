import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

const ALLOWED = new Set(['refresh_config','set_presence','clear_runtime_cache']);

export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: admin } = await supabase.from('admin_users').select('role,is_owner').eq('user_id', user.id).maybeSingle();
  const role = admin?.is_owner ? 'OWNER' : String(admin?.role || '').toUpperCase();
  if (!['OWNER','ADMIN'].includes(role)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = await request.json().catch(() => null);
  if (!body || !ALLOWED.has(body.action)) return NextResponse.json({ error: 'invalid_action' }, { status: 400 });

  const targetType = ['instance','module','guild','command'].includes(body.target_type) ? body.target_type : 'instance';
  const { data, error } = await supabase.from('rimuru_control_actions').insert({
    action: body.action,
    target_type: targetType,
    target_id: body.target_id || 'discord-primary',
    payload: body.payload && typeof body.payload === 'object' ? body.payload : {},
    requested_by: user.id
  }).select('id,status,requested_at').single();

  if (error) return NextResponse.json({ error: 'action_failed' }, { status: 500 });
  await supabase.from('rimuru_audit_logs').insert({
    admin_user_id: user.id,
    action: 'CONTROL_ACTION_REQUESTED',
    resource_type: 'rimuru_runtime',
    resource_id: data.id,
    result: 'success',
    metadata: { action: body.action, target_type: targetType, target_id: body.target_id || 'discord-primary' }
  });
  return NextResponse.json({ ok: true, action: data });
}
