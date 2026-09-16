import './globals.css';
import { SiteHeader } from '../components/layout/SiteHeader';

export const metadata = { title: 'MangaMorph', description: 'MangaMorph' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body><SiteHeader/><main className="page-shell">{children}</main></body></html>;
}