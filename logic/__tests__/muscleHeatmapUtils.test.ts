import {
  deriveMuscleHeatmap,
  musclesForExerciseId,
  intensityColor,
} from '@/logic/muscleHeatmapUtils';
import type { WorkoutLog } from '@/types/workoutLog';

function daysAgoDate(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(17, 0, 0, 0);
  return d;
}

function makeLog(opts: {
  daysAgo: number;
  id?: string;
  exercises: Array<{
    id: string;
    name: string;
    sets: Array<{ weight: number; reps: number }>;
  }>;
}): WorkoutLog {
  const d = daysAgoDate(opts.daysAgo);
  return {
    id: opts.id ?? `log-${opts.daysAgo}`,
    userId: 'u1',
    workoutName: 'Test',
    startedAt: d,
    completedAt: d,
    durationMinutes: 45,
    exercises: opts.exercises.map((e) => ({
      exerciseId: e.id,
      exerciseName: e.name,
      sets: e.sets.map((s, i) => ({
        setNumber: i + 1,
        weight: s.weight,
        reps: s.reps,
        completed: true,
      })),
      personalRecordType: null,
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

describe('musclesForExerciseId', () => {
  it('maps bench press to chest primary + triceps/front delts secondary', () => {
    const b = musclesForExerciseId('barbell_bench_press');
    expect(b?.primary).toEqual(['chest']);
    expect(b?.secondary).toContain('triceps');
    expect(b?.secondary).toContain('shoulders_front');
  });

  it('maps squat to quads primary + glutes/hamstrings secondary', () => {
    const b = musclesForExerciseId('back_squat');
    expect(b?.primary).toEqual(['quads']);
    expect(b?.secondary).toContain('glutes');
  });

  it('maps deadlift to hamstrings primary (NOT quads)', () => {
    const b = musclesForExerciseId('deadlift');
    expect(b?.primary).toEqual(['hamstrings']);
    expect(b?.secondary).toContain('glutes');
    expect(b?.secondary).toContain('lower_back');
  });

  it('maps Romanian deadlift before conventional deadlift pattern', () => {
    const rdl = musclesForExerciseId('romanian_deadlift');
    expect(rdl?.primary).toEqual(['hamstrings']);
    // Both rules land on hamstrings primary; the test ensures `romanian` is matched
    // by its own rule (no lats secondary) rather than the generic deadlift rule.
    expect(rdl?.secondary).not.toContain('lats');
  });

  it('maps rows to lats primary', () => {
    expect(musclesForExerciseId('barbell_row')?.primary).toEqual(['lats']);
  });

  it('maps pulldowns to lats + biceps secondary', () => {
    const b = musclesForExerciseId('lat_pulldown');
    expect(b?.primary).toEqual(['lats']);
    expect(b?.secondary).toContain('biceps');
  });

  it('maps curl to biceps', () => {
    expect(musclesForExerciseId('barbell_curl')?.primary).toEqual(['biceps']);
  });

  it('maps tricep pushdown to triceps', () => {
    expect(musclesForExerciseId('tricep_pushdown')?.primary).toEqual(['triceps']);
  });

  it('returns null for unknown exercise', () => {
    expect(musclesForExerciseId('fictional_lift_9000')).toBeNull();
  });

  it('returns null for empty id', () => {
    expect(musclesForExerciseId('')).toBeNull();
  });
});

describe('deriveMuscleHeatmap', () => {
  it('returns null for empty input', () => {
    expect(deriveMuscleHeatmap([])).toBeNull();
  });

  it('aggregates primary + secondary volume correctly', () => {
    // Bench: chest primary (full), triceps + shoulders_front secondary (half)
    const logs = [
      makeLog({
        daysAgo: 2,
        exercises: [
          { id: 'bench_press', name: 'Bench', sets: [{ weight: 100, reps: 10 }] },
        ],
      }),
    ];
    const out = deriveMuscleHeatmap(logs, 30);
    expect(out).not.toBeNull();
    const chest = out!.entries.chest!;
    const tri = out!.entries.triceps!;
    expect(chest.volume).toBe(1000); // 100 * 10 * 1.0
    expect(tri.volume).toBe(500); // 100 * 10 * 0.5
  });

  it('tracks distinct sessions per muscle', () => {
    const logs = [
      makeLog({
        daysAgo: 2,
        id: 'a',
        exercises: [{ id: 'bench', name: 'x', sets: [{ weight: 100, reps: 5 }] }],
      }),
      makeLog({
        daysAgo: 4,
        id: 'b',
        exercises: [{ id: 'incline_bench', name: 'x', sets: [{ weight: 80, reps: 5 }] }],
      }),
    ];
    const out = deriveMuscleHeatmap(logs, 30);
    expect(out!.entries.chest!.sessions).toBe(2);
  });

  it('normalizes intensity to [0, 1] against hottest muscle', () => {
    // Chest gets 10× the volume of biceps.
    const logs = [
      makeLog({
        daysAgo: 1,
        exercises: [
          { id: 'bench', name: 'x', sets: [{ weight: 200, reps: 10 }] }, // chest: 2000
          { id: 'bicep_curl', name: 'x', sets: [{ weight: 10, reps: 10 }] }, // biceps: 100
        ],
      }),
    ];
    const out = deriveMuscleHeatmap(logs, 30);
    expect(out).not.toBeNull();
    expect(out!.entries.chest!.intensity).toBeCloseTo(1, 2);
    expect(out!.entries.biceps!.intensity).toBeLessThan(0.1);
  });

  it('honors rangeDays (logs outside window are excluded)', () => {
    const logs = [
      makeLog({
        daysAgo: 2,
        exercises: [{ id: 'bench', name: 'x', sets: [{ weight: 100, reps: 5 }] }],
      }),
      makeLog({
        daysAgo: 60,
        exercises: [{ id: 'bench', name: 'x', sets: [{ weight: 999, reps: 99 }] }],
      }),
    ];
    const out = deriveMuscleHeatmap(logs, 30);
    expect(out!.entries.chest!.volume).toBe(500); // only the recent log counts
  });

  it('tracks lastTrained as the latest ISO date', () => {
    const logs = [
      makeLog({
        daysAgo: 10,
        exercises: [{ id: 'bench', name: 'x', sets: [{ weight: 100, reps: 5 }] }],
      }),
      makeLog({
        daysAgo: 2,
        exercises: [{ id: 'bench', name: 'x', sets: [{ weight: 120, reps: 5 }] }],
      }),
    ];
    const out = deriveMuscleHeatmap(logs, 30);
    const expected = new Date();
    expected.setDate(expected.getDate() - 2);
    const expectedIso = expected.toISOString().slice(0, 10);
    expect(out!.entries.chest!.lastTrained).toBe(expectedIso);
  });

  it('skips warmup sets and uncompleted sets', () => {
    const d = daysAgoDate(2);
    const log: WorkoutLog = {
      id: 'log-warmup',
      userId: 'u1',
      workoutName: 'Test',
      startedAt: d,
      completedAt: d,
      durationMinutes: 30,
      exercises: [
        {
          exerciseId: 'bench',
          exerciseName: 'Bench',
          sets: [
            { setNumber: 1, weight: 50, reps: 10, completed: true, isWarmup: true },
            { setNumber: 2, weight: 100, reps: 5, completed: false },
            { setNumber: 3, weight: 100, reps: 5, completed: true },
          ],
          personalRecordType: null,
        },
      ],
      totalVolume: 0,
      totalSets: 0,
      totalReps: 0,
      exercisesCompleted: 1,
      exercisesSkipped: 0,
      prsHit: 0,
      createdAt: d,
      weightUnit: 'lbs',
    };
    const out = deriveMuscleHeatmap([log], 30);
    // Only set 3 counts (100 * 5 * 1.0 for chest primary).
    expect(out!.entries.chest!.volume).toBe(500);
  });

  it('returns null when no exercises match any muscle rule', () => {
    const logs = [
      makeLog({
        daysAgo: 2,
        exercises: [
          { id: 'unknown_lift', name: 'Unknown', sets: [{ weight: 100, reps: 10 }] },
        ],
      }),
    ];
    expect(deriveMuscleHeatmap(logs, 30)).toBeNull();
  });

  it('includes a maxVolume that matches the hottest muscle', () => {
    const logs = [
      makeLog({
        daysAgo: 1,
        exercises: [{ id: 'bench', name: 'x', sets: [{ weight: 200, reps: 10 }] }],
      }),
    ];
    const out = deriveMuscleHeatmap(logs, 30);
    // chest primary = 2000
    expect(out!.maxVolume).toBe(2000);
  });
});

describe('intensityColor', () => {
  it('returns slate at intensity 0', () => {
    expect(intensityColor(0).toLowerCase()).toBe('#3a3b4a');
  });

  it('returns purple at intensity 1', () => {
    expect(intensityColor(1).toLowerCase()).toBe('#9d4edd');
  });

  it('returns intermediate color between stops', () => {
    // At 0.5, should land on orange (#FF7A00)
    expect(intensityColor(0.5).toLowerCase()).toBe('#ff7a00');
  });

  it('clamps inputs outside [0, 1]', () => {
    expect(intensityColor(-5)).toBe(intensityColor(0));
    expect(intensityColor(2)).toBe(intensityColor(1));
  });
});

