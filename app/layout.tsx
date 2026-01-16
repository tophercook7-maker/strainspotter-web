import "./globals.css";

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
        {children}
      </body>
    </html>
  );
}
