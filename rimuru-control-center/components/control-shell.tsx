'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createBrowserSupabase } from '@/lib/supabase/client';

const items = [
  ['⌂','Dashboard','/dashboard'],
  ['◈','Rimuru OS','/dashboard/controle'],
  ['◉','Monitoramento','/dashboard/monitoramento'],
  ['▥','Analytics','/dashboard/analytics'],
  ['♙','Usuários','/dashboard/usuarios'],
  ['♟','Grupos','/dashboard/grupos'],
  ['▦','Servidores','/dashboard/servidores'],
  ['⌘','Comandos','/dashboard/comandos'],
  ['⚑','Feature Flags','/dashboard/feature-flags'],
  ['▤','Logs','/dashboard/logs'],
  ['!','Erros','/dashboard/erros'],
  ['△','Incidentes','/dashboard/incidentes'],
  ['◫','Banco de Dados','/dashboard/banco'],
  ['▣','Infraestrutura','/dashboard/infraestrutura'],
  ['◇','Segurança','/dashboard/seguranca'],
  ['⚙','Configurações','/dashboard/configuracoes']
] as const;

export function ControlShell({ children, adminName, role, status = 'offline' }: { children: React.ReactNode; adminName: string; role: string; status?: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    const supabase = createBrowserSupabase();
    await supabase.auth.signOut();
    router.replace('/login');
    router.refresh();
  }

  const active = (href: string) => pathname === href || (href !== '/dashboard' && pathname.startsWith(`${href}/`));

  return (
    <div className="shell">
      <aside className="sidebar" aria-label="Navegação principal">
        <div className="brand">
          <div className="brand-mark" aria-hidden>R</div>
          <div className="brand-copy"><strong>RIMURU</strong><small>Control Center</small></div>
        </div>
        <nav className="nav">
          {items.map(([icon,label,href]) => (
            <Link key={href} className={active(href) ? 'active' : ''} href={href} title={label}>
              <b aria-hidden>{icon}</b><span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="profile">
            <div className="avatar">R</div>
            <div className="profile-copy"><strong>{adminName}</strong><small>{role}</small></div>
          </div>
          <button onClick={logout} className="secondary-btn" style={{ marginTop: 10 }}>Sair</button>
        </div>
      </aside>
      <main className="main">
        <header className="header">
          <div><h1>{pathname === '/dashboard' ? 'Dashboard' : pathname.includes('/controle') ? 'Rimuru OS' : 'Rimuru Control Center'}</h1></div>
          <div className="header-actions">
            <input className="search" aria-label="Pesquisar" placeholder="Buscar usuários, grupos, comandos…" />
            <span className="status-pill"><span className={`dot ${status}`}></span> Rimuru {status === 'online' ? 'Online' : status === 'degraded' ? 'Instável' : 'Offline'}</span>
            <div className="avatar" title={`${adminName} • ${role}`}>R</div>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
