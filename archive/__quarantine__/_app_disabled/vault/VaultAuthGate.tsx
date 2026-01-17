/**
 * Vault Authentication Gate
 * Redirects non-admin users
 */

import { getUser } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function VaultAuthGate({ children }: { children: React.ReactNode }) {
  const user = await getUser();

  if (!user) {
    redirect('/login');
  }

  if (user.role !== 'admin') {
    redirect('/garden');
  }

  return <>{children}</>;
}
