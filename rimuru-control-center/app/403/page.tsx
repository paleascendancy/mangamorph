export default function ForbiddenPage() {
  return <main className="login-side"><section className="login-card"><span className="eyebrow">403 • ACESSO NEGADO</span><h2>Conta sem autorização</h2><p className="muted">Sua sessão é válida, mas esta conta não possui permissão para acessar o Rimuru Control Center.</p><a className="secondary-btn" style={{display:'block',textAlign:'center'}} href="/login">Voltar ao login</a></section></main>;
}
