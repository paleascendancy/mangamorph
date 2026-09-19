import { redirect } from 'next/navigation';
import { createClient } from '../supabase/server';

export async function requireAdmin() {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

  const userId = claimsData?.claims?.sub;
  if (claimsError || !userId) redirect('/auth');

  const { data: role, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();

  if (roleError || role?.role !== 'admin') redirect('/');

  return { userId };
}
