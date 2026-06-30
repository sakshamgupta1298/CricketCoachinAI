import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import apiService from '../services/api';
import { Entitlements } from '../types';
import { useAuth } from './AuthContext';

interface EntitlementsContextType {
  entitlements: Entitlements | null;
  loading: boolean;
  /** Re-fetch entitlements from the server (call after a purchase / upload). */
  refresh: () => Promise<void>;
  /** Convenience checks. */
  hasFeature: (flag: keyof Entitlements) => boolean;
  creditsRemaining: number;
}

const DEFAULT_ENTITLEMENTS: Entitlements = {
  analysis_credits_remaining: 0,
  plan_tier: 'free',
  subscription_status: 'none',
  current_period_end: null,
  feature_compare: false,
  feature_ball_speed: false,
  feature_monitoring: false,
  feature_hindi: true,
  feature_priority: false,
  feature_full_history: false,
};

const EntitlementsContext = createContext<EntitlementsContextType | undefined>(undefined);

export const EntitlementsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [entitlements, setEntitlements] = useState<Entitlements | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setEntitlements(null);
      return;
    }
    setLoading(true);
    try {
      const res = await apiService.getEntitlements();
      if (res.success && res.data) {
        setEntitlements({ ...DEFAULT_ENTITLEMENTS, ...res.data });
      }
    } catch (e) {
      console.log('⚠️ [ENTITLEMENTS] refresh failed:', (e as any)?.message ?? e);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Load (or clear) entitlements when auth state changes.
  useEffect(() => {
    if (isAuthenticated) {
      void refresh();
    } else {
      setEntitlements(null);
    }
  }, [isAuthenticated, refresh]);

  const hasFeature = useCallback(
    (flag: keyof Entitlements) => Boolean(entitlements?.[flag]),
    [entitlements]
  );

  return (
    <EntitlementsContext.Provider
      value={{
        entitlements,
        loading,
        refresh,
        hasFeature,
        creditsRemaining: entitlements?.analysis_credits_remaining ?? 0,
      }}
    >
      {children}
    </EntitlementsContext.Provider>
  );
};

export const useEntitlements = (): EntitlementsContextType => {
  const ctx = useContext(EntitlementsContext);
  if (!ctx) {
    throw new Error('useEntitlements must be used within an EntitlementsProvider');
  }
  return ctx;
};
