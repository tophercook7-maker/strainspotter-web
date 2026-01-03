/**
 * Garden Layout
 * Provides Garden-specific background only.
 * Navigation comes from ResponsiveShell (via ConditionalAppShell).
 */
'use client';

export default function GardenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div 
      className="min-h-screen"
      data-garden-layout
      style={{ 
        backgroundImage: 'url("/backgrounds/strainspotter-bg.png")',
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
        backgroundAttachment: 'fixed',
        backgroundRepeat: 'no-repeat',
        backgroundColor: '#000',
        transform: 'none',
      }}
    >
      {/* Dark Overlay */}
      <div 
        className="min-h-screen bg-black/40"
        data-garden-content
      >
        {children}
      </div>
    </div>
  );
}
