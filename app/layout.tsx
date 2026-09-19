import './globals.css';
import { SiteHeader } from '../components/layout/SiteHeader';
import { SiteFooter } from '../components/layout/SiteFooter';
import { createClient } from '../lib/supabase/server';

export const metadata = {
  title: 'MangaMorph',
  description: 'MangaMorph',
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;

  let role: 'user' | 'admin' | null = null;

  if (userId) {
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    role = roleData?.role ?? 'user';
  }

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <SiteHeader isAuthenticated={Boolean(userId)} role={role} />
        <main className="page-shell">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
