'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type ConfigDoc = { id?: string; scope_type: string; scope_id: string | null; module: string; enabled: boolean; config: Record<string, any>; version: number; updated_at?: string };
type Guild = { guild_hash: string; control_id: string | null; display_name: string | null; member_count: number | null; active: boolean; last_seen_at: string };
type Command = { name: string; category?: string | null; description?: string | null; enabled?: boolean; updated_at?: string };
type Flag = { key: string; description?: string | null; enabled: boolean; rollout_percent: number; allowed_guilds: string[]; blocked_guilds: string[]; version: number; updated_at: string };

function usePublisher() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState('');

  async function post(url: string, payload: unknown) {
    setMessage('');
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error === 'forbidden' ? 'Você não tem permissão para publicar esta alteração.' : 'Não foi possível publicar a alteração.');
    }
    return response.json();
  }

  function run(task: () => Promise<unknown>, success = 'Alteração publicada.') {
    startTransition(async () => {
      try {
        await task();
        setMessage(success);
        router.refresh();
      } catch (error: any) {
        setMessage(error?.message || 'Falha ao salvar.');
      }
    });
  }
  return { pending, message, post, run };
}

function Toggle({ checked, onChange, disabled = false }: { checked: boolean; onChange: (value: boolean) => void; disabled?: boolean }) {
  return <button type="button" className={`switch ${checked ? 'on' : ''}`} aria-pressed={checked} disabled={disabled} onClick={() => onChange(!checked)}><span /></button>;
}

function NumberField({ label, value, onChange, min = 0, max = 999999 }: { label: string; value: number; onChange: (value: number) => void; min?: number; max?: number }) {
  return <label className="control-field"><span>{label}</span><input type="number" min={min} max={max} value={value} onChange={e => onChange(Number(e.target.value))} /></label>;
}

export function GlobalControl({ docs, role, instanceStatus }: { docs: ConfigDoc[]; role: string; instanceStatus: string }) {
  const coreDoc = docs.find(d => d.scope_type === 'global' && d.module === 'core');
  const initial = coreDoc?.config || {};
  const [maintenance, setMaintenance] = useState(Boolean(initial.maintenance_mode));
  const [safeMode, setSafeMode] = useState(Boolean(initial.safe_mode));
  const [prefix, setPrefix] = useState(String(initial.default_prefix || '/'));
  const [presence, setPresence] = useState('Pale Ascendancy • editores & designers');
  const { pending, message, post, run } = usePublisher();
  const canManage = ['OWNER','ADMIN'].includes(role);

  function publishCore() {
    run(() => post('/api/control/config', {
      scope_type: 'global', scope_id: null, module: 'core', enabled: true,
      config: { ...initial, maintenance_mode: maintenance, safe_mode: safeMode, default_prefix: prefix.slice(0, 5), control_refresh_seconds: 12 },
      note: 'Atualização pela Central de Controle'
    }), 'Configuração global publicada. O Rimuru aplicará em até alguns segundos.');
  }

  function action(action: string, payload: Record<string, unknown> = {}) {
    run(() => post('/api/control/action', { action, target_type: 'instance', target_id: 'discord-primary', payload }), 'Ação enviada ao Rimuru.');
  }

  return <div className="control-grid">
    <article className="card control-card control-hero">
      <div><span className="eyebrow">RIMURU OS</span><h3>Controle operacional</h3><p className="muted">Mudanças versionadas, auditadas e aplicadas sem editar o código do bot.</p></div>
      <span className={`state ${instanceStatus === 'online' ? 'ok' : instanceStatus === 'degraded' ? 'warn' : 'bad'}`}>{instanceStatus === 'online' ? 'Online' : instanceStatus === 'degraded' ? 'Instável' : 'Offline'}</span>
    </article>

    <article className="card control-card">
      <div className="control-row"><div><strong>Modo manutenção</strong><small>Bloqueia comandos para membros enquanto você faz ajustes.</small></div><Toggle checked={maintenance} onChange={setMaintenance} disabled={!canManage || pending} /></div>
      <div className="control-row"><div><strong>Safe Mode</strong><small>Permite comandos apenas para administradores do Discord.</small></div><Toggle checked={safeMode} onChange={setSafeMode} disabled={!canManage || pending} /></div>
      <label className="control-field"><span>Prefixo padrão</span><input value={prefix} maxLength={5} onChange={e => setPrefix(e.target.value)} disabled={!canManage || pending} /></label>
      <button className="primary-btn" disabled={!canManage || pending} onClick={publishCore}>{pending ? 'Publicando…' : 'Publicar configuração'}</button>
    </article>

    <article className="card control-card">
      <h3>Ações de runtime</h3><p className="muted">Ações temporárias. Não exigem redeploy.</p>
      <label className="control-field"><span>Presença do bot</span><input value={presence} maxLength={128} onChange={e => setPresence(e.target.value)} disabled={!canManage || pending} /></label>
      <div className="button-row"><button className="secondary-btn" disabled={!canManage || pending} onClick={() => action('set_presence', { text: presence })}>Aplicar presença</button><button className="secondary-btn" disabled={!canManage || pending} onClick={() => action('refresh_config')}>Forçar sync</button><button className="secondary-btn" disabled={!canManage || pending} onClick={() => action('clear_runtime_cache')}>Limpar cache</button></div>
    </article>
    {message && <div className="control-message">{message}</div>}
  </div>;
}

