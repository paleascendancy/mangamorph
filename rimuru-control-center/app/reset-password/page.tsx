'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabase } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password,setPassword] = useState('');
  const [confirm,setConfirm] = useState('');
  const [error,setError] = useState('');
  const [loading,setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8 || password !== confirm) {
      setError(password !== confirm ? 'As senhas não coincidem.' : 'Use uma senha com pelo menos 8 caracteres.');
      return;
    }
    setLoading(true); setError('');
    const supabase = createBrowserSupabase();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { setError('Não foi possível atualizar sua senha. Solicite um novo link.'); setLoading(false); return; }
    router.replace('/dashboard');
  }

  return <main className="login-side"><form className="login-card" onSubmit={submit}><span className="eyebrow">RIMURU • SEGURANÇA</span><h2>Definir nova senha</h2><div className="field"><label htmlFor="password">Nova senha</label><input id="password" type="password" autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} required /></div><div className="field"><label htmlFor="confirm">Confirmar senha</label><input id="confirm" type="password" autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)} required /></div>{error ? <div className="error-box" role="alert">{error}</div>:null}<button className="primary-btn" disabled={loading}>{loading ? 'Atualizando…' : 'Atualizar senha'}</button></form></main>;
}
