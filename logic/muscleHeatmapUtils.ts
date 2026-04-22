/**
 * Pure helpers for the Muscle Heatmap card.
 *
 * Exports:
 *  - EXERCISE_TO_MUSCLES: keyword-based mapping from exercise names/IDs to
 *    primary (full weight) + secondary (half weight) muscle groups.
 *  - MUSCLE_REGIONS: stylized silhouette geometry for each muscle group, as
 *    SVG path strings in a normalized 100×200 coordinate space.
 *  - deriveMuscleHeatmap: given workout logs, bucket volume per muscle and
 *    compute a 0-1 intensity for each.
 */
import type { WorkoutLog } from '@/types/workoutLog';
import type {
  MuscleHeatmapData,
  MuscleHeatEntry,
  MuscleId,
} from '@/features/insights/domain/MuscleHeatmap';

const SECONDARY_WEIGHT = 0.5;

// ── Exercise → muscles map ──────────────────────────────────────────────────

interface MuscleBinding {
  primary: MuscleId[];
  secondary?: MuscleId[];
}

// Order matters — first regex that matches wins.
// Specific patterns (e.g. `romanian`) must appear before general ones (`deadlift`).
const EXERCISE_RULES: Array<[RegExp, MuscleBinding]> = [
  // Legs — specific first
  [/romanian|rdl/i, { primary: ['hamstrings'], secondary: ['glutes', 'lower_back'] }],
  [/calf/i, { primary: ['calves'] }],
  [/leg_curl|hamstring/i, { primary: ['hamstrings'] }],
  [/leg_extension/i, { primary: ['quads'] }],
  [/glute_bridge|hip_thrust/i, { primary: ['glutes'], secondary: ['hamstrings'] }],
  [/lunge/i, { primary: ['quads'], secondary: ['glutes', 'hamstrings'] }],
  [/leg_press|hack_squat/i, { primary: ['quads'], secondary: ['glutes'] }],
  [/squat/i, { primary: ['quads'], secondary: ['glutes', 'hamstrings'] }],
  [/deadlift/i, { primary: ['hamstrings'], secondary: ['glutes', 'lower_back', 'lats'] }],

  // Pull
  [/face.?pull|rear_delt/i, { primary: ['shoulders_rear'], secondary: ['traps'] }],
  [/pull.?up|chin.?up|lat_pulldown|pulldown/i, { primary: ['lats'], secondary: ['biceps'] }],
  [/row/i, { primary: ['lats'], secondary: ['biceps', 'shoulders_rear'] }],
  [/shrug/i, { primary: ['traps'] }],

  // Arms — specific hand/forearm patterns first so generic "curl" falls through
  // to biceps only if no earlier rule claims it.
  [/skullcrusher|tricep|pushdown|extension_tricep/i, { primary: ['triceps'] }],
  [/wrist_curl|forearm|farmer/i, { primary: ['forearms'] }],
  [/curl|bicep|hammer|preacher/i, { primary: ['biceps'], secondary: ['forearms'] }],

  // Shoulders / Push
  [/lateral_raise|side_raise/i, { primary: ['shoulders_front'] }],
  [/overhead_press|shoulder_press|ohp|military/i, { primary: ['shoulders_front'], secondary: ['triceps'] }],
  [/incline_bench|incline_press/i, { primary: ['chest'], secondary: ['shoulders_front', 'triceps'] }],
  [/fly|chest_fly|pec_deck/i, { primary: ['chest'] }],
  [/bench|chest_press/i, { primary: ['chest'], secondary: ['triceps', 'shoulders_front'] }],
  [/dip/i, { primary: ['triceps'], secondary: ['chest'] }],
  [/push.?up/i, { primary: ['chest'], secondary: ['triceps', 'shoulders_front'] }],

  // Core
  [/oblique|side_plank|russian_twist/i, { primary: ['obliques'] }],
  [/plank|crunch|sit.?up|leg_raise|ab_|hollow/i, { primary: ['abs'] }],
];

export function musclesForExerciseId(exerciseId: string): MuscleBinding | null {
  if (!exerciseId) return null;
  for (const [re, binding] of EXERCISE_RULES) {
    if (re.test(exerciseId)) return binding;
  }
  return null;
}

