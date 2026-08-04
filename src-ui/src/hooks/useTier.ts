import { useAuth } from '../contexts/AuthContext';

export function useTier() {
  const { user, checkTier, isAdmin, tier, refreshTier } = useAuth();

  return {
    isLoggedIn: !!user,
    isBasic: checkTier('basic'),
    isPro: checkTier('pro'),
    isUltimate: checkTier('ultimate'),
    isAdmin,
    tier,
    user,
    checkTier,
    refreshTier,
  };
}
