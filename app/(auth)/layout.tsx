export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <body
        style={{
          background: "radial-gradient(circle at top, #062B18, #020B05)",
          minHeight: "100vh",
        }}
      >
        {children}
      </body>
    </html>
  );
}

