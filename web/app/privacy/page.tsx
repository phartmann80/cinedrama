import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy — CineDrama',
  description: 'How CineDrama collects, uses, and protects your personal data.',
};

const EFFECTIVE_DATE = 'August 9, 2026';

export default function PrivacyPage() {
  return (
    <div className="bg-brand-dark min-h-screen text-brand-text">
      {/* Nav back */}
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

      <article className="mx-auto max-w-3xl px-6 py-16 prose prose-invert prose-sm">
        <h1 className="text-3xl font-extrabold mb-2">Privacy Policy</h1>
        <p className="text-brand-muted text-sm mb-12">
          Effective Date: {EFFECTIVE_DATE}
        </p>

        <Section title="1. Introduction">
          CineDrama ("we", "us", "our") operates the CineDrama mobile application and the website cinedrama.app. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our services.
        </Section>

        <Section title="2. Information We Collect">
          <ul className="list-disc list-inside space-y-2 text-brand-muted text-sm">
            <li><strong className="text-white">Account data:</strong> email address, display name, and password hash when you register.</li>
            <li><strong className="text-white">Usage data:</strong> episodes watched, watch duration, swipe patterns, and in-app purchases.</li>
            <li><strong className="text-white">Device data:</strong> Android device model, OS version, advertising ID, and IP address.</li>
            <li><strong className="text-white">Payment data:</strong> processed through Google Play Billing or RevenueCat; we do not store raw card data.</li>
          </ul>
        </Section>

        <Section title="3. How We Use Your Information">
          <ul className="list-disc list-inside space-y-2 text-brand-muted text-sm">
            <li>To personalize your video feed and recommend series.</li>
            <li>To process episode unlocks and manage coin balances.</li>
            <li>To show rewarded ads via Google AdMob.</li>
            <li>To improve app performance and diagnose bugs.</li>
            <li>To send optional marketing emails (you may opt out at any time).</li>
          </ul>
        </Section>

        <Section title="4. Sharing of Information">
          We do not sell your personal data. We share data only with service providers strictly necessary to operate CineDrama, including: Google AdMob (advertising), RevenueCat (billing), Cloudflare (CDN/storage), and Firebase (authentication). All providers are bound by appropriate data processing agreements.
        </Section>

        <Section title="5. Data Retention">
          We retain your account data for as long as your account is active. You may request deletion at any time by contacting <a href="mailto:support@cinedrama.app" className="text-brand-red">support@cinedrama.app</a>. We will delete your personal data within 30 days of a verified request.
        </Section>

        <Section title="6. Children's Privacy">
          CineDrama is not directed to children under 13. We do not knowingly collect personal information from children under 13. If you believe we have inadvertently collected such data, please contact us immediately.
        </Section>

        <Section title="7. Security">
          We implement industry-standard measures including TLS encryption in transit, bcrypt password hashing, and Cloudflare DDoS protection. No method of transmission is 100% secure; we cannot guarantee absolute security.
        </Section>

        <Section title="8. Your Rights">
          Depending on your jurisdiction, you may have the right to access, correct, delete, or port your data. Submit requests to <a href="mailto:support@cinedrama.app" className="text-brand-red">support@cinedrama.app</a>.
        </Section>

        <Section title="9. Changes to This Policy">
          We may update this Privacy Policy periodically. We will notify you of material changes via in-app notification or email. Continued use after changes constitutes acceptance.
        </Section>

        <Section title="10. Contact Us">
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
