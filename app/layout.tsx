import type { Metadata } from "next";
import "./globals.css";
import { PortalProvider } from "./components/portal/PortalController";
import ResponsiveShell from "@/components/layout/ResponsiveShell";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import AuthWall from "@/components/AuthWall";
import DesktopRefreshButton from "@/components/DesktopRefreshButton";
import "./service-worker-unregister";

export const metadata: Metadata = {
  title: "StrainSpotter",
  description: "Cannabis strain identification and tracking",
  icons: {
    icon: "/brand/leaf-icon.png",
    apple: "/brand/leaf-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen" style={{ margin: 0, padding: 0 }}>
        <AuthProvider>
          <AuthWall>
            <PortalProvider>
              <ResponsiveShell>{children}</ResponsiveShell>
            </PortalProvider>
          </AuthWall>
        </AuthProvider>
        <DesktopRefreshButton />
      </body>
    </html>
  );
}
