'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabase } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function validateAdmin(userId: string) {
    const supabase = createBrowserSupabase();
    const { data } = await supabase.from('admin_users').select('user_id').eq('user_id', userId).maybeSingle();
    return Boolean(data);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (loading) return;
    setError('');
    setLoading(true);
    const supabase = createBrowserSupabase();
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError || !data.user) {
      setError('Não foi possível entrar. Verifique seus dados e tente novamente.');
      setLoading(false);
      return;
    }
    if (!(await validateAdmin(data.user.id))) {
      await supabase.auth.signOut();
      setError('Esta conta não possui autorização para acessar o Rimuru Control Center.');
      setLoading(false);
      return;
    }
    router.replace('/dashboard');
    router.refresh();
  }

  async function google() {
    setError('');
    const supabase = createBrowserSupabase();
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
    if (error) setError('Não foi possível iniciar o login com Google.');
  }

  return (
    <main className="login-page">
      <section className="login-art" aria-label="Apresentação do Rimuru Control Center">
        <div className="login-copy">
          <span className="eyebrow">RIMURU CONTROL CENTER</span>
          <h1>RIMURU</h1>
          <p><strong style={{ color: '#fff' }}>Controle. Inteligência. Performance.</strong><br />Gerencie, monitore e evolua toda a infraestrutura do Rimuru em um único lugar.</p>
        </div>
        <div className="login-copy"><span className="eyebrow">Observe. Controle. Evolua.</span></div>
        <div className="login-features">
          <div className="feature"><strong>MONITORAMENTO</strong><small>Acompanhe o Rimuru em tempo real.</small></div>
          <div className="feature"><strong>CONTROLE</strong><small>Gerencie comandos, serviços e configurações.</small></div>
          <div className="feature"><strong>SEGURANÇA</strong><small>Acesso administrativo protegido e auditável.</small></div>
        </div>
      </section>

      <section className="login-side">
        <form className="login-card" onSubmit={submit} aria-busy={loading}>
          <div className="brand-mark">R</div>
          <h2>Bem-vindo de volta</h2>
          <p className="muted">Entre para acessar o Rimuru Control Center.</p>
          <span className="badge">Área administrativa protegida</span>

          <div className="field">
            <label htmlFor="email">E-mail</label>
            <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" autoComplete="email" required disabled={loading} />
          </div>
          <div className="field">
            <label htmlFor="password">Senha</label>
            <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Sua senha" autoComplete="current-password" required disabled={loading} />
          </div>

          <div className="login-tools">
            <label><input type="checkbox" /> Manter conectado</label>
            <a href="/forgot-password">Esqueci minha senha</a>
          </div>
          {error ? <div className="error-box" role="alert">{error}</div> : null}
          <button className="primary-btn" type="submit" disabled={loading}>{loading ? 'Entrando…' : 'ACESSAR PAINEL'}</button>
          <div className="divider">OU</div>
          <button className="secondary-btn" type="button" onClick={google} disabled={loading}>Continuar com Google</button>
        </form>
      </section>
    </main>
  );
}