export function ServerManager({ guilds, docs, role }: { guilds: Guild[]; docs: ConfigDoc[]; role: string }) {
  const canManage = ['OWNER','ADMIN'].includes(role);
  const [selectedId, setSelectedId] = useState(guilds[0]?.control_id || '');
  const selected = guilds.find(g => g.control_id === selectedId);
  const serverDoc = docs.find(d => d.scope_type === 'guild' && d.scope_id === selectedId && d.module === 'core');
  const [maintenance, setMaintenance] = useState(Boolean(serverDoc?.config?.maintenance_mode));
  const { pending, message, post, run } = usePublisher();

  function select(id: string) {
    setSelectedId(id);
    const doc = docs.find(d => d.scope_type === 'guild' && d.scope_id === id && d.module === 'core');
    setMaintenance(Boolean(doc?.config?.maintenance_mode));
  }

  function save() {
    if (!selectedId) return;
    run(() => post('/api/control/config', {
      scope_type: 'guild', scope_id: selectedId, module: 'core', enabled: true,
      config: { ...(serverDoc?.config || {}), maintenance_mode: maintenance },
      note: `Configuração do servidor ${selected?.display_name || selectedId}`
    }), 'Configuração do servidor publicada.');
  }

  return <div className="server-layout">
    <aside className="card server-list"><h3>Servidores</h3>{guilds.length ? guilds.map(g => <button key={g.guild_hash} className={g.control_id === selectedId ? 'selected' : ''} onClick={() => g.control_id && select(g.control_id)}><strong>{g.display_name || 'Servidor'}</strong><small>{g.member_count ?? '—'} membros • {g.active ? 'Ativo' : 'Inativo'}</small></button>) : <div className="empty">O registro de servidores aparecerá no próximo heartbeat do Rimuru.</div>}</aside>
    <section className="card control-card">{selected ? <><span className="eyebrow">SERVIDOR</span><h3>{selected.display_name}</h3><p className="muted">Última telemetria: {new Date(selected.last_seen_at).toLocaleString('pt-BR')}</p><div className="control-row"><div><strong>Manutenção só neste servidor</strong><small>O restante dos servidores continua funcionando normalmente.</small></div><Toggle checked={maintenance} onChange={setMaintenance} disabled={!canManage || pending} /></div><button className="primary-btn" onClick={save} disabled={!canManage || pending}>{pending ? 'Publicando…' : 'Publicar no servidor'}</button>{message && <div className="control-message">{message}</div>}</> : <div className="empty">Selecione um servidor.</div>}</section>
  </div>;
}

