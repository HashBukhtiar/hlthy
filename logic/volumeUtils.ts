/**
 * Pure helpers for VolumeBreakdownCard — sanitize entries, compute deltas,
 * produce the color ramp used for gradient fills.
 */
import type {
  VolumeBreakdownData,
  VolumeBreakdownEntry,
} from '@/features/ai/domain/VolumeBreakdown';

export const MAX_ENTRIES = 10;
export const MAX_BAR_LABEL = 40;

// Aurora-style ramp — chosen so adjacent bars read as related but distinct.
// Used when the AI doesn't pick explicit colors for entries.
export const BAR_COLORS = [
  '#FF7A00',
  '#FF2D55',
  '#D466FF',
  '#9D4EDD',
  '#7A5CFF',
  '#5AB0FF',
  '#45B7D1',
  '#3EE68C',
  '#FFB020',
  '#FFD166',
];

export interface PreparedEntry {
  label: string;
  value: number;
  color: string;
  /** share of max value in [0, 1] — used to size the bar */
  ratio: number;
  /** share of total volume across all shown entries in [0, 1] */
  percent: number;
}

export interface PreparedVolumeBreakdown {
  entries: PreparedEntry[];
  maxValue: number;
  totalShown: number;
  total: number | null;
  priorTotal: number | null;
  deltaPercent: number | null;
  deltaDirection: 'up' | 'down' | 'flat' | null;
}

export function prepareVolumeBreakdown(data: VolumeBreakdownData): PreparedVolumeBreakdown {
  const raw: VolumeBreakdownEntry[] = Array.isArray(data.entries) ? data.entries : [];

  const sanitized = raw
    .filter(
      (e): e is VolumeBreakdownEntry =>
        !!e &&
        typeof e.label === 'string' &&
        e.label.length > 0 &&
        typeof e.value === 'number' &&
        Number.isFinite(e.value) &&
        e.value >= 0,
    )
    .slice(0, MAX_ENTRIES)
    // Highest first so the eye lands on the most-trained group.
    .sort((a, b) => b.value - a.value);

  const maxValue = sanitized.reduce((m, e) => Math.max(m, e.value), 0);
  const totalShown = sanitized.reduce((sum, e) => sum + e.value, 0);

  const entries: PreparedEntry[] = sanitized.map((e, idx) => ({
    label: e.label.length > MAX_BAR_LABEL ? e.label.slice(0, MAX_BAR_LABEL - 1) + '…' : e.label,
    value: e.value,
    color: e.color ?? BAR_COLORS[idx % BAR_COLORS.length],
    ratio: maxValue > 0 ? e.value / maxValue : 0,
    percent: totalShown > 0 ? e.value / totalShown : 0,
  }));

  const totalVal =
    typeof data.total === 'number' && Number.isFinite(data.total) && data.total >= 0
      ? data.total
      : totalShown > 0
        ? totalShown
        : null;

  const priorVal =
    typeof data.prior_total === 'number' &&
    Number.isFinite(data.prior_total) &&
    data.prior_total >= 0
      ? data.prior_total
      : null;

  let deltaPercent: number | null = null;
  let deltaDirection: 'up' | 'down' | 'flat' | null = null;
  if (totalVal !== null && priorVal !== null && priorVal > 0) {
    deltaPercent = ((totalVal - priorVal) / priorVal) * 100;
    deltaDirection = deltaPercent > 0.5 ? 'up' : deltaPercent < -0.5 ? 'down' : 'flat';
  }

  return {
    entries,
    maxValue,
    totalShown,
    total: totalVal,
    priorTotal: priorVal,
    deltaPercent,
    deltaDirection,
  };
}

/** Compact number formatter for the hero total (32,400 → "32.4k"). */
export function formatCompactNumber(n: number): string {
  if (!Number.isFinite(n)) return '—';
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 10_000) return `${Math.round(n / 1_000)}k`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${Math.round(n)}`;
}
