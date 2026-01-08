export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div style={{ background: 'brown', color: 'white', padding: 6, textAlign: 'center' }}>
        ACTIVE LAYOUT: app/(public)/layout.tsx
      </div>
      {children}
    </>
  );
}
