import {
  deriveProgressChart,
  deriveVolumeBreakdown,
  deriveStrengthCurve,
  deriveMuscleBalance,
  deriveAllInsights,
} from '@/logic/insightsDerivation';
import type { WorkoutLog } from '@/types/workoutLog';

// ── Builders ────────────────────────────────────────────────────────────────

function daysAgoDate(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(17, 0, 0, 0);
  return d;
}

function makeLog(opts: {
  daysAgo: number;
  focus?: 'push' | 'pull' | 'legs' | 'upper';
  exercises: Array<{
    id: string;
    name: string;
    sets: Array<{ weight: number; reps: number; isPR?: boolean }>;
    prType?: 'weight' | 'reps' | 'volume' | 'one_rep_max';
  }>;
}): WorkoutLog {
  const d = daysAgoDate(opts.daysAgo);
  return {
    userId: 'u1',
    workoutName: 'Test',
    workoutFocus: opts.focus,
    startedAt: d,
    completedAt: d,
    durationMinutes: 50,
    exercises: opts.exercises.map((e) => ({
      exerciseId: e.id,
      exerciseName: e.name,
      sets: e.sets.map((s, i) => ({
        setNumber: i + 1,
        weight: s.weight,
        reps: s.reps,
        completed: true,
        isPR: !!s.isPR,
      })),
      personalRecordType: e.prType ?? null,
    })),
    totalVolume: 0,
    totalSets: 0,
    totalReps: 0,
    exercisesCompleted: opts.exercises.length,
    exercisesSkipped: 0,
    prsHit: 0,
    createdAt: d,
    weightUnit: 'lbs',
  };
}

// ── deriveProgressChart ────────────────────────────────────────────────────

describe('deriveProgressChart', () => {
  it('returns null with fewer than 2 logs', () => {
    expect(deriveProgressChart([])).toBeNull();
    expect(
      deriveProgressChart([
        makeLog({
          daysAgo: 1,
          exercises: [{ id: 'bench', name: 'Bench', sets: [{ weight: 100, reps: 5 }] }],
        }),
      ]),
    ).toBeNull();
  });

  it('builds up to 3 series ranked by session count', () => {
    const logs = [
      makeLog({
        daysAgo: 30,
        exercises: [
          { id: 'bench', name: 'Bench', sets: [{ weight: 180, reps: 5 }] },
          { id: 'squat', name: 'Squat', sets: [{ weight: 280, reps: 5 }] },
          { id: 'dl', name: 'Deadlift', sets: [{ weight: 350, reps: 3 }] },
          { id: 'row', name: 'Row', sets: [{ weight: 160, reps: 8 }] },
        ],
      }),
      makeLog({
        daysAgo: 20,
        exercises: [
          { id: 'bench', name: 'Bench', sets: [{ weight: 185, reps: 5 }] },
          { id: 'squat', name: 'Squat', sets: [{ weight: 285, reps: 5 }] },
          { id: 'dl', name: 'Deadlift', sets: [{ weight: 355, reps: 3 }] },
        ],
      }),
      makeLog({
        daysAgo: 10,
        exercises: [
          { id: 'bench', name: 'Bench', sets: [{ weight: 190, reps: 5 }] },
          { id: 'squat', name: 'Squat', sets: [{ weight: 290, reps: 5 }] },
        ],
      }),
    ];
    const out = deriveProgressChart(logs);
    expect(out).not.toBeNull();
    expect(out!.series.length).toBe(3);
    // Bench has 3 sessions, squat 3, dl 2 — bench or squat is first.
    const labels = out!.series.map((s) => s.label);
    expect(labels).toContain('Bench');
    expect(labels).toContain('Squat');
    expect(labels).toContain('Deadlift');
    // Row had only 1 session — excluded
    expect(labels).not.toContain('Row');
  });

  it('points are sorted ascending by date', () => {
    const logs = [
      makeLog({
        daysAgo: 5,
        exercises: [{ id: 'bench', name: 'Bench', sets: [{ weight: 200, reps: 5 }] }],
      }),
      makeLog({
        daysAgo: 20,
        exercises: [{ id: 'bench', name: 'Bench', sets: [{ weight: 180, reps: 5 }] }],
      }),
      makeLog({
        daysAgo: 10,
        exercises: [{ id: 'bench', name: 'Bench', sets: [{ weight: 190, reps: 5 }] }],
      }),
    ];
    const out = deriveProgressChart(logs);
    expect(out).not.toBeNull();
    const pts = out!.series[0].points.map((p) => p.value);
    expect(pts).toEqual([180, 190, 200]);
  });

  it('dedupes same-day entries keeping the heaviest', () => {
    const d = daysAgoDate(5);
    const logs: WorkoutLog[] = [
      { ...makeLog({ daysAgo: 5, exercises: [{ id: 'bench', name: 'Bench', sets: [{ weight: 180, reps: 5 }] }] }), startedAt: d, completedAt: d },
      { ...makeLog({ daysAgo: 5, exercises: [{ id: 'bench', name: 'Bench', sets: [{ weight: 205, reps: 5 }] }] }), startedAt: d, completedAt: d },
      { ...makeLog({ daysAgo: 15, exercises: [{ id: 'bench', name: 'Bench', sets: [{ weight: 175, reps: 5 }] }] }), startedAt: daysAgoDate(15), completedAt: daysAgoDate(15) },
    ];
    const out = deriveProgressChart(logs);
    expect(out).not.toBeNull();
    expect(out!.series[0].points.map((p) => p.value)).toEqual([175, 205]);
  });

  it('ignores exercises with no weight', () => {
    const logs = [
      makeLog({
        daysAgo: 5,
        exercises: [{ id: 'plank', name: 'Plank', sets: [{ weight: 0, reps: 60 }] }],
      }),
      makeLog({
        daysAgo: 10,
        exercises: [{ id: 'plank', name: 'Plank', sets: [{ weight: 0, reps: 60 }] }],
      }),
    ];
    expect(deriveProgressChart(logs)).toBeNull();
  });
});

