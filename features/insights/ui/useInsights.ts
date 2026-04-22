/**
 * useInsights — loads the current user's workout data and derives the 4
 * insight charts. Returns loading / error / refresh.
 */
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { logger } from '@/shared/utils/logger';
import { InsightsRepository } from '@/features/insights/infra/insightsRepository';
import { deriveAllInsights, type DerivedInsights } from '@/logic/insightsDerivation';

interface UseInsightsReturn {
  data: DerivedInsights;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  hasAnyData: boolean;
}

const EMPTY: DerivedInsights = {
  progress: null,
  volume: null,
  strength: null,
  balance: null,
};

export function useInsights(): UseInsightsReturn {
  const { currentUser } = useAuth();
  const uid = currentUser?.uid;

  const [data, setData] = useState<DerivedInsights>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (mode: 'initial' | 'refresh') => {
      if (!uid) {
        setLoading(false);
        return;
      }
      if (mode === 'initial') setLoading(true);
      else setRefreshing(true);
      setError(null);
      try {
        const raw = await InsightsRepository.fetchAll(uid);
        setData(deriveAllInsights(raw.logs, raw.history));
      } catch (err) {
        logger.error('useInsights', 'derive failed', err);
        setError("Couldn't load your stats. Pull to retry.");
        setData(EMPTY);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [uid],
  );

  useEffect(() => {
    load('initial');
  }, [load]);

  const refresh = useCallback(() => load('refresh'), [load]);

  const hasAnyData =
    !!data.progress || !!data.volume || !!data.strength || !!data.balance;

  return { data, loading, refreshing, error, refresh, hasAnyData };
}
