'use server';

import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase/server';

function readCredentials(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  if (!email || password.length < 8) redirect('/auth?error=invalid');
  return { email, password };
}

export async function signIn(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(readCredentials(formData));
  if (error) redirect('/auth?error=login');
  redirect('/');
}

export async function signUp(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp(readCredentials(formData));
  if (error) redirect('/auth?error=signup');
  redirect('/auth?message=check-email');
}

export async function signInWithGoogle() {
  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://mangamorph-alpha.vercel.app';
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${siteUrl}/auth/callback` },
  });
  if (error || !data.url) redirect('/auth?error=google');
  redirect(data.url);
}
