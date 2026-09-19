import type { ReactNode } from 'react';
import { requireAdmin } from '../../lib/admin/require-admin';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin();
  return children;
}
