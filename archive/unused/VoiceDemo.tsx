"use client";

import React, { useState, useRef } from "react";
import { motion } from "framer-motion";

export default function VoiceDemo() {
  const [open, setOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handlePlay = () => {
    setOpen(true);
    setTimeout(() => { audioRef.current?.play(); }, 350);
  };

  const handleClose = () => {
    setOpen(false);
    audioRef.current?.pause();
    audioRef.current!.currentTime = 0;
  };

  return (
    <>
      <button
        onClick={handlePlay}
        className="px-8 py-4 rounded-full border border-gold text-gold text-lg 
        hover:bg-gold hover:text-black transition-all duration-300 shadow-lg"
      >
        🎧 Hear the AI Voice Demo
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999]">
          <div className="bg-black border border-gold/40 rounded-2xl p-10 w-[90%] max-w-xl relative shadow-[0_0_45px_rgba(16,255,180,0.4)]">
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-gold text-xl hover:text-white"
            >
              ✕
            </button>

            <h2 className="text-gold text-3xl font-bold mb-4">
              AI Voice Experience
            </h2>

            <p className="text-green-100 mb-6 opacity-90">
              This is a sample voiceover from StrainSpotter's AI assistant.
            </p>

            <audio
              ref={audioRef}
              src="/audio/voice-demo.mp3"
              preload="auto"
            />

            <div className="flex space-x-2 justify-center mt-6">
              {Array.from({ length: 20 }).map((_, i) => (
                <motion.div
                  key={i}
                  animate={{
                    height: [
                      "10px",
                      `${Math.random() * 50 + 20}px`,
                      "10px",
                    ],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 0.6 + Math.random(),
                    ease: "easeInOut",
                  }}
                  className="w-1 bg-gold rounded"
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
