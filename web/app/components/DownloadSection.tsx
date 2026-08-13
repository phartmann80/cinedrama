const APK_DOWNLOAD_URL =
  process.env.NEXT_PUBLIC_APK_URL ?? '/download/cinedrama-latest.apk';

export default function DownloadSection() {
  return (
    <section
      id="download"
      className="py-24 px-6 relative overflow-hidden bg-brand-card/20"
    >
      {/* Glow */}
      <div className="absolute inset-0 bg-hero-glow pointer-events-none" />

      <div className="relative mx-auto max-w-3xl text-center">
        <p className="text-brand-red text-sm font-semibold uppercase tracking-widest mb-4">
          Free Download
        </p>

        <h2 className="text-5xl md:text-6xl font-extrabold leading-tight mb-6">
          Your Next Obsession{' '}
          <span className="text-brand-red">Starts Now</span>
        </h2>

        <p className="text-brand-muted text-lg mb-10 max-w-xl mx-auto">
          Download the Android APK directly - no Play Store required. Install,
          open, and your vertical drama feed is ready in under a minute.
        </p>

        {/* Big download button */}
        <a
          href={APK_DOWNLOAD_URL}
          download="cinedrama-latest.apk"
          className="group inline-flex flex-col items-center justify-center bg-brand-red hover:bg-red-600 text-white rounded-3xl px-12 py-6 transition-all duration-200 hover:scale-105 active:scale-95 shadow-2xl shadow-brand-red/40 hover:shadow-brand-red/60 animate-pulse-glow"
          aria-label="Download CineDrama APK for Android"
        >
          <div className="flex items-center gap-3 mb-1">
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.523 15.341A5 5 0 0 0 20 11a5 5 0 0 0-2.5-4.33L18.5 5h-13l1 1.67A5 5 0 0 0 4 11a5 5 0 0 0 2.477 4.341A2 2 0 0 0 6 17v1a1 1 0 0 0 1 1h1v2a1 1 0 0 0 2 0v-2h4v2a1 1 0 0 0 2 0v-2h1a1 1 0 0 0 1-1v-1a2 2 0 0 0-.477-1.659zM8.5 3.5l1-1.5h5l1 1.5H8.5zM9 13a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm6 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" />
            </svg>
            <span className="text-2xl font-extrabold">
              Download Android APK
            </span>
          </div>
          <span className="text-red-200 text-sm font-normal">
            cinedrama-latest.apk - Free - Android 8.0+
          </span>
        </a>

        {/* Install note */}
        <div className="mt-8 inline-flex items-start gap-3 bg-brand-card border border-brand-border rounded-xl px-5 py-4 text-left max-w-md mx-auto">
          <svg
            className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
          </svg>
          <div>
            <p className="text-white text-sm font-semibold mb-1">
              Install tip
            </p>
            <p className="text-brand-muted text-xs leading-relaxed">
              On Android, go to <strong className="text-white">Settings - Security - Unknown Sources</strong>{' '}
              and enable "Allow from this source" before installing. You can
              disable it afterwards.
            </p>
          </div>
        </div>

        {/* Coming soon - stores */}
        <div className="mt-10 flex items-center justify-center gap-6 text-brand-muted text-xs">
          <span>Coming soon:</span>
          <span className="border border-brand-border px-3 py-1 rounded-full">
            Google Play
          </span>
          <span className="border border-brand-border px-3 py-1 rounded-full">
            Amazon Appstore
          </span>
          <span className="border border-brand-border px-3 py-1 rounded-full">
            Samsung Galaxy Store
          </span>
        </div>
      </div>
    </section>
  );
}