// ── deriveVolumeBreakdown ──────────────────────────────────────────────────

describe('deriveVolumeBreakdown', () => {
  it('returns null with no logs', () => {
    expect(deriveVolumeBreakdown([])).toBeNull();
  });

  it('buckets this-week volume by workoutFocus', () => {
    const logs = [
      makeLog({
        daysAgo: 2,
        focus: 'push',
        exercises: [{ id: 'bench', name: 'Bench', sets: [{ weight: 100, reps: 10 }] }],
      }),
      makeLog({
        daysAgo: 4,
        focus: 'pull',
        exercises: [{ id: 'row', name: 'Row', sets: [{ weight: 100, reps: 10 }] }],
      }),
      makeLog({
        daysAgo: 1,
        focus: 'legs',
        exercises: [{ id: 'squat', name: 'Squat', sets: [{ weight: 200, reps: 5 }] }],
      }),
    ];
    const out = deriveVolumeBreakdown(logs);
    expect(out).not.toBeNull();
    const labels = out!.entries.map((e) => e.label);
    expect(labels).toContain('Push');
    expect(labels).toContain('Pull');
    expect(labels).toContain('Legs');
  });

  it('sorts entries descending by volume', () => {
    const logs = [
      makeLog({
        daysAgo: 1,
        focus: 'push',
        exercises: [{ id: 'bench', name: 'Bench', sets: [{ weight: 50, reps: 10 }] }],
      }),
      makeLog({
        daysAgo: 2,
        focus: 'legs',
        exercises: [{ id: 'squat', name: 'Squat', sets: [{ weight: 200, reps: 10 }] }],
      }),
    ];
    const out = deriveVolumeBreakdown(logs);
    expect(out).not.toBeNull();
    expect(out!.entries[0].label).toBe('Legs');
    expect(out!.entries[1].label).toBe('Push');
  });

  it('populates prior_total from days 7-14', () => {
    const logs = [
      makeLog({
        daysAgo: 3,
        focus: 'push',
        exercises: [{ id: 'bench', name: 'Bench', sets: [{ weight: 100, reps: 10 }] }],
      }),
      makeLog({
        daysAgo: 10,
        focus: 'push',
        exercises: [{ id: 'bench', name: 'Bench', sets: [{ weight: 100, reps: 5 }] }],
      }),
    ];
    const out = deriveVolumeBreakdown(logs);
    expect(out).not.toBeNull();
    expect(out!.total).toBe(1000);
    expect(out!.prior_total).toBe(500);
  });

  it('classifies via exercise keyword when focus is missing', () => {
    const logs = [
      makeLog({
        daysAgo: 1,
        exercises: [{ id: 'barbell_bench_press', name: 'Bench', sets: [{ weight: 100, reps: 10 }] }],
      }),
      makeLog({
        daysAgo: 2,
        exercises: [{ id: 'back_squat', name: 'Squat', sets: [{ weight: 200, reps: 5 }] }],
      }),
    ];
    const out = deriveVolumeBreakdown(logs);
    expect(out).not.toBeNull();
    const labels = out!.entries.map((e) => e.label);
    expect(labels).toContain('Push');
    expect(labels).toContain('Legs');
  });

  it('ignores logs older than 14 days', () => {
    const logs = [
      makeLog({
        daysAgo: 3,
        focus: 'push',
        exercises: [{ id: 'bench', name: 'Bench', sets: [{ weight: 100, reps: 10 }] }],
      }),
      makeLog({
        daysAgo: 60,
        focus: 'push',
        exercises: [{ id: 'bench', name: 'Bench', sets: [{ weight: 999, reps: 999 }] }],
      }),
    ];
    const out = deriveVolumeBreakdown(logs);
    expect(out).not.toBeNull();
    expect(out!.total).toBe(1000); // 60-day-old log is ignored
  });
});

