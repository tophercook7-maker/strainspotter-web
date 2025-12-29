"use client";

export default function HeroImage() {
  return (
    <div 
      className="absolute inset-0 bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: "url('/brand/strainspotter-hero.png')",
        zIndex: 0,
      }}
    />
  );
}

