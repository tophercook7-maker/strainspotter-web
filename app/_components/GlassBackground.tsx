export function GlassBackground() {
  return (
    <>
      {/* Background image */}
      <div className="fixed inset-0 -z-20 bg-[url('/images/cannabis-bg.jpg')] bg-cover bg-center" />
      {/* Dark glass overlay */}
      <div className="fixed inset-0 -z-10 bg-black/45 backdrop-blur-[2px]" />
    </>
  );
}
