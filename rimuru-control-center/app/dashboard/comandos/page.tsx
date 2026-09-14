import { CommandManager } from '@/components/control-plane';
import { requireAdmin } from '@/lib/admin';

export default async function CommandsPage() {
  const { supabase, role } = await requireAdmin();
  const [{ data: commands }, { data: docs }, { data: flags }] = await Promise.all([
    supabase.from('rimuru_commands').select('name,category,description,enabled,updated_at').order('name').limit(300),
    supabase.from('rimuru_config_documents').select('id,scope_type,scope_id,module,enabled,config,version,updated_at').eq('scope_type','global').like('module','command.%'),
    supabase.from('rimuru_feature_flags').select('key,description,enabled,rollout_percent,allowed_guilds,blocked_guilds,version,updated_at').order('key')
  ]);
  return <section className="section-page"><div className="section-header"><span className="eyebrow">COMMAND CENTER</span><h2>Comandos</h2><p className="muted">Ative, desative e aplique cooldowns e limites sem reiniciar o Rimuru.</p></div><CommandManager commands={commands || []} docs={docs || []} flags={flags || []} role={role} /></section>;
}
