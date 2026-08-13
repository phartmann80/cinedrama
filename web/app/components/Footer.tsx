export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-brand-border bg-brand-dark py-14 px-6">
      <div className="mx-auto max-w-7xl grid grid-cols-1 md:grid-cols-4 gap-10">
        {/* Brand */}
        <div className="md:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-brand-red flex items-center justify-center">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <span className="font-bold text-lg">
              Cine<span className="text-brand-red">Drama</span>
            </span>
          </div>
          <a
            href="mailto:support@cinedrama.app"
            className="mt-4 inline-flex items-center gap-2 text-brand-muted text-sm hover:text-white transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
              />
            </svg>
            support@cinedrama.app
          </a>
        </div>

        {/* Links */}
        <div>
          <h4 className="text-white font-semibold text-sm mb-4 uppercase tracking-wider">
            Platform
          </h4>
          <ul className="space-y-3 text-brand-muted text-sm">
            <li>
              <a href="#series" className="hover:text-white transition-colors">
                Series
              </a>
            </li>
            <li>
              <a href="#features" className="hover:text-white transition-colors">
                Features
              </a>
            </li>
            <li>
              <a href="#how-it-works" className="hover:text-white transition-colors">
                How It Works
              </a>
            </li>
            <li>
              <a
                href="/download/cinedrama-latest.apk"
                download
                className="hover:text-white transition-colors"
              >
                Download APK
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-semibold text-sm mb-4 uppercase tracking-wider">
            Legal
          </h4>
          <ul className="space-y-3 text-brand-muted text-sm">
            <li>
              <a href="/privacy" className="hover:text-white transition-colors">
                Privacy Policy
              </a>
            </li>
            <li>
              <a href="/terms" className="hover:text-white transition-colors">
                Terms of Service
              </a>
            </li>
            <li>
              <a
                href="mailto:support@cinedrama.app"
                className="hover:text-white transition-colors"
              >
                Contact Support
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="mx-auto max-w-7xl mt-12 pt-6 border-t border-brand-border flex items-center justify-center text-brand-muted text-xs">
        <p>© {year} CineDrama. All rights reserved.</p>
      </div>
    </footer>
  );
}