// ── deriveStrengthCurve ────────────────────────────────────────────────────

describe('deriveStrengthCurve', () => {
  it('returns null if no exercise has 2+ sessions', () => {
    const logs = [
      makeLog({ daysAgo: 3, exercises: [{ id: 'bench', name: 'Bench', sets: [{ weight: 100, reps: 5 }] }] }),
      makeLog({ daysAgo: 2, exercises: [{ id: 'squat', name: 'Squat', sets: [{ weight: 200, reps: 5 }] }] }),
    ];
    expect(deriveStrengthCurve(logs)).toBeNull();
  });

  it('picks the exercise with most sessions', () => {
    const logs = [
      makeLog({ daysAgo: 10, exercises: [{ id: 'bench', name: 'Bench', sets: [{ weight: 180, reps: 5 }] }] }),
      makeLog({ daysAgo: 7, exercises: [{ id: 'bench', name: 'Bench', sets: [{ weight: 185, reps: 5 }] }] }),
      makeLog({ daysAgo: 3, exercises: [{ id: 'bench', name: 'Bench', sets: [{ weight: 190, reps: 5 }] }] }),
      makeLog({ daysAgo: 5, exercises: [{ id: 'squat', name: 'Squat', sets: [{ weight: 280, reps: 5 }] }] }),
    ];
    const out = deriveStrengthCurve(logs);
    expect(out).not.toBeNull();
    expect(out!.exercise_name).toBe('Bench');
    expect(out!.points.length).toBe(3);
    expect(out!.points.map((p) => p.value)).toEqual([180, 185, 190]);
  });

  it('flags PRs via set.isPR', () => {
    const logs = [
      makeLog({ daysAgo: 10, exercises: [{ id: 'bench', name: 'Bench', sets: [{ weight: 180, reps: 5 }] }] }),
      makeLog({
        daysAgo: 3,
        exercises: [{ id: 'bench', name: 'Bench', sets: [{ weight: 200, reps: 5, isPR: true }] }],
      }),
    ];
    const out = deriveStrengthCurve(logs);
    expect(out).not.toBeNull();
    expect(out!.points[1].is_pr).toBe(true);
    expect(out!.points[0].is_pr).toBe(false);
  });

  it('also flags PRs via exercise.personalRecordType', () => {
    const logs = [
      makeLog({ daysAgo: 10, exercises: [{ id: 'bench', name: 'Bench', sets: [{ weight: 180, reps: 5 }] }] }),
      makeLog({
        daysAgo: 3,
        exercises: [
          { id: 'bench', name: 'Bench', sets: [{ weight: 200, reps: 5 }], prType: 'weight' },
        ],
      }),
    ];
    const out = deriveStrengthCurve(logs);
    expect(out).not.toBeNull();
    expect(out!.points[1].is_pr).toBe(true);
  });

  it('derives trend_label from delta', () => {
    const logs = [
      makeLog({ daysAgo: 28, exercises: [{ id: 'bench', name: 'Bench', sets: [{ weight: 180, reps: 5 }] }] }),
      makeLog({ daysAgo: 14, exercises: [{ id: 'bench', name: 'Bench', sets: [{ weight: 190, reps: 5 }] }] }),
      makeLog({ daysAgo: 2, exercises: [{ id: 'bench', name: 'Bench', sets: [{ weight: 200, reps: 5 }] }] }),
    ];
    const out = deriveStrengthCurve(logs);
    expect(out).not.toBeNull();
    expect(out!.trend_label).toMatch(/\+20/);
  });
});

