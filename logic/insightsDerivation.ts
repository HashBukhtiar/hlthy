/**
 * Pure derivation of insight-chart data from raw workout logs +
 * exercise history. No React, no Firestore.
 *
 * Consumed by features/insights/ui/useInsights.ts and unit-tested in
 * logic/__tests__/insightsDerivation.test.ts.
 */
import type {
  WorkoutLog,
  ExerciseLog,
  SetLog,
  ExerciseHistory,
} from '@/types/workoutLog';
import type { ProgressChartData } from '@/features/ai/domain/ProgressChart';
import type { VolumeBreakdownData } from '@/features/ai/domain/VolumeBreakdown';
import type {
  StrengthCurveData,
  StrengthCurvePoint,
} from '@/features/ai/domain/StrengthCurve';
import type { MuscleBalanceData } from '@/features/ai/domain/MuscleBalance';

// Aurora-adjacent palette used when the chart needs its own color ramp.
const SERIES_COLORS = ['#FF2D55', '#FF7A00', '#9D4EDD', '#45B7D1'];

// ── Date helpers ────────────────────────────────────────────────────────────

function toDate(v: unknown): Date | null {
  if (!v) return null;
  // Firestore Timestamp (shape: { toDate() })
  if (typeof v === 'object' && v !== null && 'toDate' in v) {
    try {
      const d = (v as { toDate: () => Date }).toDate();
      return d instanceof Date && !isNaN(d.getTime()) ? d : null;
    } catch {
      return null;
    }
  }
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (typeof v === 'number') return new Date(v);
  if (typeof v === 'string') {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ── Helpers on set data ────────────────────────────────────────────────────

function workingSets(ex: ExerciseLog): SetLog[] {
  return (ex.sets ?? []).filter((s) => s.completed && !s.isWarmup);
}

function topSetWeight(ex: ExerciseLog): number {
  return workingSets(ex).reduce((m, s) => Math.max(m, s.weight || 0), 0);
}

function exerciseVolume(ex: ExerciseLog): number {
  return workingSets(ex).reduce((t, s) => t + (s.weight || 0) * (s.reps || 0), 0);
}

function setCount(ex: ExerciseLog): number {
  return workingSets(ex).length;
}

// ── Focus / muscle-group mapping ───────────────────────────────────────────

type MuscleGroup = 'Push' | 'Pull' | 'Legs' | 'Core' | 'Arms' | 'Other';

const FOCUS_TO_GROUP: Record<string, MuscleGroup> = {
  push: 'Push',
  pull: 'Pull',
  legs: 'Legs',
  core: 'Core',
  arms: 'Arms',
  upper: 'Push', // "upper" splits across push/pull; bucket to push for simplicity
  lower: 'Legs',
  full_body: 'Legs',
  cardio: 'Other',
};

// Fallback: keywords in exerciseId → muscle group, used when workoutFocus is missing.
// Order matters — first match wins. Legs is checked before Pull so "back_squat"
// matches squat (Legs) before it matches "back" (Pull).
const EXERCISE_KEYWORD_TO_GROUP: Array<[RegExp, MuscleGroup]> = [
  [/squat|lunge|leg_press|rdl|romanian|glute|calf|hamstring|quad/i, 'Legs'],
  [/plank|crunch|sit.?up|ab_|hollow|leg_raise|core|oblique/i, 'Core'],
  [/bench|dip|push.?up|fly|chest|overhead_press|shoulder_press/i, 'Push'],
  [/row|pull.?up|chin.?up|pulldown|deadlift|face.?pull|shrug|lat_/i, 'Pull'],
  [/curl|tricep|pushdown|skullcrusher|hammer/i, 'Arms'],
];

function groupForExercise(ex: ExerciseLog, fallbackFocus?: string): MuscleGroup {
  if (fallbackFocus && FOCUS_TO_GROUP[fallbackFocus]) {
    return FOCUS_TO_GROUP[fallbackFocus];
  }
  const id = ex.exerciseId ?? '';
  for (const [re, g] of EXERCISE_KEYWORD_TO_GROUP) {
    if (re.test(id)) return g;
  }
  return 'Other';
}

// ── 1. Progress chart: top 3 exercises by session count, top-set weight over time ──

export function deriveProgressChart(logs: WorkoutLog[]): ProgressChartData | null {
  if (!logs || logs.length < 2) return null;

  // Map exerciseId → { name, perSession: [{ date, weight }] }
  type Session = { ts: number; date: string; weight: number };
  const byExercise = new Map<
    string,
    { name: string; sessions: Session[] }
  >();

  for (const log of logs) {
    const d = toDate(log.completedAt) ?? toDate(log.startedAt);
    if (!d) continue;
    const iso = toISODate(d);
    for (const ex of log.exercises ?? []) {
      if (!ex.exerciseId) continue;
      const w = topSetWeight(ex);
      if (w <= 0) continue;
      const entry = byExercise.get(ex.exerciseId) ?? {
        name: ex.exerciseName ?? ex.exerciseId,
        sessions: [],
      };
      entry.sessions.push({ ts: d.getTime(), date: iso, weight: w });
      byExercise.set(ex.exerciseId, entry);
    }
  }

  // Pick top 3 exercises by session count (with at least 2 sessions each).
  const ranked = Array.from(byExercise.entries())
    .filter(([, v]) => v.sessions.length >= 2)
    .sort((a, b) => b[1].sessions.length - a[1].sessions.length)
    .slice(0, 3);

  if (ranked.length === 0) return null;

  const series = ranked.map(([, v], idx) => {
    // Per session, keep the heaviest top-set (dedupe by date, max-wins).
    const byDate = new Map<string, { ts: number; weight: number }>();
    for (const s of v.sessions) {
      const existing = byDate.get(s.date);
      if (!existing || s.weight > existing.weight) {
        byDate.set(s.date, { ts: s.ts, weight: s.weight });
      }
    }
    const points = Array.from(byDate.entries())
      .map(([date, { ts, weight }]) => ({ ts, date, value: weight }))
      .sort((a, b) => a.ts - b.ts)
      .map(({ date, value }) => ({ date, value }));
    return {
      label: v.name,
      color: SERIES_COLORS[idx % SERIES_COLORS.length],
      points,
    };
  });

  const allPoints = series.flatMap((s) => s.points);
  const firstDate = allPoints.reduce(
    (m, p) => (m === null || p.date < m ? p.date : m),
    null as string | null,
  );
  const lastDate = allPoints.reduce(
    (m, p) => (m === null || p.date > m ? p.date : m),
    null as string | null,
  );
  const weekSpan =
    firstDate && lastDate
      ? Math.max(
          1,
          Math.round(
            (new Date(lastDate).getTime() - new Date(firstDate).getTime()) /
              (7 * 24 * 3600 * 1000),
          ),
        )
      : 0;

  return {
    title: weekSpan > 0 ? `Top lifts — last ${weekSpan} wk` : 'Top lifts',
    metric: 'weight',
    unit: 'lbs',
    series,
    x_axis_label: 'Date',
    y_axis_label: 'Top set (lbs)',
  };
}

// ── 2. Volume breakdown: last 7 days, grouped by muscle group ──────────────

export function deriveVolumeBreakdown(logs: WorkoutLog[]): VolumeBreakdownData | null {
  if (!logs || logs.length === 0) return null;

  const weekCutoff = daysAgo(7);
  const priorCutoff = daysAgo(14);

  const weekByGroup = new Map<MuscleGroup, number>();
  let weekTotal = 0;
  let priorTotal = 0;

  for (const log of logs) {
    const d = toDate(log.completedAt) ?? toDate(log.startedAt);
    if (!d) continue;
    const focus = log.workoutFocus;
    const isThisWeek = d >= weekCutoff;
    const isPriorWeek = d >= priorCutoff && d < weekCutoff;
    if (!isThisWeek && !isPriorWeek) continue;

    for (const ex of log.exercises ?? []) {
      const vol = exerciseVolume(ex);
      if (vol <= 0) continue;
      if (isThisWeek) {
        const g = groupForExercise(ex, focus);
        weekByGroup.set(g, (weekByGroup.get(g) ?? 0) + vol);
        weekTotal += vol;
      } else {
        priorTotal += vol;
      }
    }
  }

  if (weekByGroup.size === 0) return null;

  const entries = Array.from(weekByGroup.entries())
    .map(([label, value], idx) => ({
      label,
      value: Math.round(value),
      color: SERIES_COLORS[idx % SERIES_COLORS.length],
    }))
    .sort((a, b) => b.value - a.value);

  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 6);
  const periodLabel = `${start.getMonth() + 1}/${start.getDate()} – ${end.getMonth() + 1}/${end.getDate()}`;

  return {
    title: 'This week',
    unit: 'lbs',
    total: Math.round(weekTotal),
    prior_total: priorTotal > 0 ? Math.round(priorTotal) : undefined,
    period_label: periodLabel,
    entries,
  };
}

// ── 3. Strength curve: single exercise with most sessions, with PR flags ───

export function deriveStrengthCurve(
  logs: WorkoutLog[],
  history?: Record<string, ExerciseHistory>,
): StrengthCurveData | null {
  if (!logs || logs.length < 2) return null;

  // Count sessions per exercise; pick the one with most (ties broken by PR presence).
  const sessionCount = new Map<string, { name: string; count: number }>();
  for (const log of logs) {
    for (const ex of log.exercises ?? []) {
      if (!ex.exerciseId) continue;
      if (setCount(ex) === 0) continue;
      const entry = sessionCount.get(ex.exerciseId) ?? {
        name: ex.exerciseName ?? ex.exerciseId,
        count: 0,
      };
      entry.count += 1;
      sessionCount.set(ex.exerciseId, entry);
    }
  }

  const best = Array.from(sessionCount.entries())
    .filter(([, v]) => v.count >= 2)
    .sort((a, b) => b[1].count - a[1].count)[0];
  if (!best) return null;

  const [exerciseId, meta] = best;
  const points: StrengthCurvePoint[] = [];

  // Collect one point per workout log containing this exercise.
  for (const log of logs) {
    const d = toDate(log.completedAt) ?? toDate(log.startedAt);
    if (!d) continue;
    const ex = (log.exercises ?? []).find((e) => e.exerciseId === exerciseId);
    if (!ex) continue;
    const sets = workingSets(ex);
    if (sets.length === 0) continue;
    // Pick the heaviest set of the session.
    const top = sets.reduce((m, s) => (s.weight > m.weight ? s : m), sets[0]);
    points.push({
      date: toISODate(d),
      value: top.weight,
      reps: top.reps,
      is_pr: !!top.isPR || !!ex.personalRecordType,
    });
  }

  if (points.length < 2) return null;

  // Sort ascending by date.
  points.sort((a, b) => a.date.localeCompare(b.date));

  const first = points[0].value;
  const last = points[points.length - 1].value;
  const delta = last - first;
  const weeks = Math.max(
    1,
    Math.round(
      (new Date(points[points.length - 1].date).getTime() -
        new Date(points[0].date).getTime()) /
        (7 * 24 * 3600 * 1000),
    ),
  );
  const trendLabel = delta === 0 ? null : `${delta > 0 ? '+' : ''}${delta} / ${weeks}wk`;

  // Projected next PR: if trending up and history has 1RM, nudge current max +5lbs
  // as a conservative next-session target.
  let projectedNext: number | undefined;
  const hist = history?.[exerciseId];
  if (delta > 0 && hist?.personalRecords?.maxWeight?.value) {
    projectedNext = Math.round(hist.personalRecords.maxWeight.value + 5);
  }

  return {
    exercise_name: meta.name,
    metric: 'weight',
    unit: 'lbs',
    points,
    trend_label: trendLabel ?? undefined,
    projected_next: projectedNext,
  };
}

// ── 4. Muscle balance: last 30 days, sets per group ────────────────────────

export function deriveMuscleBalance(logs: WorkoutLog[]): MuscleBalanceData | null {
  if (!logs || logs.length === 0) return null;

  const cutoff = daysAgo(30);
  const setsByGroup = new Map<MuscleGroup, number>();

  for (const log of logs) {
    const d = toDate(log.completedAt) ?? toDate(log.startedAt);
    if (!d || d < cutoff) continue;
    const focus = log.workoutFocus;
    for (const ex of log.exercises ?? []) {
      const n = setCount(ex);
      if (n === 0) continue;
      const g = groupForExercise(ex, focus);
      setsByGroup.set(g, (setsByGroup.get(g) ?? 0) + n);
    }
  }

  if (setsByGroup.size < 3) return null;

  // Target: median of the 3 biggest buckets. Smaller buckets (core, arms)
  // get half the target since they're accessory-heavy in most splits.
  const values = Array.from(setsByGroup.values()).sort((a, b) => b - a);
  const baseline = values[Math.min(1, values.length - 1)]; // second-highest as the "reasonable" baseline
  const ACCESSORY_GROUPS = new Set<MuscleGroup>(['Core', 'Arms']);

  const axes = Array.from(setsByGroup.entries())
    .filter(([g]) => g !== 'Other')
    .map(([label, userValue]) => {
      const target = ACCESSORY_GROUPS.has(label) ? Math.round(baseline / 2) : baseline;
      return {
        label,
        user_value: userValue,
        target_value: Math.max(1, target),
      };
    });

  if (axes.length < 3) return null;

  return {
    title: 'Muscle balance — last 30 days',
    period_label: 'Last 30 days',
    unit: 'sets',
    axes,
  };
}

// ── Combined derivation ────────────────────────────────────────────────────

export interface DerivedInsights {
  progress: ProgressChartData | null;
  volume: VolumeBreakdownData | null;
  strength: StrengthCurveData | null;
  balance: MuscleBalanceData | null;
}

export function deriveAllInsights(
  logs: WorkoutLog[],
  history?: Record<string, ExerciseHistory>,
): DerivedInsights {
  return {
    progress: deriveProgressChart(logs),
    volume: deriveVolumeBreakdown(logs),
    strength: deriveStrengthCurve(logs, history),
    balance: deriveMuscleBalance(logs),
  };
}
