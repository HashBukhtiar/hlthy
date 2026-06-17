import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { SeenRepository } from '@/features/feed/infra/seenRepository';
import {
  SeenState,
  SeenEntry,
  SEEN_STATE_MAX_ENTRIES,
} from '@/features/feed/domain/SeenState';
import { logger } from '@/shared/utils/logger';

/**
 * Flush at most once per this interval while the user is actively scrolling.
 * (Trailing-throttle, not reset-debounce — keeps a steady ~one-write-per-20s
 * cadence during continuous activity, matching the cost model.)
 */
const FLUSH_INTERVAL_MS = 20_000;

export interface UseSeenTrackingResult {
  /** True once the persisted seen-state has been loaded for this user. */
  isHydrated: boolean;
  /**
   * Record that a post was seen. `opened` (tapped into detail) is a stronger
   * signal than a plain impression. Cheap — buffers in memory, flushes later.
   */
  markSeen: (postId: string, opts?: { opened?: boolean }) => void;
  /** Returns a snapshot copy of the current seen-state (for ranking). */
  getSeenSnapshot: () => SeenState;
}

/**
 * Captures feed "seen" signals (impressions + opens) and persists them to
 * Firestore as one rolling, capped doc per user. Entirely best-effort: any
 * failure degrades to "nothing is seen" and never breaks the feed.
 *
 * Phase 1 only captures + persists; ordering is unaffected.
 */
export function useSeenTracking(): UseSeenTrackingResult {
  const { currentUser } = useAuth();
  const uid = currentUser?.uid;

  // Working copy of seen-state. A ref so impressions don't trigger re-renders.
  const postsRef = useRef<Record<string, SeenEntry>>({});
  const hydratedRef = useRef(false);
  const dirtyRef = useRef(false);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // ── Capping ────────────────────────────────────────────────────────────────

  const capEntries = useCallback((posts: Record<string, SeenEntry>): Record<string, SeenEntry> => {
    const ids = Object.keys(posts);
    if (ids.length <= SEEN_STATE_MAX_ENTRIES) return posts;
    // Keep the most-recently-seen entries, evict the oldest.
    const kept = ids
      .sort((a, b) => posts[b].lastSeenAt - posts[a].lastSeenAt)
      .slice(0, SEEN_STATE_MAX_ENTRIES);
    const next: Record<string, SeenEntry> = {};
    for (const id of kept) next[id] = posts[id];
    return next;
  }, []);

  // ── Flush ────────────────────────────────────────────────────────────────--

  const flush = useCallback(async () => {
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    // Don't persist before hydration — we'd clobber the stored doc with a
    // partial buffer.
    if (!uid || !hydratedRef.current || !dirtyRef.current) return;

    dirtyRef.current = false;
    postsRef.current = capEntries(postsRef.current);
    await SeenRepository.persistSeenState(uid, { posts: postsRef.current });
  }, [uid, capEntries]);

  const scheduleFlush = useCallback(() => {
    if (flushTimerRef.current) return; // trailing-throttle: one timer at a time
    flushTimerRef.current = setTimeout(() => {
      flushTimerRef.current = null;
      flush();
    }, FLUSH_INTERVAL_MS);
  }, [flush]);

  // ── Hydration ────────────────────────────────────────────────────────────--

  useEffect(() => {
    if (!uid) {
      postsRef.current = {};
      hydratedRef.current = false;
      setIsHydrated(false);
      return;
    }

    let active = true;
    hydratedRef.current = false;
    setIsHydrated(false);

    SeenRepository.loadSeenState(uid)
      .then(loaded => {
        if (!active) return;
        // Merge loaded state UNDER any marks made before hydration finished,
        // so early impressions aren't lost.
        const merged: Record<string, SeenEntry> = { ...loaded.posts };
        for (const [postId, pending] of Object.entries(postsRef.current)) {
          const base = merged[postId];
          merged[postId] = base
            ? {
                count: base.count + pending.count,
                opened: base.opened || pending.opened,
                lastSeenAt: Math.max(base.lastSeenAt, pending.lastSeenAt),
              }
            : pending;
        }
        postsRef.current = merged;
        hydratedRef.current = true;
        setIsHydrated(true);
        if (dirtyRef.current) scheduleFlush();
      })
      .catch(err => {
        if (!active) return;
        logger.warn('useSeenTracking', 'Hydration failed; treating all as unseen', err);
        hydratedRef.current = true;
        setIsHydrated(true);
      });

    return () => {
      active = false;
    };
  }, [uid, scheduleFlush]);

  // ── Flush on background / unmount ───────────────────────────────────────────

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'background' || state === 'inactive') {
        flush();
      }
    });
    return () => {
      sub.remove();
      flush();
    };
  }, [flush]);

  // ── Public: markSeen ───────────────────────────────────────────────────────

  const markSeen = useCallback(
    (postId: string, opts?: { opened?: boolean }) => {
      if (!postId) return;
      const opened = opts?.opened ?? false;
      const now = Date.now();
      const existing = postsRef.current[postId];

      postsRef.current[postId] = existing
        ? {
            // Opens don't inflate the impression count; impressions do.
            count: existing.count + (opened ? 0 : 1),
            opened: existing.opened || opened,
            lastSeenAt: now,
          }
        : {
            count: opened ? 0 : 1,
            opened,
            lastSeenAt: now,
          };

      dirtyRef.current = true;
      if (hydratedRef.current) scheduleFlush();
    },
    [scheduleFlush]
  );

  const getSeenSnapshot = useCallback((): SeenState => {
    return { posts: { ...postsRef.current } };
  }, []);

  return { isHydrated, markSeen, getSeenSnapshot };
}
