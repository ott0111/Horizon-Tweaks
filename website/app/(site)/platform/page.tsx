import type { Metadata } from 'next';
import PageHeader from '@/components/PageHeader';
import FeatureShowcase from '@/components/FeatureShowcase';
import TrustSection from '@/components/TrustSection';

export const metadata: Metadata = {
  title: 'Platform — Horizon Tweaks',
  description: 'Explore Horizon Tweaks modules: system tuning, network, gaming, debloat, benchmark, and expert optimization services.',
};

export default function PlatformPage() {
  return (
    <>
      <PageHeader
        eyebrow="Unified Platform"
        title={<>One Elite <span className="gradient-text">Optimization Studio</span></>}
        description="Horizon Tweaks runs entirely on your PC. Unified control, advanced tuning, and real-time transparency — no cloud services."
      />
      <FeatureShowcase />
      <TrustSection />
    </>
  );
}
