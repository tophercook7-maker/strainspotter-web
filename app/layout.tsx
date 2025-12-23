import type { Metadata } from "next";
import "./globals.css";
import { PortalProvider } from "./components/portal/PortalController";
import AuroraAtmosphere from "@/components/AuroraAtmosphere";
import ResponsiveShell from "@/components/layout/ResponsiveShell";

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
        <PortalProvider>
          <AuroraAtmosphere />
          <div className="min-h-screen relative z-10" style={{ background: 'transparent' }}>
            <ResponsiveShell>{children}</ResponsiveShell>
          </div>
        </PortalProvider>
      </body>
    </html>
  );
}
