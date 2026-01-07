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
        <AgeGate>{children}</AgeGate>
      </body>
    </html>
  );
}
