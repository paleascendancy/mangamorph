import { notFound } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';

const TITLES: Record<string, [string,string]> = {
  monitoramento: ['Monitoramento','Telemetria operacional e sinais do runtime em tempo real.'],
  analytics: ['Analytics','Tendências de uso, sucesso, erros e performance.'],
  usuarios: ['Usuários','Atividade agregada com minimização de dados.'],
  grupos: ['Grupos','Atividade dos grupos identificada por hash, sem expor dados desnecessários.'],
  comandos: ['Comandos','Uso, taxa de sucesso e latência por comando.'],
  logs: ['Logs','Eventos operacionais paginados e filtráveis.'],
  erros: ['Error Center','Erros agrupados por fingerprint, severidade e serviço.'],
  incidentes: ['Incident Center','Incidentes, impacto, causa e resolução.'],
  banco: ['Database Health','Saúde das métricas de banco registradas pela telemetria.'],
  infraestrutura: ['Infrastructure','CPU, memória, filas e latência do runtime.'],
  seguranca: ['Segurança','Auditoria administrativa e postura de acesso.'],
  configuracoes: ['Configurações','Preferências e controles administrativos do Rimuru.']
};

export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const meta = TITLES[section];
  if (!meta) notFound();
  const supabase = await createServerSupabase();

  let body: React.ReactNode = <div className="empty">Esta seção está pronta para receber dados do Rimuru assim que a telemetria correspondente for enviada.</div>;

  if (section === 'comandos') {
    const { data } = await supabase.from('rimuru_commands').select('name,category,description,enabled,updated_at').order('name').limit(100);
    body = data?.length ? <table className="data-table"><thead><tr><th>Nome</th><th>Categoria</th><th>Descrição</th><th>Status</th><th>Atualizado</th></tr></thead><tbody>{data.map(c => <tr key={c.name}><td><strong>{c.name}</strong></td><td>{c.category}</td><td>{c.description || '—'}</td><td><span className={`state ${c.enabled ? 'ok':'bad'}`}>{c.enabled ? 'Ativo':'Desativado'}</span></td><td>{new Date(c.updated_at).toLocaleString('pt-BR')}</td></tr>)}</tbody></table> : <div className="empty">Nenhum comando catalogado ainda.</div>;
  }

  if (section === 'erros') {
    const { data } = await supabase.from('rimuru_error_events').select('id,severity,service,operation,message,occurrence_count,last_seen_at,resolved_at').order('last_seen_at',{ascending:false}).limit(50);
    body = data?.length ? <table className="data-table"><thead><tr><th>Severidade</th><th>Serviço</th><th>Operação</th><th>Mensagem</th><th>Ocorrências</th><th>Última</th></tr></thead><tbody>{data.map(e => <tr key={e.id}><td><span className={`state ${e.severity === 'critical' || e.severity === 'error' ? 'bad' : e.severity === 'warning' ? 'warn':'ok'}`}>{e.severity}</span></td><td>{e.service}</td><td>{e.operation || '—'}</td><td>{e.message}</td><td>{e.occurrence_count}</td><td>{new Date(e.last_seen_at).toLocaleString('pt-BR')}</td></tr>)}</tbody></table> : <div className="empty">Nenhum erro registrado.</div>;
  }

  if (section === 'incidentes') {
    const { data } = await supabase.from('rimuru_incidents').select('id,title,service,impact,status,started_at,ended_at').order('started_at',{ascending:false}).limit(50);
    body = data?.length ? <table className="data-table"><thead><tr><th>Título</th><th>Serviço</th><th>Impacto</th><th>Status</th><th>Início</th></tr></thead><tbody>{data.map(i => <tr key={i.id}><td><strong>{i.title}</strong></td><td>{i.service}</td><td>{i.impact || '—'}</td><td><span className={`state ${i.status === 'resolved' ? 'ok' : i.status === 'monitoring' ? 'warn':'bad'}`}>{i.status}</span></td><td>{new Date(i.started_at).toLocaleString('pt-BR')}</td></tr>)}</tbody></table> : <div className="empty">Nenhum incidente registrado.</div>;
  }

  if (section === 'logs') {
    const { data } = await supabase.from('rimuru_bot_events').select('id,event_type,severity,service,request_id,occurred_at').order('occurred_at',{ascending:false}).limit(50);
    body = data?.length ? <table className="data-table"><thead><tr><th>Data</th><th>Nível</th><th>Serviço</th><th>Evento</th><th>Request ID</th></tr></thead><tbody>{data.map(e => <tr key={e.id}><td>{new Date(e.occurred_at).toLocaleString('pt-BR')}</td><td>{e.severity}</td><td>{e.service}</td><td>{e.event_type}</td><td>{e.request_id || '—'}</td></tr>)}</tbody></table> : <div className="empty">Nenhum evento registrado.</div>;
  }

  if (section === 'seguranca') {
    const { data } = await supabase.from('rimuru_audit_logs').select('id,action,resource_type,resource_id,result,created_at').order('created_at',{ascending:false}).limit(50);
    body = data?.length ? <table className="data-table"><thead><tr><th>Data</th><th>Ação</th><th>Recurso</th><th>Resultado</th></tr></thead><tbody>{data.map(a => <tr key={a.id}><td>{new Date(a.created_at).toLocaleString('pt-BR')}</td><td>{a.action}</td><td>{a.resource_type}{a.resource_id ? ` • ${a.resource_id}`:''}</td><td>{a.result}</td></tr>)}</tbody></table> : <div className="empty">Nenhuma ação administrativa registrada ainda.</div>;
  }

  if (['monitoramento','infraestrutura','banco'].includes(section)) {
    const { data } = await supabase.from('rimuru_system_metrics').select('*').order('recorded_at',{ascending:false}).limit(24);
    const latest = data?.[0];
    body = latest ? <div className="metrics"><article className="card metric"><div className="metric-label">CPU</div><div className="metric-value">{latest.cpu_percent ?? '—'}{latest.cpu_percent != null ? '%':''}</div></article><article className="card metric"><div className="metric-label">RAM</div><div className="metric-value">{latest.memory_mb == null ? '—' : `${Math.round(latest.memory_mb)} MB`}</div></article><article className="card metric"><div className="metric-label">DB LATENCY</div><div className="metric-value">{latest.db_latency_ms == null ? '—' : `${Math.round(latest.db_latency_ms)}ms`}</div></article><article className="card metric"><div className="metric-label">QUEUE</div><div className="metric-value">{latest.queue_depth ?? '—'}</div></article></div> : <div className="empty">Ainda não recebemos métricas de infraestrutura.</div>;
  }

  if (section === 'analytics') {
    const { data } = await supabase.from('rimuru_daily_metrics').select('*').order('day',{ascending:false}).limit(30);
    body = data?.length ? <table className="data-table"><thead><tr><th>Dia</th><th>Comandos</th><th>Usuários</th><th>Grupos</th><th>Erros</th><th>Latência</th></tr></thead><tbody>{data.map(d => <tr key={`${d.day}-${d.instance_id}`}><td>{d.day}</td><td>{d.commands}</td><td>{d.unique_users}</td><td>{d.active_groups}</td><td>{d.failed_commands}</td><td>{d.avg_latency_ms == null ? '—' : `${Math.round(d.avg_latency_ms)}ms`}</td></tr>)}</tbody></table> : <div className="empty">As métricas diárias aparecerão aqui após a agregação começar.</div>;
  }

  if (section === 'usuarios' || section === 'grupos') {
    body = <div className="empty">Por privacidade, esta área não lista dados pessoais brutos. Ela será alimentada por identificadores pseudonimizados e métricas agregadas da telemetria do Rimuru.</div>;
  }

  return <section className="section-page"><div className="section-header"><span className="eyebrow">RIMURU CONTROL CENTER</span><h2>{meta[0]}</h2><p className="muted">{meta[1]}</p></div><div className="card panel">{body}</div></section>;
}
