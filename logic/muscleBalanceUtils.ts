/**
 * Pure helpers for MuscleBalanceCard — sanitize axes, compute radar geometry.
 */
import type {
  MuscleBalanceAxis,
  MuscleBalanceData,
  MuscleBalanceFlag,
} from '@/features/ai/domain/MuscleBalance';

export const MAX_AXES = 8;
export const MIN_AXES = 3;

export interface PreparedAxis {
  label: string;
  userValue: number;
  targetValue: number;
  userRatio: number; // normalized in [0, 1] vs scaleMax
  targetRatio: number;
  flag: MuscleBalanceFlag;
  /** angle in radians from top (12 o'clock), clockwise */
  angle: number;
}

export interface PreparedMuscleBalance {
  axes: PreparedAxis[];
  scaleMax: number;
  asymmetryCount: number;
}

/**
 * Build geometry-ready axes. Each axis is assigned an angle starting at
 * -π/2 (top) and sweeping clockwise. Values are normalized against the
 * largest of user or target across all axes (so the ring fills the card).
 */
export function prepareMuscleBalance(data: MuscleBalanceData): PreparedMuscleBalance {
  const raw: MuscleBalanceAxis[] = Array.isArray(data.axes) ? data.axes : [];

  const sanitized = raw
    .filter(
      (a): a is MuscleBalanceAxis =>
        !!a &&
        typeof a.label === 'string' &&
        a.label.length > 0 &&
        typeof a.user_value === 'number' &&
        Number.isFinite(a.user_value) &&
        a.user_value >= 0 &&
        typeof a.target_value === 'number' &&
        Number.isFinite(a.target_value) &&
        a.target_value >= 0,
    )
    .slice(0, MAX_AXES);

  if (sanitized.length < MIN_AXES) {
    return { axes: [], scaleMax: 0, asymmetryCount: 0 };
  }

  // Leave a little headroom above the max so the user polygon doesn't
  // clip the ring when they've exceeded the target.
  const rawMax = sanitized.reduce(
    (m, a) => Math.max(m, a.user_value, a.target_value),
    0,
  );
  const scaleMax = rawMax === 0 ? 1 : rawMax * 1.1;

  const axes: PreparedAxis[] = sanitized.map((a, idx) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * idx) / sanitized.length;
    const flag = a.flag ?? deriveFlag(a.user_value, a.target_value);
    return {
      label: a.label,
      userValue: a.user_value,
      targetValue: a.target_value,
      userRatio: a.user_value / scaleMax,
      targetRatio: a.target_value / scaleMax,
      flag,
      angle,
    };
  });

  const asymmetryCount = axes.filter((a) => a.flag !== 'balanced').length;

  return { axes, scaleMax, asymmetryCount };
}

function deriveFlag(user: number, target: number): MuscleBalanceFlag {
  if (target <= 0) return 'balanced';
  const ratio = user / target;
  if (ratio < 0.75) return 'under';
  if (ratio > 1.25) return 'over';
  return 'balanced';
}

export interface PolarPoint {
  x: number;
  y: number;
}

/**
 * Compute the (x, y) pixel for an axis given a ratio [0, 1] and center/radius.
 * Useful both for the polygon vertices and for label placement.
 */
export function polarXY(
  cx: number,
  cy: number,
  radius: number,
  angle: number,
  ratio: number,
): PolarPoint {
  const r = Math.max(0, Math.min(1, ratio)) * radius;
  return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r };
}

/** Build a closed SVG-style path string from polygon vertices. */
export function buildPolygonPath(points: PolarPoint[]): string {
  if (points.length === 0) return '';
  const cmds = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`);
  cmds.push('Z');
  return cmds.join(' ');
}
