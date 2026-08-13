import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'CineDrama: Stream Drama, Feel Every Scene',
  description:
    'CineDrama brings you gripping short-form drama series in a vertical video feed. Download the app and lose yourself in stories built for your phone.',
  metadataBase: new URL('https://cinedrama.app'),
  openGraph: {
    title: 'CineDrama: Stream Drama, Feel Every Scene',
    description:
      'Short-form drama series in a vertical video feed. Built for mobile. Download the APK free.',
    images: ['/og-image.png'],
    type: 'website',
    url: 'https://cinedrama.app',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CineDrama: Stream Drama, Feel Every Scene',
    description:
      'Short-form drama series in a vertical video feed. Built for mobile.',
    images: ['/og-image.png'],
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-brand-dark text-brand-text antialiased">{children}</body>
    </html>
  );
}