// ── Heatmap derivation ─────────────────────────────────────────────────────

function toDate(v: unknown): Date | null {
  if (!v) return null;
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

export function deriveMuscleHeatmap(
  logs: WorkoutLog[],
  rangeDays: number = 30,
): MuscleHeatmapData | null {
  if (!logs || logs.length === 0) return null;

  const cutoff = daysAgo(rangeDays);
  const agg = new Map<
    MuscleId,
    { volume: number; sessions: Set<string>; lastTrained: string | null }
  >();

  for (const log of logs) {
    const d = toDate(log.completedAt) ?? toDate(log.startedAt);
    if (!d || d < cutoff) continue;
    const iso = toISODate(d);
    const logId = log.id ?? `${log.workoutName ?? 'log'}-${iso}`;

    for (const ex of log.exercises ?? []) {
      const binding = musclesForExerciseId(ex.exerciseId ?? '');
      if (!binding) continue;
      // Volume from working sets only.
      const vol = (ex.sets ?? []).reduce((t, s) => {
        if (!s.completed || s.isWarmup) return t;
        return t + (s.weight || 0) * (s.reps || 0);
      }, 0);
      if (vol <= 0) continue;

      const addTo = (id: MuscleId, weight: number) => {
        const entry = agg.get(id) ?? {
          volume: 0,
          sessions: new Set<string>(),
          lastTrained: null as string | null,
        };
        entry.volume += vol * weight;
        entry.sessions.add(logId);
        if (!entry.lastTrained || iso > entry.lastTrained) entry.lastTrained = iso;
        agg.set(id, entry);
      };

      for (const id of binding.primary) addTo(id, 1);
      for (const id of binding.secondary ?? []) addTo(id, SECONDARY_WEIGHT);
    }
  }

  if (agg.size === 0) return null;

  const maxVolume = Array.from(agg.values()).reduce(
    (m, e) => Math.max(m, e.volume),
    0,
  );
  if (maxVolume === 0) return null;

  const entries: Partial<Record<MuscleId, MuscleHeatEntry>> = {};
  for (const [muscleId, v] of agg.entries()) {
    entries[muscleId] = {
      muscleId,
      volume: Math.round(v.volume),
      sessions: v.sessions.size,
      intensity: Math.max(0, Math.min(1, v.volume / maxVolume)),
      lastTrained: v.lastTrained,
    };
  }

  const periodLabel =
    rangeDays <= 7
      ? 'Last 7 days'
      : rangeDays <= 31
        ? 'Last 30 days'
        : rangeDays <= 90
          ? 'Last 90 days'
          : 'Last year';

  return {
    title: `Muscle heatmap — ${periodLabel.toLowerCase()}`,
    period_label: periodLabel,
    unit: 'lbs',
    entries,
    maxVolume: Math.round(maxVolume),
  };
}

// ── Intensity → color helpers (for the card) ───────────────────────────────

/**
 * Cold → hot ramp: dim slate for untouched muscles, aurora warm for hotspots.
 * Accepts intensity in [0, 1]; returns a hex color (no alpha). Card layers
 * its own opacity.
 */
export function intensityColor(intensity: number): string {
  const t = Math.max(0, Math.min(1, intensity));
  // Stops: 0 → #3A3B4A (dim), 0.4 → #FF7A00, 0.75 → #FF2D55, 1 → #9D4EDD
  const stops: Array<[number, [number, number, number]]> = [
    [0, [58, 59, 74]],
    [0.25, [120, 80, 80]],
    [0.5, [255, 122, 0]],
    [0.75, [255, 45, 85]],
    [1, [157, 78, 221]],
  ];
  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, c0] = stops[i];
    const [t1, c1] = stops[i + 1];
    if (t >= t0 && t <= t1) {
      const f = (t - t0) / (t1 - t0 || 1);
      const r = Math.round(c0[0] + (c1[0] - c0[0]) * f);
      const g = Math.round(c0[1] + (c1[1] - c0[1]) * f);
      const b = Math.round(c0[2] + (c1[2] - c0[2]) * f);
      return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
    }
  }
  return '#3A3B4A';
}
