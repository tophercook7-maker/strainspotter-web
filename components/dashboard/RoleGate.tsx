// components/dashboard/RoleGate.tsx

"use client";

import { ReactNode } from "react";

type Props = {
  children: ReactNode;
  allowed?: string[];
};

export default function RoleGate({
  children,
  allowed,
}: Props) {

  if (!allowed || allowed.length === 0) return children;



  // Will be improved once auth context is added

  return <>{children}</>;

}
