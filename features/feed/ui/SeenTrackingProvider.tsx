import React, { createContext, useContext } from 'react';
import { useSeenTracking, UseSeenTrackingResult } from '@/features/feed/ui/useSeenTracking';

/**
 * Shares a single seen-tracking instance across every feed surface mounted
 * under the provider (the home feed mounts PostsFeed and MilestonesFeed at the
 * same time — without sharing, each would hydrate and flush the same
 * users/{uid}/feedState/seen doc independently and clobber the other).
 */
const SeenTrackingContext = createContext<UseSeenTrackingResult | null>(null);

/** No-op fallback so feed surfaces still work if the provider is ever absent. */
const FALLBACK: UseSeenTrackingResult = {
  isHydrated: true,
  markSeen: () => {},
  getSeenSnapshot: () => ({ posts: {} }),
};

export function SeenTrackingProvider({ children }: { children: React.ReactNode }) {
  const value = useSeenTracking();
  return (
    <SeenTrackingContext.Provider value={value}>
      {children}
    </SeenTrackingContext.Provider>
  );
}

/**
 * Reads the shared seen-tracking instance. Degrades to a no-op (everything
 * treated as unseen, no capture) when used outside a provider — best-effort,
 * never breaks the feed.
 */
export function useSharedSeenTracking(): UseSeenTrackingResult {
  return useContext(SeenTrackingContext) ?? FALLBACK;
}
