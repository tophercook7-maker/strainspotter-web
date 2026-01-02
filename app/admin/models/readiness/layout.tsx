import { ReactNode } from 'react';
import { requireAdmin } from '@/lib/adminAuth';

export default async function ModelReadinessLayout({
  children,
}: {
  children: ReactNode;
}) {
  // This will redirect to /login or /garden if the user is not an admin
  await requireAdmin();

  return <>{children}</>;
}

