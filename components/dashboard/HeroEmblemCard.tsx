"use client";

import Image from "next/image";



export default function HeroEmblemCard() {

  return (

    <div className="hero-emblem-card">

      <div className="hero-glow"></div>

      <div className="hero-ring"></div>



      <Image

        src="/brand/strainspotter-mark.png"

        alt="StrainSpotter"

        width={160}

        height={160}

        className="hero-emblem"

      />



      <h2 className="hero-title">Welcome to the Garden</h2>

      <p className="hero-subtitle">Your cannabis intelligence hub</p>

    </div>

  );

}
