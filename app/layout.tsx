import "./globals.css";
import { PortalProvider } from "./components/portal/PortalController";
import AuroraAtmosphere from "@/components/AuroraAtmosphere";
import ResponsiveShell from "@/components/layout/ResponsiveShell";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import DesktopTestBuildIndicator from "@/components/DesktopTestBuildIndicator";
import DesktopAccessGate from "@/components/DesktopAccessGate";
import DesktopURLLoader from "@/components/DesktopURLLoader";
// Splash animation intentionally disabled until branded video asset exists
// TODO: Add branded splash animation (v2 branding pass)
// import SplashScreen from "./components/SplashScreen";
// Startup sound intentionally disabled until branded audio asset exists
// TODO: Add startup sound (v2 branding pass)
// import BootSound from "./components/BootSound";

console.log("Botanical OS layout loaded with hero + background.");

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/brand/logos/botanical-logo-mark.svg" />
        <link rel="apple-touch-icon" href="/brand/logos/botanical-logo-mark.svg" />
      </head>
      <body
        className="
          min-h-screen
          bg-[url('/brand/core/strainspotter-bg.jpg')]
          bg-cover bg-center bg-fixed
          text-white
          antialiased
          font-sans
        "
      >
        {/* Splash animation intentionally disabled until branded video asset exists */}
        {/* <SplashScreen /> */}
        {/* Startup sound intentionally disabled until branded audio asset exists */}
        {/* <BootSound /> */}
        <AuthProvider>
          <PortalProvider>
            <AuroraAtmosphere />
            <DesktopURLLoader />
            <DesktopAccessGate>
              <ResponsiveShell>{children}</ResponsiveShell>
            </DesktopAccessGate>
            <DesktopTestBuildIndicator />
          </PortalProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
