/**
 * Seed realistic workout logs + AI chart messages for a test user.
 *
 * Usage:
 *   cd functions
 *   npx ts-node scripts/seed_test_data.ts <UID>
 *
 * Requires GOOGLE_APPLICATION_CREDENTIALS or a service-account key configured
 * via `firebase-admin`'s `applicationDefault()`.
 *
 * What it writes:
 *   - users/{uid}/workout_logs/{logId}       — 12 recent sessions across 8 weeks
 *   - users/{uid}/exercise_history/{exId}    — PRs + trend for 4 lifts
 *   - conversations/{uid}_ai_conversation/messages/{autoId}
 *       × one message per chart type so all 4 render immediately
 */

import * as admin from 'firebase-admin';

// Explicit projectId so the admin SDK doesn't pick up the wrong one from
// gcloud defaults. Override with SEED_PROJECT_ID env var if needed.
const projectId = process.env.SEED_PROJECT_ID || 'hlthy-421200';

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId,
});
const db = admin.firestore();
console.log(`Using project: ${projectId}`);

const uid = process.argv[2];
if (!uid) {
  console.error('Usage: npx ts-node scripts/seed_test_data.ts <UID>');
  process.exit(1);
}

// ── Workout log builder ─────────────────────────────────────────────────────

type SetSpec = { weight: number; reps: number; isPR?: boolean };
type ExerciseSpec = {
  exerciseId: string;
  exerciseName: string;
  sets: SetSpec[];
  prType?: 'weight' | 'reps' | 'volume' | 'one_rep_max' | null;
};

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(17, 0, 0, 0);
  return d;
}

function buildLog(opts: {
  name: string;
  focus: 'push' | 'pull' | 'legs' | 'upper';
  daysAgoNum: number;
  exercises: ExerciseSpec[];
  mood?: 'energized' | 'good' | 'neutral' | 'tired';
  rpe?: number;
}) {
  const started = daysAgo(opts.daysAgoNum);
  const completed = new Date(started.getTime() + 55 * 60_000);
  const exercises = opts.exercises.map((e) => ({
    exerciseId: e.exerciseId,
    exerciseName: e.exerciseName,
    targetSets: e.sets.length,
    targetReps: '5-8',
    sets: e.sets.map((s, i) => ({
      setNumber: i + 1,
      weight: s.weight,
      reps: s.reps,
      rpe: 8,
      completed: true,
      isPR: !!s.isPR,
    })),
    restSeconds: 120,
    personalRecordType: e.prType ?? null,
  }));

  const totalVolume = exercises.reduce(
    (t, ex) => t + ex.sets.reduce((s, st) => s + st.weight * st.reps, 0),
    0,
  );
  const totalSets = exercises.reduce((t, ex) => t + ex.sets.length, 0);
  const totalReps = exercises.reduce(
    (t, ex) => t + ex.sets.reduce((s, st) => s + st.reps, 0),
    0,
  );
  const prsHit = exercises.filter((ex) => ex.personalRecordType).length;

  return {
    userId: uid,
    workoutName: opts.name,
    workoutFocus: opts.focus,
    startedAt: admin.firestore.Timestamp.fromDate(started),
    completedAt: admin.firestore.Timestamp.fromDate(completed),
    durationMinutes: 55,
    exercises,
    totalVolume,
    totalSets,
    totalReps,
    exercisesCompleted: exercises.length,
    exercisesSkipped: 0,
    prsHit,
    mood: opts.mood ?? 'good',
    perceivedDifficulty: opts.rpe ?? 7,
    energyLevel: 7,
    createdAt: admin.firestore.Timestamp.fromDate(started),
    weightUnit: 'lbs' as const,
  };
}

// ── 12 sessions across 8 weeks — bench/squat progression with PRs ──────────

