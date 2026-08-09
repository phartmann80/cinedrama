import Nav from './components/Nav';
import Hero from './components/Hero';
import Features from './components/Features';
import HowItWorks from './components/HowItWorks';
import SeriesShowcase from './components/SeriesShowcase';
import DownloadSection from './components/DownloadSection';
import Footer from './components/Footer';

export default function HomePage() {
  return (
    <main className="bg-brand-dark min-h-screen">
      <Nav />
      <Hero />
      <SeriesShowcase />
      <Features />
      <HowItWorks />
      <DownloadSection />
      <Footer />
    </main>
  );
}
