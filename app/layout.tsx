import "./globals.css";
import { DatabaseInitializer } from "@/lib/scanner/dbInitializer";

export const metadata = {
  title: "StrainSpotter",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen w-screen overflow-x-hidden">
        <DatabaseInitializer />
        {children}
      </body>
    </html>
  );
}
