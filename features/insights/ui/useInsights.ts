/**
 * useInsights — loads the current user's workout data and exposes per-chart
 * derivations. Each chart has its own time-range state, owned here and set
 * via the setters returned to callers.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { logger } from '@/shared/utils/logger';
import {
  InsightsRepository,
  type RawInsightsPayload,
} from '@/features/insights/infra/insightsRepository';
import {
  deriveProgressChart,
  deriveVolumeBreakdown,
  deriveMuscleBalance,
  deriveStrengthCurveForExercise,
  deriveStrengthCurvesByExercise,
  type StrengthCurveOption,
} from '@/logic/insightsDerivation';
import { deriveMuscleHeatmap } from '@/logic/muscleHeatmapUtils';
import type { ProgressChartData } from '@/features/ai/domain/ProgressChart';
import type { VolumeBreakdownData } from '@/features/ai/domain/VolumeBreakdown';
import type { StrengthCurveData } from '@/features/ai/domain/StrengthCurve';
import type { MuscleBalanceData } from '@/features/ai/domain/MuscleBalance';
import type { MuscleHeatmapData } from '@/features/insights/domain/MuscleHeatmap';
import type { TimeRangeDays } from '@/components/insights/TimeRangeSelector';

interface UseInsightsReturn {
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  hasAnyData: boolean;

  // Per-chart range state
  progressRange: TimeRangeDays;
  setProgressRange: (r: TimeRangeDays) => void;
  volumeRange: TimeRangeDays;
  setVolumeRange: (r: TimeRangeDays) => void;
  strengthRange: TimeRangeDays;
  setStrengthRange: (r: TimeRangeDays) => void;
  balanceRange: TimeRangeDays;
  setBalanceRange: (r: TimeRangeDays) => void;
  heatmapRange: TimeRangeDays;
  setHeatmapRange: (r: TimeRangeDays) => void;

  // Derived data per chart
  progress: ProgressChartData | null;
  volume: VolumeBreakdownData | null;
  strength: StrengthCurveData | null;
  balance: MuscleBalanceData | null;
  heatmap: MuscleHeatmapData | null;

  // Exercise switcher for the strength curve
  strengthOptions: StrengthCurveOption[];
  activeExerciseId: string | null;
  setActiveExerciseId: (id: string) => void;
}

export function useInsights(): UseInsightsReturn {
  const { currentUser } = useAuth();
  const uid = currentUser?.uid;

  const [raw, setRaw] = useState<RawInsightsPayload>({ logs: [], history: {} });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Per-chart range state — each chart can be inspected independently.
  const [progressRange, setProgressRange] = useState<TimeRangeDays>(90);
  const [volumeRange, setVolumeRange] = useState<TimeRangeDays>(7);
  const [strengthRange, setStrengthRange] = useState<TimeRangeDays>(90);
  const [balanceRange, setBalanceRange] = useState<TimeRangeDays>(30);
  const [heatmapRange, setHeatmapRange] = useState<TimeRangeDays>(30);

  const [activeExerciseId, _setActiveExerciseId] = useState<string | null>(null);

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
        const payload = await InsightsRepository.fetchAll(uid);
        setRaw(payload);
      } catch (err) {
        logger.error('useInsights', 'fetch failed', err);
        setError("Couldn't load your stats. Pull to retry.");
        setRaw({ logs: [], history: {} });
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

  // ── Per-chart derivations ────────────────────────────────────────────────

  const progress = useMemo(
    () => deriveProgressChart(raw.logs, progressRange),
    [raw.logs, progressRange],
  );

  const volume = useMemo(
    () => deriveVolumeBreakdown(raw.logs, volumeRange),
    [raw.logs, volumeRange],
  );

  const balance = useMemo(
    () => deriveMuscleBalance(raw.logs, balanceRange),
    [raw.logs, balanceRange],
  );

  const heatmap = useMemo(
    () => deriveMuscleHeatmap(raw.logs, heatmapRange),
    [raw.logs, heatmapRange],
  );

  const strengthOptions = useMemo(
    () => deriveStrengthCurvesByExercise(raw.logs, raw.history, strengthRange),
    [raw.logs, raw.history, strengthRange],
  );

  // Sync active exercise against the current options — when the range
  // changes and the old selection drops out, default back to the top option.
  useEffect(() => {
    if (strengthOptions.length === 0) {
      if (activeExerciseId !== null) _setActiveExerciseId(null);
      return;
    }
    const stillValid = strengthOptions.some(
      (o) => o.exerciseId === activeExerciseId,
    );
    if (!stillValid) _setActiveExerciseId(strengthOptions[0].exerciseId);
  }, [strengthOptions, activeExerciseId]);

  const strength = useMemo<StrengthCurveData | null>(() => {
    if (!activeExerciseId) return strengthOptions[0]?.data ?? null;
    const match = strengthOptions.find((o) => o.exerciseId === activeExerciseId);
    if (match) return match.data;
    // Fallback: re-derive directly (defensive — shouldn't hit after sync effect)
    return deriveStrengthCurveForExercise(
      raw.logs,
      activeExerciseId,
      raw.history,
      strengthRange,
    );
  }, [activeExerciseId, strengthOptions, raw, strengthRange]);

  const setActiveExerciseId = useCallback((id: string) => {
    _setActiveExerciseId(id);
  }, []);

  const hasAnyData = !!progress || !!volume || !!strength || !!balance || !!heatmap;

  return {
    loading,
    refreshing,
    error,
    refresh,
    hasAnyData,
    progressRange,
    setProgressRange,
    volumeRange,
    setVolumeRange,
    strengthRange,
    setStrengthRange,
    balanceRange,
    setBalanceRange,
    heatmapRange,
    setHeatmapRange,
    progress,
    volume,
    strength,
    balance,
    heatmap,
    strengthOptions,
    activeExerciseId,
    setActiveExerciseId,
  };
}
