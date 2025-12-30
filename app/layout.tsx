import type { Metadata } from "next";
import "./globals.css";
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

/**
 * Root layout - DUMB wrapper only
 * NO auth logic
 * NO ConditionalAppShell
 * NO redirects
 * Login is in (public) route group and will NEVER touch ConditionalAppShell
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Block background image on login page immediately */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (window.location.pathname === '/login') {
                document.documentElement.style.setProperty('background-image', 'none', 'important');
                document.documentElement.style.setProperty('background-color', '#000000', 'important');
                document.body.style.setProperty('background-image', 'none', 'important');
                document.body.style.setProperty('background-color', '#000000', 'important');
              }
            `,
          }}
        />
      </head>
      <body className="min-h-screen" style={{ margin: 0, padding: 0 }}>
        {children}
        <DesktopRefreshButton />
      </body>
    </html>
  );
}
