import "./globals.css";
import AgeGate from "@/components/AgeGate";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-black text-white">
        <div style={{ background: 'purple', color: 'white', padding: 6, textAlign: 'center' }}>
          ACTIVE LAYOUT: app/layout.tsx
        </div>
        <AgeGate>{children}</AgeGate>
      </body>
    </html>
  );
}
