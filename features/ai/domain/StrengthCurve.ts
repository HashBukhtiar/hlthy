/**
 * Domain types for the AI strength-curve response.
 * Mirrors StrengthCurveData in ai/models/schemas.py.
 */

export type StrengthCurveMetric = 'weight' | 'one_rep_max' | 'volume';

export interface StrengthCurvePoint {
  date: string;
  value: number;
  is_pr?: boolean;
  reps?: number;
}

export interface StrengthCurveData {
  exercise_name: string;
  metric: StrengthCurveMetric;
  unit: string;
  points: StrengthCurvePoint[];
  trend_label?: string;
  projected_next?: number;
  summary?: string;
}

const METRIC_VALUES: ReadonlySet<StrengthCurveMetric> = new Set([
  'weight',
  'one_rep_max',
  'volume',
]);

function isPoint(value: unknown): value is StrengthCurvePoint {
  if (!value || typeof value !== 'object') return false;
  const p = value as Record<string, unknown>;
  if (typeof p.date !== 'string' || p.date.length === 0) return false;
  if (typeof p.value !== 'number' || !Number.isFinite(p.value)) return false;
  if (p.is_pr !== undefined && typeof p.is_pr !== 'boolean') return false;
  if (p.reps !== undefined && (typeof p.reps !== 'number' || !Number.isFinite(p.reps))) {
    return false;
  }
  return true;
}

export function isStrengthCurveData(value: unknown): value is StrengthCurveData {
  if (!value || typeof value !== 'object') return false;
  const d = value as Record<string, unknown>;
  if (typeof d.exercise_name !== 'string' || d.exercise_name.length === 0) return false;
  if (typeof d.metric !== 'string' || !METRIC_VALUES.has(d.metric as StrengthCurveMetric)) {
    return false;
  }
  if (typeof d.unit !== 'string') return false;
  if (!Array.isArray(d.points) || d.points.length < 2) return false;
  return d.points.every(isPoint);
}
