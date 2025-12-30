export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
          body, html {
            background-image: none !important;
            background-color: #000000 !important;
          }
        `
      }} />
      {children}
    </>
  );
}