const logs = [
  // Most recent (4 days ago) — Push
  buildLog({
    name: 'Push Day',
    focus: 'push',
    daysAgoNum: 4,
    exercises: [
      {
        exerciseId: 'barbell_bench_press',
        exerciseName: 'Barbell Bench Press',
        sets: [
          { weight: 200, reps: 5, isPR: true },
          { weight: 195, reps: 5 },
          { weight: 185, reps: 6 },
        ],
        prType: 'weight',
      },
      {
        exerciseId: 'overhead_press',
        exerciseName: 'Overhead Press',
        sets: [
          { weight: 135, reps: 5 },
          { weight: 135, reps: 5 },
          { weight: 125, reps: 6 },
        ],
      },
      {
        exerciseId: 'incline_db_press',
        exerciseName: 'Incline DB Press',
        sets: [
          { weight: 70, reps: 10 },
          { weight: 70, reps: 9 },
          { weight: 65, reps: 10 },
        ],
      },
    ],
    mood: 'energized',
  }),
  // 7 days ago — Pull
  buildLog({
    name: 'Pull Day',
    focus: 'pull',
    daysAgoNum: 7,
    exercises: [
      {
        exerciseId: 'deadlift',
        exerciseName: 'Deadlift',
        sets: [
          { weight: 365, reps: 3, isPR: true },
          { weight: 345, reps: 4 },
          { weight: 315, reps: 5 },
        ],
        prType: 'one_rep_max',
      },
      {
        exerciseId: 'barbell_row',
        exerciseName: 'Barbell Row',
        sets: [
          { weight: 185, reps: 6 },
          { weight: 185, reps: 6 },
          { weight: 175, reps: 8 },
        ],
      },
      {
        exerciseId: 'pullup',
        exerciseName: 'Pull-Up',
        sets: [
          { weight: 0, reps: 10 },
          { weight: 0, reps: 8 },
          { weight: 0, reps: 6 },
        ],
      },
    ],
  }),
  // 11 days ago — Legs
  buildLog({
    name: 'Leg Day',
    focus: 'legs',
    daysAgoNum: 11,
    exercises: [
      {
        exerciseId: 'back_squat',
        exerciseName: 'Back Squat',
        sets: [
          { weight: 315, reps: 5, isPR: true },
          { weight: 295, reps: 5 },
          { weight: 275, reps: 6 },
        ],
        prType: 'weight',
      },
      {
        exerciseId: 'romanian_deadlift',
        exerciseName: 'Romanian Deadlift',
        sets: [
          { weight: 225, reps: 8 },
          { weight: 225, reps: 8 },
          { weight: 205, reps: 10 },
        ],
      },
    ],
    rpe: 9,
    mood: 'tired',
  }),
  // 14 days ago — Push
  buildLog({
    name: 'Push Day',
    focus: 'push',
    daysAgoNum: 14,
    exercises: [
      {
        exerciseId: 'barbell_bench_press',
        exerciseName: 'Barbell Bench Press',
        sets: [
          { weight: 195, reps: 5 },
          { weight: 190, reps: 5 },
          { weight: 180, reps: 7 },
        ],
      },
      {
        exerciseId: 'overhead_press',
        exerciseName: 'Overhead Press',
        sets: [
          { weight: 130, reps: 6 },
          { weight: 130, reps: 5 },
          { weight: 120, reps: 8 },
        ],
      },
    ],
  }),
  // 18 days ago — Pull
  buildLog({
    name: 'Pull Day',
    focus: 'pull',
    daysAgoNum: 18,
    exercises: [
      {
        exerciseId: 'deadlift',
        exerciseName: 'Deadlift',
        sets: [
          { weight: 355, reps: 3 },
          { weight: 335, reps: 4 },
          { weight: 305, reps: 5 },
        ],
      },
      {
        exerciseId: 'barbell_row',
        exerciseName: 'Barbell Row',
        sets: [
          { weight: 180, reps: 6 },
          { weight: 180, reps: 6 },
          { weight: 170, reps: 8 },
        ],
      },
    ],
  }),
  // 21 days ago — Legs
  buildLog({
    name: 'Leg Day',
    focus: 'legs',
    daysAgoNum: 21,
    exercises: [
      {
        exerciseId: 'back_squat',
        exerciseName: 'Back Squat',
        sets: [
          { weight: 305, reps: 5 },
          { weight: 285, reps: 5 },
          { weight: 265, reps: 7 },
        ],
      },
    ],
  }),
  // 25 days ago — Push
  buildLog({
    name: 'Push Day',
    focus: 'push',
    daysAgoNum: 25,
    exercises: [
      {
        exerciseId: 'barbell_bench_press',
        exerciseName: 'Barbell Bench Press',
        sets: [
          { weight: 190, reps: 5 },
          { weight: 185, reps: 5 },
          { weight: 175, reps: 7 },
        ],
      },
    ],
  }),
  // 28 days ago — Legs
  buildLog({
    name: 'Leg Day',
    focus: 'legs',
    daysAgoNum: 28,
    exercises: [
      {
        exerciseId: 'back_squat',
        exerciseName: 'Back Squat',
        sets: [
          { weight: 295, reps: 5 },
          { weight: 275, reps: 5 },
          { weight: 255, reps: 7 },
        ],
      },
    ],
  }),
  // 35 days ago — Push
  buildLog({
    name: 'Push Day',
    focus: 'push',
    daysAgoNum: 35,
    exercises: [
      {
        exerciseId: 'barbell_bench_press',
        exerciseName: 'Barbell Bench Press',
        sets: [
          { weight: 185, reps: 5 },
          { weight: 180, reps: 5 },
          { weight: 170, reps: 7 },
        ],
      },
    ],
  }),
  // 42 days ago — Legs
  buildLog({
    name: 'Leg Day',
    focus: 'legs',
    daysAgoNum: 42,
    exercises: [
      {
        exerciseId: 'back_squat',
        exerciseName: 'Back Squat',
        sets: [
          { weight: 285, reps: 5 },
          { weight: 265, reps: 5 },
          { weight: 245, reps: 7 },
        ],
      },
    ],
  }),
  // 49 days ago — Push
  buildLog({
    name: 'Push Day',
    focus: 'push',
    daysAgoNum: 49,
    exercises: [
      {
        exerciseId: 'barbell_bench_press',
        exerciseName: 'Barbell Bench Press',
        sets: [
          { weight: 180, reps: 5 },
          { weight: 175, reps: 5 },
          { weight: 165, reps: 7 },
        ],
      },
    ],
  }),
  // 56 days ago — Legs
  buildLog({
    name: 'Leg Day',
    focus: 'legs',
    daysAgoNum: 56,
    exercises: [
      {
        exerciseId: 'back_squat',
        exerciseName: 'Back Squat',
        sets: [
          { weight: 275, reps: 5 },
          { weight: 255, reps: 5 },
          { weight: 235, reps: 7 },
        ],
      },
    ],
  }),
];

