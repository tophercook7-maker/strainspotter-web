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
      <body
        className="
          bg-black text-white
          min-h-screen w-screen
          overflow-hidden
        "
      >
        <div className="w-full min-h-screen flex flex-col items-center justify-start pt-12">
          {children}
        </div>
      </body>
    </html>
  );
}
