'use client';

const SERIES = [
  {
    id: 1,
    title: "Billionaire's Revenge",
    genre: 'Drama · Thriller',
    episodes: 24,
    description:
      'When a self-made billionaire discovers his fiancée married his rival, he orchestrates a meticulous corporate takedown that tears both families apart.',
    color: 'from-red-900 to-brand-dark',
    badge: 'HOT',
    badgeColor: 'bg-brand-red',
  },
  {
    id: 2,
    title: 'Neon Exodus',
    genre: 'Sci-Fi · Action',
    episodes: 18,
    description:
      'In 2089, a rogue AI detective hunts synthetic humans disguised as citizens — until she discovers she might be one of them.',
    color: 'from-blue-900 to-brand-dark',
    badge: 'NEW',
    badgeColor: 'bg-blue-600',
  },
  {
    id: 3,
    title: 'Whisper of the Tide',
    genre: 'Romance · Suspense',
    episodes: 30,
    description:
      'A marine biologist and a mysterious salvage diver uncover a decades-old maritime conspiracy — and an undeniable connection between them.',
    color: 'from-teal-900 to-brand-dark',
    badge: 'TRENDING',
    badgeColor: 'bg-teal-600',
  },
  {
    id: 4,
    title: 'Crown of Lies',
    genre: 'Political · Drama',
    episodes: 20,
    description:
      "The heir to a political dynasty must choose between her family's legacy and the journalist who threatens to expose everything.",
    color: 'from-purple-900 to-brand-dark',
    badge: 'EXCLUSIVE',
    badgeColor: 'bg-purple-600',
  },
];

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
            New series drop every week —{' '}
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
  return (
    <div className="group relative rounded-2xl overflow-hidden border border-brand-border hover:border-brand-red/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-brand-red/10 cursor-pointer bg-brand-card">
      {/* Poster gradient area */}
      <div className={`relative h-52 bg-gradient-to-b ${series.color}`}>
        {/* Badge */}
        <span
          className={`absolute top-3 left-3 ${series.badgeColor} text-white text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wider`}
        >
          {series.badge}
        </span>
        {/* Episode count */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full">
          <span>{series.episodes}</span>
          <span className="text-brand-muted">eps</span>
        </div>
        {/* Play overlay on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-12 h-12 rounded-full bg-brand-red/90 flex items-center justify-center">
            <svg className="w-5 h-5 text-white ml-0.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
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
    </div>
  );
}
