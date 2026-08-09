import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service — CineDrama',
  description: 'Terms and conditions for using CineDrama.',
};

const EFFECTIVE_DATE = 'August 9, 2026';

export default function TermsPage() {
  return (
    <div className="bg-brand-dark min-h-screen text-brand-text">
      <div className="border-b border-brand-border px-6 py-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-brand-muted hover:text-white text-sm transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to CineDrama
        </Link>
      </div>

      <article className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-extrabold mb-2">Terms of Service</h1>
        <p className="text-brand-muted text-sm mb-12">
          Effective Date: {EFFECTIVE_DATE}
        </p>

        <Section title="1. Acceptance of Terms">
          By downloading, installing, or using CineDrama, you agree to be bound by these Terms of Service. If you do not agree, do not use our services.
        </Section>

        <Section title="2. License">
          CineDrama grants you a limited, non-exclusive, non-transferable, revocable license to use the app for personal, non-commercial purposes. You may not reverse-engineer, decompile, or distribute the app.
        </Section>

        <Section title="3. User Accounts">
          You are responsible for maintaining the security of your account. Notify us immediately at support@cinedrama.app if you suspect unauthorized access.
        </Section>

        <Section title="4. Content & Intellectual Property">
          All video content, scripts, audio, and branding are the exclusive property of CineDrama or its licensors. AI-generated content is produced under license and remains owned by CineDrama. You may not download, copy, or redistribute any content.
        </Section>

        <Section title="5. Coins & Payments">
          Coins are a virtual in-app currency with no cash value. All purchases are final and non-refundable except as required by law. Coin balances may not be transferred between accounts.
        </Section>

        <Section title="6. Advertising">
          CineDrama displays rewarded video ads via Google AdMob. Watching an ad grants in-app coins. We are not responsible for advertiser content.
        </Section>

        <Section title="7. Prohibited Conduct">
          You agree not to: (a) use the service for unlawful purposes; (b) attempt to bypass the paywall or coin system; (c) upload or transmit malicious code; (d) impersonate other users or CineDrama staff.
        </Section>

        <Section title="8. Disclaimer of Warranties">
          CineDrama is provided "as is" without warranties of any kind. We do not warrant uninterrupted, error-free service.
        </Section>

        <Section title="9. Limitation of Liability">
          To the maximum extent permitted by law, CineDrama shall not be liable for indirect, incidental, or consequential damages arising from your use of the service.
        </Section>

        <Section title="10. Termination">
          We may suspend or terminate your account at our discretion for violations of these Terms. You may terminate your account at any time by contacting support@cinedrama.app.
        </Section>

        <Section title="11. Governing Law">
          These Terms are governed by the laws of the applicable jurisdiction, without regard to conflict of law provisions.
        </Section>

        <Section title="12. Contact">
          <a href="mailto:support@cinedrama.app" className="text-brand-red">support@cinedrama.app</a>
        </Section>
      </article>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-lg font-bold text-white mb-3">{title}</h2>
      <div className="text-brand-muted text-sm leading-relaxed">{children}</div>
    </div>
  );
}
