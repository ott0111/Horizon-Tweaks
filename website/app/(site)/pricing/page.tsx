import type { Metadata } from 'next';
import PageHeader from '@/components/PageHeader';
import PricingContent from '@/components/PricingContent';

export const metadata: Metadata = {
  title: 'Pricing — Horizon Tweaks',
  description: 'Optimizer: Free ($0) · Standard ($14.99) · Pro ($29.99) · Ultimate ($59.99). Standalone apps: Horizon Ping ($17.99), Horizon Keyboard ($12.99). Bundles available. One-time purchase — lifetime access.',
};

export default function PricingPage() {
  return (
    <>
      <PageHeader
        eyebrow="Simple Pricing"
        title={<>One-Time <span className="gradient-text-sky">Purchase</span></>}
        description="Buy once, own forever. No subscriptions, no recurring fees. Standalone apps and bundles available."
        compact
      />
      <PricingContent />
    </>
  );
}