// ── Pre-seeded AI chart messages (render immediately in the app) ────────────

function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

const chartMessages: Array<{
  userPrompt: string;
  text: string;
  responseType: string;
  chartData?: unknown;
  volumeData?: unknown;
  strengthCurveData?: unknown;
  balanceData?: unknown;
}> = [
  {
    userPrompt: 'How has my bench progressed over the last 8 weeks?',
    text: "Here's your bench progression — up 20 lbs in 8 weeks. Steady.",
    responseType: 'progress_chart',
    chartData: {
      title: 'Bench Press — last 8 weeks',
      metric: 'weight',
      unit: 'lbs',
      series: [
        {
          label: 'Bench Press (top set)',
          color: '#FF2D55',
          points: [
            { date: isoDaysAgo(56), value: 180 },
            { date: isoDaysAgo(49), value: 180 },
            { date: isoDaysAgo(42), value: 185 },
            { date: isoDaysAgo(35), value: 185 },
            { date: isoDaysAgo(28), value: 190 },
            { date: isoDaysAgo(25), value: 190 },
            { date: isoDaysAgo(14), value: 195 },
            { date: isoDaysAgo(4), value: 200 },
          ],
        },
      ],
      summary: 'Up 20 lbs / 8 weeks. Next target: 205.',
    },
  },
  {
    userPrompt: 'What did my training volume by muscle group look like this week?',
    text: 'Volume breakdown for this week. Legs running hot.',
    responseType: 'volume_breakdown',
    volumeData: {
      title: 'This week',
      unit: 'lbs',
      total: 38400,
      prior_total: 33800,
      period_label: `${isoDaysAgo(7)} – ${isoDaysAgo(0)}`,
      entries: [
        { label: 'Legs', value: 12000, color: '#FF7A00' },
        { label: 'Back', value: 9200 },
        { label: 'Chest', value: 8400 },
        { label: 'Shoulders', value: 5200 },
        { label: 'Arms', value: 3600 },
      ],
      summary: 'Legs leading the week (+14% vs last). Arms still lagging.',
    },
  },
  {
    userPrompt: 'Chart my back squat progression and highlight the PRs.',
    text: 'Back squat curve — two PRs in 4 weeks.',
    responseType: 'strength_curve',
    strengthCurveData: {
      exercise_name: 'Back Squat',
      metric: 'weight',
      unit: 'lbs',
      points: [
        { date: isoDaysAgo(56), value: 275, reps: 5 },
        { date: isoDaysAgo(42), value: 285, reps: 5 },
        { date: isoDaysAgo(28), value: 295, reps: 5 },
        { date: isoDaysAgo(21), value: 305, reps: 5 },
        { date: isoDaysAgo(11), value: 315, reps: 5, is_pr: true },
      ],
      trend_label: '+40 / 8wk',
      projected_next: 325,
      summary: 'Linear progression holding — primed for a triple at 320.',
    },
  },
  {
    userPrompt: 'Am I balanced across push / pull / legs this month?',
    text: 'Balance check — pull volume is half your push.',
    responseType: 'muscle_balance',
    balanceData: {
      title: 'Muscle group balance — last 30 days',
      period_label: 'Last 30 days',
      unit: 'sets',
      axes: [
        { label: 'Push', user_value: 42, target_value: 40, flag: 'balanced' },
        { label: 'Pull', user_value: 22, target_value: 40, flag: 'under' },
        { label: 'Legs', user_value: 44, target_value: 40, flag: 'over' },
        { label: 'Core', user_value: 10, target_value: 20, flag: 'under' },
        { label: 'Arms', user_value: 20, target_value: 20, flag: 'balanced' },
      ],
      summary: 'Pull volume is half of your push. Add rows and face-pulls.',
    },
  },
];

