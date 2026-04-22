/**
 * Domain types for the AI volume-breakdown response.
 * Mirrors VolumeBreakdownData in ai/models/schemas.py.
 */

export interface VolumeBreakdownEntry {
  label: string;
  value: number;
  color?: string;
}

export interface VolumeBreakdownData {
  title: string;
  unit: string;
  total?: number;
  prior_total?: number;
  period_label?: string;
  entries: VolumeBreakdownEntry[];
  summary?: string;
}

function isEntry(value: unknown): value is VolumeBreakdownEntry {
  if (!value || typeof value !== 'object') return false;
  const e = value as Record<string, unknown>;
  if (typeof e.label !== 'string' || e.label.length === 0) return false;
  if (typeof e.value !== 'number' || !Number.isFinite(e.value) || e.value < 0) return false;
  if (e.color !== undefined && typeof e.color !== 'string') return false;
  return true;
}

export function isVolumeBreakdownData(value: unknown): value is VolumeBreakdownData {
  if (!value || typeof value !== 'object') return false;
  const d = value as Record<string, unknown>;
  if (typeof d.title !== 'string' || d.title.length === 0) return false;
  if (typeof d.unit !== 'string') return false;
  if (!Array.isArray(d.entries) || d.entries.length === 0) return false;
  if (!d.entries.every(isEntry)) return false;
  if (d.total !== undefined && (typeof d.total !== 'number' || !Number.isFinite(d.total))) {
    return false;
  }
  if (
    d.prior_total !== undefined &&
    (typeof d.prior_total !== 'number' || !Number.isFinite(d.prior_total))
  ) {
    return false;
  }
  return true;
}
