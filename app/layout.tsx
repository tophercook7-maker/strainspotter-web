import type { Metadata } from "next";
import "./globals.css";
import DesktopRefreshButton from "@/components/DesktopRefreshButton";
import "./service-worker-unregister";
import AuthGate from "./AuthGate";

export const metadata: Metadata = {
  title: "StrainSpotter",
  description: "Cannabis strain identification and tracking",
  icons: {
    icon: "/brand/leaf-icon.png",
    apple: "/brand/leaf-icon.png",
  },
};

/**
 * Root layout - Desktop-safe wrapper
 * AuthGate prevents white screen / reload loop
 * Login is in (public) route group and will NEVER touch ConditionalAppShell
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen" style={{ margin: 0, padding: 0 }}>
        <AuthGate>
          {children}
          <DesktopRefreshButton />
        </AuthGate>
      </body>
    </html>
  );
}
