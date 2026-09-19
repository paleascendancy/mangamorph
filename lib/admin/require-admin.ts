import { redirect } from 'next/navigation';

// Autenticação administrativa ainda não foi conectada.
// Fail closed: nenhuma página administrativa é exibida até existir uma sessão real.
export async function requireAdmin(): Promise<never> {
  redirect('/');
}
