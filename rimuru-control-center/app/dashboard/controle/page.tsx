import { GlobalControl } from '@/components/control-plane';
import { requireAdmin } from '@/lib/admin';

export default async function ControlPage() {
  const { supabase, role } = await requireAdmin();
  const [{ data: docs }, { data: snapshot }] = await Promise.all([
    supabase.from('rimuru_config_documents').select('id,scope_type,scope_id,module,enabled,config,version,updated_at').eq('scope_type','global').order('module'),
    supabase.rpc('rimuru_dashboard_snapshot')
  ]);
  const status = snapshot?.instance?.status || 'offline';
  return <section className="section-page"><div className="section-header"><span className="eyebrow">CONTROL PLANE V1</span><h2>Rimuru OS</h2><p className="muted">Controle configurações operacionais do bot sem editar código ou fazer redeploy.</p></div><GlobalControl docs={docs || []} role={role} instanceStatus={status} /></section>;
}
