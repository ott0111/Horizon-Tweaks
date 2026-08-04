import type { Metadata } from 'next';
import PageHeader from '@/components/PageHeader';
import Services from '@/components/Services';

export const metadata: Metadata = {
  title: 'Services — Horizon Tweaks',
  description: 'Live remote PC optimization services. System tuning, overclocking, debloat, network optimization, storage tuning, clean installs, dual-boot setup, and more.',
};

export default function ServicesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Tuning Services"
        title="Professional PC Optimization"
        description="Pick the service that fits your goals. All sessions are performed live via remote desktop — we tune your exact hardware, not a generic preset."
        compact
      />
      <Services />
    </>
  );
}
