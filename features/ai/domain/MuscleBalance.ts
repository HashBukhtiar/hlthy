/**
 * Domain types for the AI muscle-balance (radar) response.
 * Mirrors MuscleBalanceData in ai/models/schemas.py.
 */

export type MuscleBalanceFlag = 'under' | 'over' | 'balanced';

export interface MuscleBalanceAxis {
  label: string;
  user_value: number;
  target_value: number;
  flag?: MuscleBalanceFlag;
}

export interface MuscleBalanceData {
  title: string;
  period_label?: string;
  unit: string;
  axes: MuscleBalanceAxis[];
  summary?: string;
}

const FLAG_VALUES: ReadonlySet<MuscleBalanceFlag> = new Set(['under', 'over', 'balanced']);

function isAxis(value: unknown): value is MuscleBalanceAxis {
  if (!value || typeof value !== 'object') return false;
  const a = value as Record<string, unknown>;
  if (typeof a.label !== 'string' || a.label.length === 0) return false;
  if (typeof a.user_value !== 'number' || !Number.isFinite(a.user_value) || a.user_value < 0) {
    return false;
  }
  if (typeof a.target_value !== 'number' || !Number.isFinite(a.target_value) || a.target_value < 0) {
    return false;
  }
  if (a.flag !== undefined) {
    if (typeof a.flag !== 'string' || !FLAG_VALUES.has(a.flag as MuscleBalanceFlag)) {
      return false;
    }
  }
  return true;
}

export function isMuscleBalanceData(value: unknown): value is MuscleBalanceData {
  if (!value || typeof value !== 'object') return false;
  const d = value as Record<string, unknown>;
  if (typeof d.title !== 'string' || d.title.length === 0) return false;
  if (typeof d.unit !== 'string') return false;
  if (!Array.isArray(d.axes) || d.axes.length < 3) return false;
  return d.axes.every(isAxis);
}
