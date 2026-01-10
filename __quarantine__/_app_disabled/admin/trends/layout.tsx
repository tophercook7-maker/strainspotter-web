import { ReactNode } from 'react';
import { requireAdmin } from '@/lib/adminAuth';

export default async function TrendsAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Require admin access
  await requireAdmin();

  return <>{children}</>;
}

