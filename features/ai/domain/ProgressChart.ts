/**
 * Domain types for AI progress-chart responses.
 * Mirrors the Pydantic `ProgressChartData` schema in ai/models/schemas.py.
 */

export type ProgressChartMetric = 'weight' | 'volume' | 'reps' | 'one_rep_max';

export interface ProgressChartPoint {
  date: string;
  value: number;
}

export interface ProgressChartSeries {
  label: string;
  color?: string;
  points: ProgressChartPoint[];
}

export interface ProgressChartData {
  title: string;
  metric: ProgressChartMetric;
  unit: string;
  series: ProgressChartSeries[];
  x_axis_label?: string;
  y_axis_label?: string;
  summary?: string;
}

const METRIC_VALUES: ReadonlySet<ProgressChartMetric> = new Set([
  'weight',
  'volume',
  'reps',
  'one_rep_max',
]);

function isPoint(value: unknown): value is ProgressChartPoint {
  if (!value || typeof value !== 'object') return false;
  const p = value as Record<string, unknown>;
  return typeof p.date === 'string' && typeof p.value === 'number';
}

function isSeries(value: unknown): value is ProgressChartSeries {
  if (!value || typeof value !== 'object') return false;
  const s = value as Record<string, unknown>;
  if (typeof s.label !== 'string') return false;
  if (s.color !== undefined && typeof s.color !== 'string') return false;
  if (!Array.isArray(s.points)) return false;
  return s.points.every(isPoint);
}

/**
 * Type guard for `ProgressChartData` read from Firestore or SSE.
 * Guards the render path against malformed docs (older schema, corrupted data).
 */
export function isProgressChartData(value: unknown): value is ProgressChartData {
  if (!value || typeof value !== 'object') return false;
  const d = value as Record<string, unknown>;
  if (typeof d.title !== 'string') return false;
  if (typeof d.metric !== 'string' || !METRIC_VALUES.has(d.metric as ProgressChartMetric)) {
    return false;
  }
  if (typeof d.unit !== 'string') return false;
  if (!Array.isArray(d.series) || d.series.length === 0) return false;
  return d.series.every(isSeries);
}
