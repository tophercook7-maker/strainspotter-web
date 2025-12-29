import type { Metadata } from "next";
import "./globals.css";
import { PortalProvider } from "./components/portal/PortalController";
import AuroraAtmosphere from "@/components/AuroraAtmosphere";
import ResponsiveShell from "@/components/layout/ResponsiveShell";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import AuthWall from "@/components/AuthWall";
import "./service-worker-unregister";

export const metadata: Metadata = {
  title: "StrainSpotter",
  description: "Cannabis strain identification and tracking",
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
      </body>
    </html>
  );
}
