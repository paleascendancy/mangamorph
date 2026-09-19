import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (claimsError || !userId) {
    return NextResponse.redirect(new URL('/auth?error=session', url.origin));
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({ id: userId }, { onConflict: 'id', ignoreDuplicates: true });

  const { error: roleError } = await supabase
    .from('user_roles')
    .upsert({ user_id: userId, role: 'user' }, { onConflict: 'user_id', ignoreDuplicates: true });

  if (profileError || roleError) {
    return NextResponse.redirect(new URL('/auth?error=bootstrap', url.origin));
  }

  return NextResponse.redirect(new URL('/', url.origin));
}
