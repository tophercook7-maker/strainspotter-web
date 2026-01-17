import "./globals.css";

export const metadata = {
  title: 'StrainSpotter AI',
  applicationName: 'StrainSpotter AI',
  description: 'StrainSpotter AI is a living cannabis intelligence ecosystem.',
  openGraph: {
    title: 'StrainSpotter AI',
    siteName: 'StrainSpotter AI',
    description: 'StrainSpotter AI is a living cannabis intelligence ecosystem.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-black text-white">
        {children}
      </body>
    </html>
  );
}
