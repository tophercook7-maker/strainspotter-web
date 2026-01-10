'use client';

import Image from 'next/image';
import Link from 'next/link';

export default function FeaturedStrains() {
  const featured = [
    { name: 'Blue Dream', slug: 'blue-dream', type: 'Sativa' },
    { name: 'OG Kush', slug: 'og-kush', type: 'Hybrid' },
    { name: 'Girl Scout Cookies', slug: 'gsc', type: 'Hybrid' },
  ];

  return (
    <div className="space-y-3">
      {featured.map((strain) => (
        <Link
          key={strain.slug}
          href={`/strain/${strain.slug}`}
          className="block p-3 rounded-lg bg-black/30 border border-green-500/20 hover:border-green-400/40 transition flex items-center gap-3"
        >
          {/* Hero image - 44px × 44px, centered */}
          <div 
            className="flex-shrink-0 flex items-center justify-center"
            style={{
              width: '44px',
              height: '44px',
              backgroundColor: '#000',
              border: '1px solid rgba(16,255,180,0.45)',
              boxShadow: '0 0 12px rgba(16,255,180,0.55)',
              borderRadius: '50%',
            }}
          >
            <Image
              src="/emblem/hero-small.png"
              alt="Strain hero"
              width={44}
              height={44}
              style={{ objectFit: 'contain' }}
            />
          </div>

          <div className="flex-1 flex items-center justify-between">
            <div>
              <p className="font-semibold text-green-100">{strain.name}</p>
              <p className="text-xs text-green-200/70">{strain.type}</p>
            </div>
            <span className="text-green-300">→</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
