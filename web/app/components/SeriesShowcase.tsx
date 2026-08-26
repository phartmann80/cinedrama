'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

/**
 * SeriesShowcase — card grid with optional muted video previews.
 *
 * UX decision (per product spec): desktop uses a 300ms hover delay to fade the
 * gradient area into a muted looping preview and reverts on mouse-out. Mobile
 * uses first-tap-to-preview / second-tap-to-navigate. I chose tap-to-preview over
 * IntersectionObserver autoplay because it's friendlier to battery and less
 * jarring: nothing plays until the user actually hovers or taps, and the videos
 * are never started by merely scrolling into view.
 *
 * Behavior:
 *   - Videos are muted, loop, playsInline, preload="none", lazy: the <video>
 *     element is only mounted on the first hover/tap, so nothing is fetched
 *     until then. On a crash/404 the component silently keeps the static
 *     gradient (no broken icon/UI).
 *   - prefers-reduced-motion: no hover/tap autoplay or preview at all; the card
 *     renders the static gradient and the link click simply follows the link.
 *   - Files are served at /download/previews/<slug>.mp4 by the Nginx
 *     /download/previews/ location (inline video/mp4, long cache).
 */

const PREVIEW_BASE = '/download/previews/';
const HOVER_DELAY_MS = 300;
const TOUCH_CLICK_THROTTLE = 350;

const SERIES = [
  {
    id: 1,
    slug: 'billionaire-s-revenge',
    title: "Billionaire's Revenge",
    genre: 'Drama, Thriller',
    episodes: 24,
    description:
      'When a self-made billionaire discovers his fiancee married his rival, he orchestrates a meticulous corporate takedown that tears both families apart.',
    color: 'from-red-900 to-brand-dark',
    badge: 'HOT',
    badgeColor: 'bg-brand-red',
  },
  {
    id: 2,
    slug: 'neon-exodus',
    title: 'Neon Exodus',
    genre: 'Sci-Fi, Action',
    episodes: 18,
    description:
      'In 2089, a rogue AI detective hunts synthetic humans disguised as citizens, until she discovers she might be one of them.',
    color: 'from-blue-900 to-brand-dark',
    badge: 'NEW',
    badgeColor: 'bg-blue-600',
  },
  {
    id: 3,
    slug: 'whisper-of-the-tide',
    title: 'Whisper of the Tide',
    genre: 'Romance, Suspense',
    episodes: 30,
    description:
      'A marine biologist and a mysterious salvage diver uncover a decades-old maritime conspiracy and an undeniable connection between them.',
    color: 'from-teal-900 to-brand-dark',
    badge: 'TRENDING',
    badgeColor: 'bg-teal-600',
  },
  {
    id: 4,
    slug: 'crown-of-lies',
    title: 'Crown of Lies',
    genre: 'Political, Drama',
    episodes: 20,
    description:
      "The heir to a political dynasty must choose between her family's legacy and the journalist who threatens to expose everything.",
    color: 'from-purple-900 to-brand-dark',
    badge: 'EXCLUSIVE',
    badgeColor: 'bg-purple-600',
  },
];

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    setReduced(mq.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);
  return reduced;
}

export default function SeriesShowcase() {
  return (
    <section id="series" className="py-24 px-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="text-center mb-14">
          <p className="text-brand-red text-sm font-semibold uppercase tracking-widest mb-3">
            Now Streaming
          </p>
          <h2 className="text-4xl md:text-5xl font-extrabold">
            Stories Built for <span className="text-brand-red">Your Phone</span>
          </h2>
          <p className="mt-4 text-brand-muted max-w-xl mx-auto">
            Every series is produced in vertical 9:16 format. No black bars.
            No compromise. Just cinema in your palm.
          </p>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {SERIES.map((series) => (
            <SeriesCard key={series.id} series={series} />
          ))}
        </div>

        {/* More coming */}
        <div className="mt-10 text-center">
          <span className="text-brand-muted text-sm">
            New series drop every week.{' '}
            <a
              href="#download"
              className="text-brand-red underline underline-offset-2 hover:text-red-400"
            >
              download to stay updated
            </a>
          </span>
        </div>
      </div>
    </section>
  );
}