export function CommandManager({ commands, docs, flags, role }: { commands: Command[]; docs: ConfigDoc[]; flags: Flag[]; role: string }) {
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<'global'>('global');
  const { pending, message, post, run } = usePublisher();
  const canManage = ['OWNER','ADMIN'].includes(role);
  const filtered = useMemo(() => commands.filter(c => `${c.name} ${c.description || ''}`.toLowerCase().includes(query.toLowerCase())), [commands, query]);

  function current(name: string) {
    const doc = docs.find(d => d.scope_type === scope && d.module === `command.${name}`);
    return { doc, enabled: doc?.enabled ?? true, config: doc?.config || {} };
  }

  function save(name: string, patch: Record<string, unknown>, enabled?: boolean) {
    const currentRule = current(name);
    run(() => post('/api/control/config', {
      scope_type: scope, scope_id: null, module: `command.${name}`,
      enabled: enabled ?? currentRule.enabled,
      config: { ...currentRule.config, ...patch },
      note: `Command Center: /${name}`
    }), `/${name} atualizado.`);
  }

  return <div className="command-console">
    <div className="card control-toolbar"><input className="search wide" placeholder="Pesquisar comando…" value={query} onChange={e => setQuery(e.target.value)} /><span className="muted">{filtered.length} comandos catalogados</span></div>
    {message && <div className="control-message">{message}</div>}
    <div className="command-list">{filtered.length ? filtered.map(command => {
      const rule = current(command.name);
      const cfg = rule.config;
      return <article className="card command-control" key={command.name}>
        <div className="command-head"><div><strong>/{command.name}</strong><small>{command.description || 'Sem descrição'}</small></div><Toggle checked={rule.enabled} onChange={value => save(command.name, {}, value)} disabled={!canManage || pending} /></div>
        <div className="command-fields"><NumberField label="Cooldown (ms)" value={Number(cfg.cooldown_ms || 0)} onChange={value => save(command.name, { cooldown_ms: value })} max={3600000} /><NumberField label="Limite usuário/min" value={Number(cfg.user_rate_limit || 0)} onChange={value => save(command.name, { user_rate_limit: value })} max={10000} /><NumberField label="Limite global/min" value={Number(cfg.global_rate_limit || 0)} onChange={value => save(command.name, { global_rate_limit: value })} max={100000} /><label className="control-field"><span>Feature flag</span><select value={String(cfg.feature_flag || '')} onChange={e => save(command.name, { feature_flag: e.target.value || null })}><option value="">Nenhuma</option>{flags.map(f => <option key={f.key} value={f.key}>{f.key}</option>)}</select></label></div>
      </article>;
    }) : <div className="empty">Nenhum comando encontrado. O catálogo é enviado automaticamente pelo Rimuru.</div>}</div>
  </div>;
}

export function FeatureFlagManager({ flags, guilds, role }: { flags: Flag[]; guilds: Guild[]; role: string }) {
  const { pending, message, post, run } = usePublisher();
  const canManage = ['OWNER','ADMIN'].includes(role);
  function update(flag: Flag, patch: Partial<Flag>) {
    const next = { ...flag, ...patch };
    run(() => post('/api/control/flag', next), `${flag.key} publicado.`);
  }

  return <div className="flag-grid">{message && <div className="control-message">{message}</div>}{flags.map(flag => <article className="card flag-card" key={flag.key}><div className="control-row"><div><strong>{flag.key}</strong><small>{flag.description || 'Feature flag do Rimuru'}</small></div><Toggle checked={flag.enabled} onChange={value => update(flag, { enabled: value })} disabled={!canManage || pending} /></div><label className="control-field"><span>Rollout: {flag.rollout_percent}%</span><input type="range" min="0" max="100" step="5" value={flag.rollout_percent} disabled={!canManage || pending} onChange={e => update(flag, { rollout_percent: Number(e.target.value) })} /></label><div className="flag-meta"><span>v{flag.version}</span><span>{new Date(flag.updated_at).toLocaleString('pt-BR')}</span></div></article>)}{!flags.length && <div className="empty">Nenhuma feature flag configurada.</div>}</div>;
}
