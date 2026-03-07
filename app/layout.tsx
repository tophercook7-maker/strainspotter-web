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
      <body className="min-h-screen bg-black text-white antialiased">
        <DatabaseInitializer />

        {/* Force centering */}
        <div className="min-h-screen w-full flex justify-center">
          <div className="w-full max-w-6xl px-4 sm:px-6 lg:px-10 pt-4 sm:pt-6 pb-28">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
