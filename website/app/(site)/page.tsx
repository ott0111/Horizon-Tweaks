import type { Metadata } from 'next';
import Hero from '@/components/Hero';
import HomeHighlights from '@/components/HomeHighlights';
import TrustSection from '@/components/TrustSection';
import ValueProposition from '@/components/ValueProposition';
import ComparisonSection from '@/components/ComparisonSection';
import StatsSection from '@/components/StatsSection';
import TestimonialsSection from '@/components/TestimonialsSection';
import FAQ from '@/components/FAQ';
import DownloadCTA from '@/components/DownloadCTA';

export const metadata: Metadata = {
  title: 'Horizon Tweaks — Peak Performance for Gamers',
  description: 'Horizon Tweaks desktop app + live remote tuning services. Maximize FPS, cut latency, benchmark your system, or book hands-on expert optimization.',
};

export default function HomePage() {
  return (
    <>
      <Hero />
      <HomeHighlights />
      <TrustSection />
      <ValueProposition showFull={false} />
      <ComparisonSection />
      <StatsSection />
      <TestimonialsSection />
      <FAQ />
      <DownloadCTA compact />
    </>
  );
}
