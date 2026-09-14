import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';

export async function requireAdmin() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: admin } = await supabase.from('admin_users').select('role,is_owner,permissions').eq('user_id', user.id).maybeSingle();
  if (!admin) redirect('/403');
  const role = admin.is_owner ? 'OWNER' : String(admin.role || 'VIEWER').toUpperCase();
  return { supabase, user, admin, role };
}
