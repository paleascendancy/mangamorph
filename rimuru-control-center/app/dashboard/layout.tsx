import { redirect } from 'next/navigation';
import { ControlShell } from '@/components/control-shell';
import { createServerSupabase } from '@/lib/supabase/server';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: admin } = await supabase
    .from('admin_users')
    .select('role,is_owner')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!admin) redirect('/403');
  const role = admin.is_owner ? 'OWNER' : String(admin.role || 'VIEWER').toUpperCase();

  const { data: snapshot } = await supabase.rpc('rimuru_dashboard_snapshot');
  const status = snapshot?.instance?.status || 'offline';
  const adminName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Administrador';

  return <ControlShell adminName={adminName} role={role} status={status}>{children}</ControlShell>;
}