function SeriesCard({ series }: { series: (typeof SERIES)[0] }) {
  const reducedMotion = usePrefersReducedMotion();

  // `previewing` mounts the <video> (so nothing loads before interaction);
  // `playing` starts playback (keyed off hover for desktop, first-tap for touch).
  const [previewing, setPreviewing] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [touchPlayed, setTouchPlayed] = useState(false);

  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTouch = useRef(false);
  const lastTouchPlay = useRef(0);
  // The card falls back to a plain link (e.g. to #download) when the browser
  // prefers reduced motion or when video couldn't be used.
  const cardHref = '#download';

  const cancelHover = useCallback(() => {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  }, []);

  const startPreview = useCallback((fromTouch: boolean) => {
    setPreviewing(true);
    setVideoFailed(false);
    if (fromTouch) {
      setTouchPlayed(true);
      lastTouchPlay.current = Date.now();
    }
  }, []);

  const stopPreview = useCallback(() => {
    cancelHover();
    setPreviewing(false);
  }, [cancelHover]);

  // Desktop hover: fade in after a short delay, revert on mouse-out.
  const handleMouseEnter = useCallback(() => {
    if (reducedMotion || isTouch.current) return;
    cancelHover();
    hoverTimer.current = setTimeout(() => startPreview(false), HOVER_DELAY_MS);
  }, [cancelHover, reducedMotion, startPreview]);

  const handleMouseLeave = useCallback(() => {
    if (isTouch.current) return;
    stopPreview();
  }, [isTouch, stopPreview]);

  // Mobile: first tap plays the inline preview; second tap follows the link.
  const handleTouchStart = useCallback(() => {
    isTouch.current = true;
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (reducedMotion || videoFailed) return; // static gradient → normal link
      if (!isTouch.current) return; // desktop hover already shows preview

      const now = Date.now();
      // Debounce the touch synthesis that can follow the first interaction.
      if (now - lastTouchPlay.current < TOUCH_CLICK_THROTTLE) {
        e.preventDefault();
        return;
      }

      if (!touchPlayed) {
        e.preventDefault();
        startPreview(true);
        return;
      }
      // Second tap: fall through to the link.
    },
    [reducedMotion, startPreview, touchPlayed, videoFailed]
  );

  const handleVideoError = useCallback(() => {
    setVideoFailed(true);
    setPreviewing(false);
  }, []);

  const previewSrc = `${PREVIEW_BASE}${series.slug}.mp4`;
  const showVideo = previewing && !videoFailed;

  return (
    <a
      href={cardHref}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      className="group relative rounded-2xl overflow-hidden border border-brand-border hover:border-brand-red/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-brand-red/10 cursor-pointer bg-brand-card block"
    >
      {/* Poster gradient area */}
      <div className={`relative h-52 bg-gradient-to-b ${series.color}`}>
        {/* Muted looping preview (mounted only after the first hover/tap) */}
        {showVideo && (
          <video
            className="absolute inset-0 h-full w-full object-cover"
            src={previewSrc}
            muted
            loop
            playsInline
            autoPlay={!reducedMotion}
            preload="none"
            disablePictureInPicture
            onError={handleVideoError}
            aria-hidden="true"
            tabIndex={-1}
          />
        )}

        {/* Badge */}
        <span className={`absolute top-3 left-3 z-10 ${series.badgeColor} text-white text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wider`}>
          {series.badge}
        </span>

        {/* Episode count */}
        <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full">
          <span>{series.episodes}</span>
          <span className="text-brand-muted">eps</span>
        </div>

        {/* Play overlay on hover (hidden while a preview is playing) */}
        {!showVideo && (
          <div className="absolute inset-0 z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-12 h-12 rounded-full bg-brand-red/90 flex items-center justify-center">
              <svg className="w-5 h-5 text-white ml-0.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        )}

        {/* Hint for touch devices: 'tap to preview' on first, 'tap again' while playing */}
        {touchPlayed && showVideo && (
          <div className="absolute bottom-3 left-3 z-10 bg-black/60 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-full">
            Tap again to open
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <p className="text-brand-muted text-[11px] font-semibold uppercase tracking-widest mb-1">
          {series.genre}
        </p>
        <h3 className="text-white font-bold text-base leading-tight mb-2">
          {series.title}
        </h3>
        <p className="text-brand-muted text-xs leading-relaxed line-clamp-3">
          {series.description}
        </p>
      </div>
    </a>
  );
}
