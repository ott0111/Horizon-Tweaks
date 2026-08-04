import type { Metadata } from 'next';
import PageHeader from '@/components/PageHeader';
import Features from '@/components/Features';

export const metadata: Metadata = {
  title: 'Features — Horizon Tweaks',
  description: 'Full list of Horizon Tweaks modules: tweaks, network, gaming, debloat, benchmark, and more.',
};

export default function FeaturesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Module Library"
        title="Every Tool in Horizon Tweaks"
        description="20+ modules unlocked by tier. All running locally on your desktop — no online optimization services."
        compact
      />
      <Features />
    </>
  );
}
