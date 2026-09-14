'use client';

import { FormEvent, useState } from 'react';
import { createBrowserSupabase } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
  const [email,setEmail] = useState('');
  const [sent,setSent] = useState(false);
  const [loading,setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    const supabase = createBrowserSupabase();
    await supabase.auth.resetPasswordForEmail(email,{ redirectTo: `${window.location.origin}/reset-password` });
    setSent(true);
    setLoading(false);
  }

  return <main className="login-side"><form className="login-card" onSubmit={submit}><span className="eyebrow">RIMURU • RECUPERAÇÃO</span><h2>Recuperar acesso</h2><p className="muted">Informe o e-mail administrativo.</p>{sent ? <div className="empty">Se existir uma conta associada a este e-mail, enviaremos as instruções de recuperação.</div> : <><div className="field"><label htmlFor="email">E-mail</label><input id="email" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} /></div><button className="primary-btn" disabled={loading}>{loading ? 'Enviando…' : 'Enviar link'}</button></>}<a className="secondary-btn" style={{display:'block',textAlign:'center'}} href="/login">Voltar ao login</a></form></main>;
}
