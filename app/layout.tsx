import type { Metadata } from "next";
import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}
