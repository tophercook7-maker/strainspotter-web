/**
 * Admin Vault Layout
 * Protects vault admin routes with admin authentication
 */

import { requireAdmin } from '@/lib/adminAuth';
import { redirect } from 'next/navigation';

export default async function VaultAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireAdmin();
  } catch (error) {
    // Redirect to login if not authenticated or not admin
    redirect('/login');
  }

  return <>{children}</>;
}
