'use client';

import ValueProposition from '@/components/ValueProposition';
import Pricing from '@/components/Pricing';
import { useAuth } from '@/contexts/AuthContext';

export default function PricingContent() {
  const { userTier, handleBuy } = useAuth();

  return (
    <>
      <ValueProposition />
      <Pricing userTier={userTier} onBuy={handleBuy} />
    </>
  );
}
