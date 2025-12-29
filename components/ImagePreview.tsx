'use client';

import Image from 'next/image';

interface ImagePreviewProps {
  src: string | null;
  alt?: string;
  className?: string;
}

export default function ImagePreview({ src, alt = 'Preview', className }: ImagePreviewProps) {
  if (!src || src === 'undefined' || src === 'null') {
    return (
      <div
        className={`bg-gray-800 rounded-lg flex items-center justify-center ${className || ''}`}
        style={{ minHeight: '200px', minWidth: '200px' }}
      >
        <span className="text-gray-500">No image</span>
      </div>
    );
  }

  // Handle data URLs (previews) and regular URLs
  const isDataUrl = src.startsWith('data:');
  
  if (isDataUrl) {
    return (
      <div className={`relative rounded-lg overflow-hidden ${className || ''}`}>
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div className={`relative rounded-lg overflow-hidden ${className || ''}`}>
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        unoptimized={src.includes('supabase.co')} // Supabase URLs may need unoptimized
      />
    </div>
  );
}

