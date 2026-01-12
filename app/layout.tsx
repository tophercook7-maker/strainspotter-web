import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="m-0 p-0 min-h-screen w-full bg-transparent overflow-auto">
        {children}
      </body>
    </html>
  );
}
