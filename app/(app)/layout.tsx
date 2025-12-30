import ConditionalAppShell from "../components/ConditionalAppShell";

/**
 * App layout - wraps all protected routes with ConditionalAppShell
 * Login page is in (public) route group and will NEVER touch this file
 */
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ConditionalAppShell>{children}</ConditionalAppShell>;
}