// ── Runner ──────────────────────────────────────────────────────────────────

async function run() {
  console.log(`Seeding data for uid=${uid}...`);

  // 1. Workout logs
  const logsRef = db.collection('users').doc(uid).collection('workout_logs');
  const batch1 = db.batch();
  for (const log of logs) {
    batch1.set(logsRef.doc(), log);
  }
  await batch1.commit();
  console.log(`  ✓ ${logs.length} workout logs written`);

  // 2. Exercise history (bench + squat PRs)
  const histRef = db.collection('users').doc(uid).collection('exercise_history');
  const now = admin.firestore.Timestamp.now();
  const latestLogId = 'seed-latest';
  await Promise.all([
    histRef.doc('barbell_bench_press').set({
      exerciseId: 'barbell_bench_press',
      exerciseName: 'Barbell Bench Press',
      userId: uid,
      personalRecords: {
        maxWeight: { value: 200, date: admin.firestore.Timestamp.fromDate(daysAgo(4)), workoutLogId: latestLogId },
        maxReps: { value: 7, date: admin.firestore.Timestamp.fromDate(daysAgo(14)), workoutLogId: latestLogId },
        maxVolume: { value: 1000, weight: 200, reps: 5, date: admin.firestore.Timestamp.fromDate(daysAgo(4)), workoutLogId: latestLogId },
        estimatedOneRepMax: { value: 225, date: admin.firestore.Timestamp.fromDate(daysAgo(4)), workoutLogId: latestLogId },
      },
      recentSessions: [],
      trends: {
        volumeTrend: 'increasing',
        strengthTrend: 'increasing',
        consistencyScore: 85,
        lastPerformed: admin.firestore.Timestamp.fromDate(daysAgo(4)),
        timesPerformed: 5,
        lastPR: admin.firestore.Timestamp.fromDate(daysAgo(4)),
      },
      createdAt: now,
      updatedAt: now,
      weightUnit: 'lbs',
    }),
    histRef.doc('back_squat').set({
      exerciseId: 'back_squat',
      exerciseName: 'Back Squat',
      userId: uid,
      personalRecords: {
        maxWeight: { value: 315, date: admin.firestore.Timestamp.fromDate(daysAgo(11)), workoutLogId: latestLogId },
        maxReps: { value: 7, date: admin.firestore.Timestamp.fromDate(daysAgo(42)), workoutLogId: latestLogId },
        maxVolume: { value: 1575, weight: 315, reps: 5, date: admin.firestore.Timestamp.fromDate(daysAgo(11)), workoutLogId: latestLogId },
        estimatedOneRepMax: { value: 355, date: admin.firestore.Timestamp.fromDate(daysAgo(11)), workoutLogId: latestLogId },
      },
      recentSessions: [],
      trends: {
        volumeTrend: 'increasing',
        strengthTrend: 'increasing',
        consistencyScore: 80,
        lastPerformed: admin.firestore.Timestamp.fromDate(daysAgo(11)),
        timesPerformed: 6,
        lastPR: admin.firestore.Timestamp.fromDate(daysAgo(11)),
      },
      createdAt: now,
      updatedAt: now,
      weightUnit: 'lbs',
    }),
    histRef.doc('deadlift').set({
      exerciseId: 'deadlift',
      exerciseName: 'Deadlift',
      userId: uid,
      personalRecords: {
        maxWeight: { value: 365, date: admin.firestore.Timestamp.fromDate(daysAgo(7)), workoutLogId: latestLogId },
        maxReps: null,
        maxVolume: { value: 1095, weight: 365, reps: 3, date: admin.firestore.Timestamp.fromDate(daysAgo(7)), workoutLogId: latestLogId },
        estimatedOneRepMax: { value: 395, date: admin.firestore.Timestamp.fromDate(daysAgo(7)), workoutLogId: latestLogId },
      },
      recentSessions: [],
      trends: {
        volumeTrend: 'increasing',
        strengthTrend: 'increasing',
        consistencyScore: 70,
        lastPerformed: admin.firestore.Timestamp.fromDate(daysAgo(7)),
        timesPerformed: 2,
        lastPR: admin.firestore.Timestamp.fromDate(daysAgo(7)),
      },
      createdAt: now,
      updatedAt: now,
      weightUnit: 'lbs',
    }),
  ]);
  console.log('  ✓ exercise_history written (bench, squat, deadlift)');

  // 3. AI conversation + chart messages
  const convId = `${uid}_ai_conversation`;
  const convRef = db.collection('conversations').doc(convId);
  await convRef.set(
    {
      participants: [uid],
      isAI: true,
      createdAt: now,
      updatedAt: now,
    },
    { merge: true },
  );

  const msgsRef = convRef.collection('messages');
  for (const msg of chartMessages) {
    // 1) User question first so the AI reply has context
    await msgsRef.add({
      senderId: uid,
      text: msg.userPrompt,
      isAiResponse: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await new Promise((r) => setTimeout(r, 60));

    // 2) AI reply with the chart
    await msgsRef.add({
      senderId: uid,
      text: msg.text,
      isAiResponse: true,
      responseType: msg.responseType,
      ...(msg.chartData ? { chartData: msg.chartData } : {}),
      ...(msg.volumeData ? { volumeData: msg.volumeData } : {}),
      ...(msg.strengthCurveData ? { strengthCurveData: msg.strengthCurveData } : {}),
      ...(msg.balanceData ? { balanceData: msg.balanceData } : {}),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await new Promise((r) => setTimeout(r, 60));
  }
  console.log(`  ✓ ${chartMessages.length * 2} messages written (4 prompts + 4 chart replies)`);

  console.log('\nDone. Open the app → AI tab → all 4 charts should render.');
  process.exit(0);
}

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
