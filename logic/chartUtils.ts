/**
 * Pure data-shaping helpers for the AI progress chart.
 * No React, no victory-native, no Skia — keeps the logic unit-testable.
 */
import type {
  ProgressChartData,
  ProgressChartMetric,
  ProgressChartPoint,
} from '@/features/ai/domain/ProgressChart';

export type MergedRow = { x: number } & Record<string, number | undefined>;

export interface ChartInputs {
  mergedData: MergedRow[];
  yKeys: string[];
  seriesMeta: Array<{ key: string; label: string; color?: string }>;
  duplicateDateCount: number;
}

export const MAX_SERIES = 4;
export const MAX_POINTS_PER_SERIES = 60;

/**
 * Accepts a plausible ISO-8601 date string. Returns null on failure or NaN.
 * Non-ISO formats (e.g. "01/02/2024") are rejected to avoid platform-specific
 * ambiguity — the backend is expected to emit ISO dates only.
 */
export function parseDateToTs(date: string): number | null {
  if (typeof date !== 'string' || date.length === 0) return null;
  // Require at minimum YYYY-MM-DD. Allow optional time component.
  if (!/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(date)) return null;
  const ts = Date.parse(date);
  return Number.isFinite(ts) ? ts : null;
}

export function formatMetric(metric: ProgressChartMetric, unit: string): string {
  switch (metric) {
    case 'weight':
      return `Weight (${unit})`;
    case 'volume':
      return `Volume (${unit})`;
    case 'reps':
      return 'Reps';
    case 'one_rep_max':
      return `Estimated 1RM (${unit})`;
    default:
      return unit;
  }
}

export function formatShortDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function formatDateRange(rows: MergedRow[]): string {
  if (rows.length === 0) return '';
  const first = formatShortDate(rows[0].x);
  const last = formatShortDate(rows[rows.length - 1].x);
  return first === last ? first : `${first} → ${last}`;
}

/**
 * Build a union-of-x dataset from a multi-series chart payload.
 *
 * Contract:
 * - Series are capped at MAX_SERIES (older ones kept).
 * - Points with non-finite values or unparseable dates are dropped.
 * - Points within a series are sorted by ascending timestamp.
 * - Duplicate timestamps within a single series: last-wins (reported via duplicateDateCount).
 * - The merged rows include every timestamp seen across all series, with `undefined`
 *   in columns where that series has no point. The caller MUST filter non-finite
 *   y-values per series before rendering with victory-native's <Line>.
 */
export function buildChartInputs(data: ProgressChartData): ChartInputs {
  let duplicateDateCount = 0;

  const sanitized = data.series.slice(0, MAX_SERIES).map((s, idx) => {
    const byTs = new Map<number, number>();
    const raw = Array.isArray(s.points) ? s.points : [];
    for (const p of raw as ProgressChartPoint[]) {
      if (!p || typeof p.value !== 'number' || !Number.isFinite(p.value)) continue;
      const ts = parseDateToTs(p.date);
      if (ts === null) continue;
      if (byTs.has(ts)) duplicateDateCount += 1;
      byTs.set(ts, p.value); // last-wins
    }

    const points = Array.from(byTs.entries())
      .map(([ts, value]) => ({ ts, value }))
      .sort((a, b) => a.ts - b.ts)
      .slice(0, MAX_POINTS_PER_SERIES);

    return {
      key: `s${idx}`,
      label: s.label,
      color: s.color,
      points,
    };
  });

  const xSet = new Set<number>();
  for (const s of sanitized) {
    for (const p of s.points) xSet.add(p.ts);
  }
  const xValues = Array.from(xSet).sort((a, b) => a - b);

  const mergedData: MergedRow[] = xValues.map((x) => {
    const row: MergedRow = { x };
    for (const s of sanitized) {
      const hit = s.points.find((p) => p.ts === x);
      row[s.key] = hit?.value;
    }
    return row;
  });

  const yKeys = sanitized.map((s) => s.key);
  const seriesMeta = sanitized.map((s) => ({ key: s.key, label: s.label, color: s.color }));

  return { mergedData, yKeys, seriesMeta, duplicateDateCount };
}
