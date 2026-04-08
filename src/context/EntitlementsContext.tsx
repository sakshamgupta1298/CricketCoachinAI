import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import apiService from '../services/api';
import type { Entitlements } from '../types';

interface EntitlementsContextType {
  entitlements: Entitlements;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

const EntitlementsContext = createContext<EntitlementsContextType | undefined>(undefined);

const DEFAULT_ENTITLEMENTS: Entitlements = {
  analysis_credits_remaining: 0,
  feature_compare: false,
  feature_ball_speed: false,
};

export function EntitlementsProvider({ children }: { children: ReactNode }) {
  const [entitlements, setEntitlements] = useState<Entitlements | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const resp = await apiService.getEntitlements();
      if (resp.success && resp.data) {
        setEntitlements(resp.data);
      } else {
        // If not logged in (401), keep it null so gating can be handled naturally.
        setEntitlements(null);
      }
    } catch {
      // Keep last known state.
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<EntitlementsContextType>(
    () => ({
      entitlements: entitlements ?? DEFAULT_ENTITLEMENTS,
      isLoading,
      refresh,
    }),
    [entitlements, isLoading, refresh]
  );

  return <EntitlementsContext.Provider value={value}>{children}</EntitlementsContext.Provider>;
}

export function useEntitlements(): EntitlementsContextType {
  const ctx = useContext(EntitlementsContext);
  if (!ctx) throw new Error('useEntitlements must be used within an EntitlementsProvider');
  return ctx;
}

