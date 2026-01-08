export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "radial-gradient(circle at top, #062B18, #020B05)",
        minHeight: "100vh",
        width: "100%",
      }}
    >
      <div style={{ background: 'teal', color: 'white', padding: 6, textAlign: 'center' }}>
        ACTIVE LAYOUT: app/(auth)/layout.tsx
      </div>
      {children}
    </div>
  );
}
