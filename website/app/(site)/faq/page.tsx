import type { Metadata } from 'next';
import PageHeader from '@/components/PageHeader';
import FAQ from '@/components/FAQ';

export const metadata: Metadata = {
  title: 'FAQ — Horizon Tweaks',
  description: 'Technical FAQ about Horizon Tweaks: safety, purchases, services, online optimization, and desktop app.',
};

export default function FAQPage() {
  return (
    <>
      <PageHeader
        eyebrow="Support Center"
        title="Technical FAQ"
        description="Common questions about Horizon Tweaks, services, purchases, and how the desktop app works."
        compact
      />
      <FAQ />
    </>
  );
}
