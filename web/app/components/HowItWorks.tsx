const STEPS = [
  {
    step: '01',
    title: 'Download the APK',
    description:
      'Tap the big red button, allow installs from unknown sources, and you\'re in. Takes 30 seconds.',
  },
  {
    step: '02',
    title: 'Pick Your Genre',
    description:
      'Billionaire Drama? Sci-Fi? Romance? Choose what hooks you, or let the algorithm feed you.',
  },
  {
    step: '03',
    title: 'Swipe & Watch',
    description:
      'Episodes auto-play as you swipe up. Pause with a tap. Like with a double-tap. Binge without guilt.',
  },
  {
    step: '04',
    title: 'Unlock the Cliffhangers',
    description:
      'Watch a short ad or spend coins to unlock episode 3+. No subscription required to start.',
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 px-6">
      <div className="mx-auto max-w-5xl">
        <div className="text-center mb-14">
          <p className="text-brand-red text-sm font-semibold uppercase tracking-widest mb-3">
            Get Started
          </p>
          <h2 className="text-4xl md:text-5xl font-extrabold">
            Up & Streaming in{' '}
            <span className="text-brand-red">60 Seconds</span>
          </h2>
        </div>

        <div className="relative">
          {/* Connecting line */}
          <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-brand-border -translate-x-1/2" />

          <div className="space-y-12">
            {STEPS.map((step, i) => (
              <div
                key={i}
                className={`flex flex-col md:flex-row items-center gap-6 md:gap-12 ${
                  i % 2 === 1 ? 'md:flex-row-reverse' : ''
                }`}
              >
                {/* Text */}
                <div className="flex-1 text-center md:text-left">
                  <div
                    className={`text-xs font-bold text-brand-red tracking-widest mb-2 ${
                      i % 2 === 1 ? 'md:text-right' : ''
                    }`}
                  >
                    STEP {step.step}
                  </div>
                  <h3
                    className={`text-2xl font-bold text-white mb-3 ${
                      i % 2 === 1 ? 'md:text-right' : ''
                    }`}
                  >
                    {step.title}
                  </h3>
                  <p
                    className={`text-brand-muted leading-relaxed ${
                      i % 2 === 1 ? 'md:text-right' : ''
                    }`}
                  >
                    {step.description}
                  </p>
                </div>

                {/* Step circle */}
                <div className="relative z-10 flex-shrink-0 w-16 h-16 rounded-full bg-brand-red flex items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-brand-red/40">
                  {step.step}
                </div>

                {/* Spacer */}
                <div className="flex-1 hidden md:block" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
