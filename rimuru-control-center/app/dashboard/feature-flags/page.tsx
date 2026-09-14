import { FeatureFlagManager } from '@/components/control-plane';
import { requireAdmin } from '@/lib/admin';

export default async function FeatureFlagsPage() {
  const { supabase, role } = await requireAdmin();
  const [{ data: flags }, { data: guilds }] = await Promise.all([
    supabase.from('rimuru_feature_flags').select('key,description,enabled,rollout_percent,allowed_guilds,blocked_guilds,version,updated_at').order('key'),
    supabase.from('rimuru_guild_registry').select('guild_hash,control_id,display_name,member_count,active,last_seen_at').order('display_name')
  ]);
  return <section className="section-page"><div className="section-header"><span className="eyebrow">FEATURE FLAGS</span><h2>Lançamentos controlados</h2><p className="muted">Libere recursos gradualmente e associe flags aos comandos antes de lançar para todos.</p></div><FeatureFlagManager flags={flags || []} guilds={guilds || []} role={role} /></section>;
}