// ── deriveMuscleBalance ────────────────────────────────────────────────────

describe('deriveMuscleBalance', () => {
  it('returns null with fewer than 3 muscle groups', () => {
    const logs = [
      makeLog({
        daysAgo: 2,
        focus: 'push',
        exercises: [{ id: 'bench', name: 'Bench', sets: [{ weight: 100, reps: 5 }] }],
      }),
      makeLog({
        daysAgo: 3,
        focus: 'pull',
        exercises: [{ id: 'row', name: 'Row', sets: [{ weight: 100, reps: 5 }] }],
      }),
    ];
    expect(deriveMuscleBalance(logs)).toBeNull();
  });

  it('counts sets per group over last 30 days', () => {
    const logs = [
      makeLog({
        daysAgo: 2,
        focus: 'push',
        exercises: [{ id: 'bench', name: 'Bench', sets: [{ weight: 100, reps: 5 }, { weight: 100, reps: 5 }] }],
      }),
      makeLog({
        daysAgo: 5,
        focus: 'pull',
        exercises: [{ id: 'row', name: 'Row', sets: [{ weight: 100, reps: 8 }, { weight: 100, reps: 8 }, { weight: 90, reps: 10 }] }],
      }),
      makeLog({
        daysAgo: 10,
        focus: 'legs',
        exercises: [{ id: 'squat', name: 'Squat', sets: [{ weight: 200, reps: 5 }] }],
      }),
    ];
    const out = deriveMuscleBalance(logs);
    expect(out).not.toBeNull();
    const push = out!.axes.find((a) => a.label === 'Push');
    const pull = out!.axes.find((a) => a.label === 'Pull');
    const legs = out!.axes.find((a) => a.label === 'Legs');
    expect(push?.user_value).toBe(2);
    expect(pull?.user_value).toBe(3);
    expect(legs?.user_value).toBe(1);
  });

  it('ignores logs older than 30 days', () => {
    const logs = [
      makeLog({ daysAgo: 2, focus: 'push', exercises: [{ id: 'bench', name: 'x', sets: [{ weight: 100, reps: 5 }] }] }),
      makeLog({ daysAgo: 5, focus: 'pull', exercises: [{ id: 'row', name: 'x', sets: [{ weight: 100, reps: 5 }] }] }),
      makeLog({ daysAgo: 10, focus: 'legs', exercises: [{ id: 'squat', name: 'x', sets: [{ weight: 100, reps: 5 }] }] }),
      makeLog({ daysAgo: 45, focus: 'push', exercises: [{ id: 'bench', name: 'x', sets: Array(20).fill({ weight: 100, reps: 5 }) }] }),
    ];
    const out = deriveMuscleBalance(logs);
    const push = out!.axes.find((a) => a.label === 'Push');
    expect(push?.user_value).toBe(1); // the 45-day-old session is ignored
  });
});

// ── deriveAllInsights ───────────────────────────────────────────────────────

describe('deriveAllInsights', () => {
  it('returns all-nulls for empty input', () => {
    const out = deriveAllInsights([]);
    expect(out.progress).toBeNull();
    expect(out.volume).toBeNull();
    expect(out.strength).toBeNull();
    expect(out.balance).toBeNull();
  });

  it('returns some populated fields on rich input', () => {
    const logs: WorkoutLog[] = [];
    for (let i = 0; i < 8; i++) {
      logs.push(
        makeLog({
          daysAgo: i * 4 + 1,
          focus: i % 3 === 0 ? 'push' : i % 3 === 1 ? 'pull' : 'legs',
          exercises: [
            { id: 'bench', name: 'Bench', sets: [{ weight: 180 + i * 2, reps: 5 }] },
            { id: 'squat', name: 'Squat', sets: [{ weight: 280 + i * 3, reps: 5 }] },
          ],
        }),
      );
    }
    const out = deriveAllInsights(logs);
    expect(out.progress).not.toBeNull();
    expect(out.volume).not.toBeNull();
    expect(out.strength).not.toBeNull();
    expect(out.balance).not.toBeNull();
  });
});
