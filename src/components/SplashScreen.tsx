'use client';

import { useEffect, useRef, useState } from 'react';

const FALLBACK_MS = 11000;

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const [fadingOut, setFadingOut] = useState(false);
  const finishedRef = useRef(false);

  function finish() {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setFadingOut(true);
    setTimeout(onFinish, 400);
  }

  useEffect(() => {
    const fallback = setTimeout(finish, FALLBACK_MS);
    return () => clearTimeout(fallback);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-end justify-center bg-black transition-opacity duration-500 ${
        fadingOut ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
    >
      <video
        className="absolute inset-0 h-full w-full object-cover"
        src="/splash.mp4"
        autoPlay
        muted
        playsInline
        onEnded={finish}
        onError={finish}
      />
      {/* Video already ends with "VICIOUS suite" branding baked in,
          so only the license paragraph is overlaid here. */}
      <footer className="relative z-10 px-8 pb-10 text-center">
        <p className="text-[11px] leading-relaxed text-white/40">
          Licensed for personal use only. Unauthorized reproduction, distribution, or
          modification of this software or its contents is strictly prohibited without
          express permission from the developer.
        </p>
      </footer>
    </div>
  );
}
