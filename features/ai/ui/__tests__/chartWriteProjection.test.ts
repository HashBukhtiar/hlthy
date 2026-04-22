import {
  projectProgressChart,
  projectVolumeBreakdown,
  projectStrengthCurve,
  projectMuscleBalance,
} from '@/features/ai/ui/chartWriteProjection';
import type { ProgressChartData } from '@/features/ai/domain/ProgressChart';
import type { VolumeBreakdownData } from '@/features/ai/domain/VolumeBreakdown';
import type { StrengthCurveData } from '@/features/ai/domain/StrengthCurve';
import type { MuscleBalanceData } from '@/features/ai/domain/MuscleBalance';

describe('projectProgressChart', () => {
  const base: ProgressChartData = {
    title: 'Bench',
    metric: 'weight',
    unit: 'lbs',
    series: [
      {
        label: 'Bench',
        points: [{ date: '2026-04-01', value: 185 }],
      },
    ],
  };

  it('keeps required fields', () => {
    const out = projectProgressChart(base).chartData as Record<string, unknown>;
    expect(out.title).toBe('Bench');
    expect(out.metric).toBe('weight');
    expect(out.unit).toBe('lbs');
    expect(Array.isArray(out.series)).toBe(true);
  });

  it('omits optional fields when absent', () => {
    const out = projectProgressChart(base).chartData as Record<string, unknown>;
    expect(out).not.toHaveProperty('x_axis_label');
    expect(out).not.toHaveProperty('y_axis_label');
    expect(out).not.toHaveProperty('summary');
    expect((out.series as any[])[0]).not.toHaveProperty('color');
  });

  it('preserves optional fields when present', () => {
    const out = projectProgressChart({
      ...base,
      x_axis_label: 'Date',
      y_axis_label: 'Weight',
      summary: 'Up',
      series: [{ label: 'Bench', color: '#FF2D55', points: base.series[0].points }],
    }).chartData as Record<string, unknown>;
    expect(out.x_axis_label).toBe('Date');
    expect(out.summary).toBe('Up');
    expect((out.series as any[])[0].color).toBe('#FF2D55');
  });

  it('drops extra unknown fields from series points', () => {
    const out = projectProgressChart({
      ...base,
      series: [
        {
          label: 'Bench',
          points: [{ date: '2026-04-01', value: 185, bogus: 'evil' } as any],
        },
      ],
    }).chartData as Record<string, unknown>;
    expect((out.series as any[])[0].points[0]).toEqual({ date: '2026-04-01', value: 185 });
  });
});

describe('projectVolumeBreakdown', () => {
  const base: VolumeBreakdownData = {
    title: 'Week',
    unit: 'lbs',
    entries: [{ label: 'Chest', value: 100 }],
  };

  it('preserves total / prior_total / period_label / summary when present', () => {
    const out = projectVolumeBreakdown({
      ...base,
      total: 500,
      prior_total: 400,
      period_label: 'Mar 17–23',
      summary: 'Up 25%',
    }).volumeData as Record<string, unknown>;
    expect(out.total).toBe(500);
    expect(out.prior_total).toBe(400);
    expect(out.period_label).toBe('Mar 17–23');
    expect(out.summary).toBe('Up 25%');
  });

  it('omits optional fields when absent', () => {
    const out = projectVolumeBreakdown(base).volumeData as Record<string, unknown>;
    expect(out).not.toHaveProperty('total');
    expect(out).not.toHaveProperty('prior_total');
    expect(out).not.toHaveProperty('period_label');
    expect(out).not.toHaveProperty('summary');
  });

  it('preserves entry color when provided', () => {
    const out = projectVolumeBreakdown({
      ...base,
      entries: [{ label: 'Chest', value: 100, color: '#FF7A00' }],
    }).volumeData as Record<string, unknown>;
    expect((out.entries as any[])[0].color).toBe('#FF7A00');
  });

  it('preserves explicit total=0 (falsy but defined)', () => {
    const out = projectVolumeBreakdown({ ...base, total: 0 }).volumeData as Record<string, unknown>;
    expect(out.total).toBe(0);
  });
});

describe('projectStrengthCurve', () => {
  const base: StrengthCurveData = {
    exercise_name: 'Squat',
    metric: 'weight',
    unit: 'lbs',
    points: [
      { date: '2026-02-10', value: 315 },
      { date: '2026-03-21', value: 340, is_pr: true, reps: 3 },
    ],
  };

  it('keeps required fields', () => {
    const out = projectStrengthCurve(base).strengthCurveData as Record<string, unknown>;
    expect(out.exercise_name).toBe('Squat');
    expect(out.metric).toBe('weight');
    expect(out.points).toHaveLength(2);
  });

  it('preserves is_pr and reps when present', () => {
    const out = projectStrengthCurve(base).strengthCurveData as Record<string, unknown>;
    expect((out.points as any[])[1].is_pr).toBe(true);
    expect((out.points as any[])[1].reps).toBe(3);
  });

  it('omits is_pr when false', () => {
    const out = projectStrengthCurve(base).strengthCurveData as Record<string, unknown>;
    expect((out.points as any[])[0]).not.toHaveProperty('is_pr');
  });

  it('caps points at 80 in projection', () => {
    const points = Array.from({ length: 200 }, (_, i) => ({
      date: `2026-01-01`,
      value: i,
    }));
    const out = projectStrengthCurve({ ...base, points }).strengthCurveData as Record<
      string,
      unknown
    >;
    expect((out.points as any[]).length).toBe(80);
  });

  it('preserves trend_label and projected_next when present', () => {
    const out = projectStrengthCurve({
      ...base,
      trend_label: '+25 / 6wk',
      projected_next: 360,
    }).strengthCurveData as Record<string, unknown>;
    expect(out.trend_label).toBe('+25 / 6wk');
    expect(out.projected_next).toBe(360);
  });
});

describe('projectMuscleBalance', () => {
  const base: MuscleBalanceData = {
    title: 'Balance',
    unit: 'sets',
    axes: [
      { label: 'Push', user_value: 40, target_value: 40 },
      { label: 'Pull', user_value: 20, target_value: 40, flag: 'under' },
      { label: 'Legs', user_value: 44, target_value: 40 },
    ],
  };

  it('keeps required fields', () => {
    const out = projectMuscleBalance(base).balanceData as Record<string, unknown>;
    expect(out.title).toBe('Balance');
    expect(out.axes).toHaveLength(3);
  });

  it('preserves flag when provided, omits when absent', () => {
    const out = projectMuscleBalance(base).balanceData as Record<string, unknown>;
    expect((out.axes as any[])[0]).not.toHaveProperty('flag');
    expect((out.axes as any[])[1].flag).toBe('under');
  });

  it('preserves period_label and summary when present', () => {
    const out = projectMuscleBalance({
      ...base,
      period_label: 'Last 30 days',
      summary: 'Pull lagging',
    }).balanceData as Record<string, unknown>;
    expect(out.period_label).toBe('Last 30 days');
    expect(out.summary).toBe('Pull lagging');
  });
});
