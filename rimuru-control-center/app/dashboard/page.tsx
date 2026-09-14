import { createServerSupabase } from '@/lib/supabase/server';

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('pt-BR', { notation: value >= 10000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(value);
}

function uptime(startedAt?: string | null) {
  if (!startedAt) return '—';
  const ms = Date.now() - new Date(startedAt).getTime();
  if (ms < 0) return '—';
  const hours = Math.floor(ms / 3600000);
  const days = Math.floor(hours / 24);
  return days ? `${days}d ${hours % 24}h` : `${hours}h`;
}

export default async function DashboardPage() {
  const supabase = await createServerSupabase();
  const { data: snapshot } = await supabase.rpc('rimuru_dashboard_snapshot');
  const instance = snapshot?.instance;
  const today = snapshot?.today || {};
  const metric = snapshot?.health?.latest_metric;
  const alerts = snapshot?.recent_alerts || [];
  const top = snapshot?.top_commands || [];
  const status = instance?.status || 'offline';
  const successRate = today.commands ? Math.round((Number(today.successful_commands || 0) / Number(today.commands)) * 1000) / 10 : null;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <>
      <section className="hero">
        <div className="card hero-card">
          <span className="eyebrow">{greeting}</span>
          <h2>Administrador.</h2>
          <p className="muted">Veja como o Rimuru está operando agora.</p>
          <div className="meta-row">
            <span className="badge">Versão {instance?.version || 'não informada'}</span>
            <span className="badge">{instance?.environment || 'production'}</span>
            <span className="badge">Última atividade {instance?.last_seen_at ? new Date(instance.last_seen_at).toLocaleString('pt-BR') : 'sem telemetria'}</span>
          </div>
        </div>
        <div className="card hero-card">
          <span className="eyebrow">ATIVIDADE HOJE</span>
          <h2>{formatNumber(today.commands)}</h2>
          <p className="muted">comandos executados</p>
          <div className="meta-row"><span className="badge">{formatNumber(today.events)} eventos</span><span className="badge">{successRate === null ? '—' : `${successRate}%`} sucesso</span></div>
        </div>
      </section>

      <section className="metrics" aria-label="Indicadores principais">
        <article className="card metric"><div className="metric-label">USUÁRIOS ATIVOS</div><div className="metric-value">{formatNumber(today.unique_users)}</div><div className="metric-caption">identificados pela telemetria de hoje</div></article>
        <article className="card metric"><div className="metric-label">GRUPOS ATIVOS</div><div className="metric-value">{formatNumber(today.active_groups)}</div><div className="metric-caption">com atividade hoje</div></article>
        <article className="card metric"><div className="metric-label">PERFORMANCE</div><div className="metric-value">{metric?.latency_ms == null ? '—' : `${Math.round(metric.latency_ms)}ms`}</div><div className="metric-caption">latência mais recente</div></article>
        <article className="card metric"><div className="metric-label">ERROS ABERTOS</div><div className="metric-value">{formatNumber(today.errors)}</div><div className="metric-caption">{formatNumber(today.critical_errors)} críticos</div></article>
      </section>

      <section className="grid-3">
        <article className="card panel">
          <div className="panel-head"><h3>RIMURU STATUS</h3><span className={`state ${status === 'online' ? 'ok' : status === 'degraded' ? 'warn' : 'bad'}`}>{status.toUpperCase()}</span></div>
          <div className="system-list">
            <div className="row"><div><strong>Uptime</strong><small>tempo desde a inicialização</small></div><b>{uptime(instance?.started_at)}</b></div>
            <div className="row"><div><strong>Latência</strong><small>gateway / runtime</small></div><b>{instance?.latency_ms == null ? '—' : `${instance.latency_ms}ms`}</b></div>
            <div className="row"><div><strong>Fila</strong><small>profundidade mais recente</small></div><b>{metric?.queue_depth ?? '—'}</b></div>
            <div className="row"><div><strong>Banco</strong><small>latência de consulta</small></div><b>{metric?.db_latency_ms == null ? '—' : `${Math.round(metric.db_latency_ms)}ms`}</b></div>
          </div>
        </article>

        <article className="card panel">
          <div className="panel-head"><h3>SYSTEM HEALTH</h3><span className="muted">dados reais</span></div>
          {metric ? <div className="system-list">
            <div className="row"><strong>CPU</strong><b>{metric.cpu_percent == null ? '—' : `${metric.cpu_percent}%`}</b></div>
            <div className="row"><strong>RAM</strong><b>{metric.memory_mb == null ? '—' : `${Math.round(metric.memory_mb)} MB`}</b></div>
            <div className="row"><strong>Comandos/min</strong><b>{metric.commands_per_min ?? '—'}</b></div>
            <div className="row"><strong>Erros/min</strong><b>{metric.errors_per_min ?? '—'}</b></div>
          </div> : <div className="empty">Aguardando o primeiro pacote de telemetria do Rimuru.</div>}
        </article>

        <article className="card panel">
          <div className="panel-head"><h3>Alertas recentes</h3><span className="muted">{today.open_alerts || 0} abertos</span></div>
          {alerts.length ? <div className="alert-list">{alerts.map((a: any) => <div className="row" key={a.id}><div><strong>{a.title}</strong><small>{a.service} • {a.message || a.status}</small></div><span className={`state ${a.severity === 'critical' ? 'bad' : a.severity === 'warning' ? 'warn' : 'ok'}`}>{a.severity}</span></div>)}</div> : <div className="empty">Nenhum alerta registrado.</div>}
        </article>
      </section>

      <section className="grid-3">
        <article className="card panel" style={{ gridColumn: 'span 2' }}>
          <div className="panel-head"><h3>Comandos mais usados • 7 dias</h3></div>
          {top.length ? <div className="command-list">{top.map((cmd: any, index: number) => <div className="row" key={cmd.name}><div><strong>{index + 1}. {cmd.name}</strong><small>{cmd.success_rate ?? '—'}% de sucesso • {cmd.avg_duration_ms ?? '—'}ms médio</small></div><b>{formatNumber(Number(cmd.executions))}</b></div>)}</div> : <div className="empty">Ainda não há execuções suficientes para montar o ranking.</div>}
        </article>
        <article className="card panel">
          <div className="panel-head"><h3>Incidentes</h3></div>
          <div className="metric-value">{formatNumber(snapshot?.health?.open_incidents)}</div>
          <p className="muted">incidentes em investigação, identificados ou monitorando</p>
        </article>
      </section>
    </>
  );
}
