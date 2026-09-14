import { ServerManager } from '@/components/control-plane';
import { requireAdmin } from '@/lib/admin';

export default async function ServersPage() {
  const { supabase, role } = await requireAdmin();
  const [{ data: guilds }, { data: docs }] = await Promise.all([
    supabase.from('rimuru_guild_registry').select('guild_hash,control_id,display_name,member_count,active,last_seen_at').order('last_seen_at',{ascending:false}),
    supabase.from('rimuru_config_documents').select('id,scope_type,scope_id,module,enabled,config,version,updated_at').eq('scope_type','guild')
  ]);
  return <section className="section-page"><div className="section-header"><span className="eyebrow">SERVER MANAGER</span><h2>Servidores</h2><p className="muted">Controle o comportamento do Rimuru por servidor sem afetar os demais.</p></div><ServerManager guilds={guilds || []} docs={docs || []} role={role} /></section>;
}
