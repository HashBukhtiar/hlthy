/**
 * Pure helpers for StrengthCurveCard — sanitize points, derive PR markers,
 * build chart-ready rows, compute a trend summary.
 */
import { parseDateToTs } from '@/logic/chartUtils';
import type {
  StrengthCurveData,
  StrengthCurveMetric,
  StrengthCurvePoint,
} from '@/features/ai/domain/StrengthCurve';

export const MAX_POINTS = 80;

export interface PreparedCurvePoint {
  ts: number;
  value: number;
  isPR: boolean;
  reps?: number;
}

export interface PreparedStrengthCurve {
  points: PreparedCurvePoint[];
  /** Chart-ready rows keyed by x (ts) + y (value) for victory-native. */
  chartRows: Array<{ x: number; y: number }>;
  prIndices: number[];
  minValue: number;
  maxValue: number;
  firstValue: number;
  lastValue: number;
  deltaAbsolute: number;
  deltaPercent: number;
  trendLabel: string | null;
  projectedNext: number | null;
  metricLabel: string;
}

export function prepareStrengthCurve(data: StrengthCurveData): PreparedStrengthCurve {
  const raw: StrengthCurvePoint[] = Array.isArray(data.points) ? data.points : [];

  const byTs = new Map<number, StrengthCurvePoint & { ts: number }>();
  for (const p of raw) {
    if (!p || typeof p.value !== 'number' || !Number.isFinite(p.value)) continue;
    const ts = parseDateToTs(p.date);
    if (ts === null) continue;
    // Dup timestamp: prefer higher value (assume later entry of the day is the PR attempt).
    const existing = byTs.get(ts);
    if (!existing || p.value > existing.value) {
      byTs.set(ts, { ...p, ts });
    }
  }

  const sorted = Array.from(byTs.values())
    .sort((a, b) => a.ts - b.ts)
    .slice(0, MAX_POINTS);

  const points: PreparedCurvePoint[] = sorted.map((p) => ({
    ts: p.ts,
    value: p.value,
    isPR: !!p.is_pr,
    reps: typeof p.reps === 'number' && Number.isFinite(p.reps) ? p.reps : undefined,
  }));

  const chartRows = points.map((p) => ({ x: p.ts, y: p.value }));
  const prIndices = points.reduce<number[]>((acc, p, idx) => {
    if (p.isPR) acc.push(idx);
    return acc;
  }, []);

  const values = points.map((p) => p.value);
  const minValue = values.length ? Math.min(...values) : 0;
  const maxValue = values.length ? Math.max(...values) : 0;
  const firstValue = values[0] ?? 0;
  const lastValue = values[values.length - 1] ?? 0;
  const deltaAbsolute = lastValue - firstValue;
  const deltaPercent = firstValue > 0 ? (deltaAbsolute / firstValue) * 100 : 0;

  const trendLabel = data.trend_label?.trim() || null;

  const projectedNext =
    typeof data.projected_next === 'number' &&
    Number.isFinite(data.projected_next) &&
    data.projected_next > 0 &&
    // Projection must be plausibly above current max to be visually useful.
    data.projected_next > lastValue
      ? data.projected_next
      : null;

  return {
    points,
    chartRows,
    prIndices,
    minValue,
    maxValue,
    firstValue,
    lastValue,
    deltaAbsolute,
    deltaPercent,
    trendLabel,
    projectedNext,
    metricLabel: formatCurveMetric(data.metric, data.unit),
  };
}

export function formatCurveMetric(metric: StrengthCurveMetric, unit: string): string {
  switch (metric) {
    case 'weight':
      return `Top set (${unit})`;
    case 'one_rep_max':
      return `Estimated 1RM (${unit})`;
    case 'volume':
      return `Volume (${unit})`;
    default:
      return unit;
  }
}
