'use client';

import { useEffect, useRef } from 'react';

const APK_DOWNLOAD_URL = process.env.NEXT_PUBLIC_APK_URL ?? '/download/cinedrama-latest.apk';

export default function Hero() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        /* autoplay policy — silent fail */
      });
    }
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background video reel */}
      <div className="absolute inset-0 z-0">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover opacity-30"
          autoPlay
          muted
          loop
          playsInline
          poster="/images/hero-poster.jpg"
          aria-hidden="true"
        >
          {/* Replace src with your actual trailer reel */}
          <source src="/videos/trailer-reel.mp4" type="video/mp4" />
        </video>
        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-brand-dark/60 via-brand-dark/40 to-brand-dark" />
        {/* Red glow from top */}
        <div className="absolute inset-0 bg-hero-glow" />
      </div>

      {/* Phone frame mockup - right side */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-72 opacity-20 md:opacity-40 pointer-events-none hidden md:block">
        <div className="relative mx-auto w-56 h-[480px] border-2 border-brand-border rounded-[40px] overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-brand-dark rounded-b-2xl z-10" />
          <div className="w-full h-full bg-gradient-to-b from-brand-card to-brand-dark flex flex-col">
            <div className="flex-1 bg-brand-red/10" />
            <div className="p-3 space-y-2">
              <div className="h-2 w-3/4 bg-brand-border rounded" />
              <div className="h-2 w-1/2 bg-brand-border rounded" />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto pt-20">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-brand-red/10 border border-brand-red/30 text-brand-red text-xs font-semibold px-4 py-1.5 rounded-full mb-6 animate-fade-in">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-red animate-pulse" />
          Now Streaming on Android
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-7xl font-extrabold leading-tight tracking-tight text-balance animate-fade-up">
          Cinematic Short Dramas{' '}
          <span className="text-brand-red">in 2 Minutes</span>
        </h1>

        {/* Subheadline */}
        <p className="mt-6 text-lg md:text-xl text-brand-muted max-w-2xl mx-auto leading-relaxed animate-fade-up animation-delay-200">
          Swipe through gripping Billionaire Revenge, Sci-Fi Thrillers, and
          Romantic Suspense — each episode crafted for your phone, ready to
          watch in one sitting.
        </p>

        {/* Download CTA — THE HERO ACTION */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up animation-delay-400">
          <a
            href={APK_DOWNLOAD_URL}
            download="cinedrama-latest.apk"
            className="group relative inline-flex items-center gap-3 bg-brand-red hover:bg-red-600 text-white font-bold text-lg px-8 py-4 rounded-2xl transition-all duration-200 animate-pulse-glow shadow-lg shadow-brand-red/30 hover:shadow-brand-red/50 hover:scale-105 active:scale-95"
            aria-label="Download CineDrama APK for Android"
          >
            <AndroidIcon className="w-6 h-6" />
            Download Android APK
            <span className="text-xs font-normal opacity-70 ml-1">Free</span>
            {/* Ripple dot */}
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-400 animate-ping" />
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-400" />
          </a>

          <a
            href="#series"
            className="inline-flex items-center gap-2 text-brand-muted hover:text-white border border-brand-border hover:border-white/30 px-6 py-4 rounded-2xl transition-all duration-200 text-sm font-medium"
          >
            <PlayIcon className="w-4 h-4" />
            Watch Trailer
          </a>
        </div>

        {/* Trust signals */}
        <div className="mt-8 flex items-center justify-center gap-6 text-xs text-brand-muted animate-fade-up animation-delay-600">
          <div className="flex items-center gap-1.5">
            <ShieldIcon className="w-4 h-4 text-green-500" />
            Safe Direct APK
          </div>
          <div className="w-px h-4 bg-brand-border" />
          <div className="flex items-center gap-1.5">
            <StarIcon className="w-4 h-4 text-yellow-400" />
            100+ Episodes
          </div>
          <div className="w-px h-4 bg-brand-border" />
          <div className="flex items-center gap-1.5">
            <LightningIcon className="w-4 h-4 text-brand-red" />
            New Daily
          </div>
        </div>
      </div>

      {/* Scroll cue */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-brand-muted animate-bounce">
        <span className="text-xs">Scroll to explore</span>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </section>
  );
}

function AndroidIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.523 15.341A5 5 0 0 0 20 11a5 5 0 0 0-2.5-4.33L18.5 5h-13l1 1.67A5 5 0 0 0 4 11a5 5 0 0 0 2.477 4.341A2 2 0 0 0 6 17v1a1 1 0 0 0 1 1h1v2a1 1 0 0 0 2 0v-2h4v2a1 1 0 0 0 2 0v-2h1a1 1 0 0 0 1-1v-1a2 2 0 0 0-.477-1.659zM8.5 3.5l1-1.5h5l1 1.5H8.5zM9 13a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm6 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" />
    </svg>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function LightningIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
}
