import { prepareStrengthCurve, formatCurveMetric } from '@/logic/strengthCurveUtils';
import type { StrengthCurveData } from '@/features/ai/domain/StrengthCurve';

const make = (o: Partial<StrengthCurveData> = {}): StrengthCurveData => ({
  exercise_name: 'Squat',
  metric: 'weight',
  unit: 'lbs',
  points: [
    { date: '2026-02-10', value: 315 },
    { date: '2026-03-21', value: 340, is_pr: true, reps: 3 },
  ],
  ...o,
});

describe('prepareStrengthCurve', () => {
  it('sorts points ascending by date', () => {
    const out = prepareStrengthCurve(
      make({
        points: [
          { date: '2026-03-21', value: 340 },
          { date: '2026-02-10', value: 315 },
          { date: '2026-03-01', value: 325 },
        ],
      }),
    );
    expect(out.points.map((p) => p.value)).toEqual([315, 325, 340]);
  });

  it('extracts PR indices', () => {
    const out = prepareStrengthCurve(
      make({
        points: [
          { date: '2026-02-10', value: 315 },
          { date: '2026-03-01', value: 325, is_pr: true },
          { date: '2026-03-21', value: 340, is_pr: true },
        ],
      }),
    );
    expect(out.prIndices).toEqual([1, 2]);
  });

  it('drops points with unparseable date', () => {
    const out = prepareStrengthCurve(
      make({
        points: [
          { date: 'garbage', value: 300 },
          { date: '2026-02-10', value: 315 },
          { date: '2026-03-21', value: 340 },
        ],
      }),
    );
    expect(out.points.length).toBe(2);
  });

  it('dedupes duplicate timestamps (keeps higher value)', () => {
    const out = prepareStrengthCurve(
      make({
        points: [
          { date: '2026-02-10', value: 300 },
          { date: '2026-02-10', value: 315 },
          { date: '2026-03-01', value: 325 },
        ],
      }),
    );
    expect(out.points.length).toBe(2);
    expect(out.points[0].value).toBe(315);
  });

  it('computes delta absolute and percent', () => {
    const out = prepareStrengthCurve(
      make({
        points: [
          { date: '2026-02-10', value: 300 },
          { date: '2026-03-21', value: 330 },
        ],
      }),
    );
    expect(out.deltaAbsolute).toBe(30);
    expect(out.deltaPercent).toBeCloseTo(10);
  });

  it('only surfaces projected_next when strictly above current', () => {
    const below = prepareStrengthCurve(make({ projected_next: 300 }));
    expect(below.projectedNext).toBeNull();
    const above = prepareStrengthCurve(make({ projected_next: 360 }));
    expect(above.projectedNext).toBe(360);
  });

  it('returns null projection when not finite', () => {
    const out = prepareStrengthCurve(make({ projected_next: Infinity as unknown as number }));
    expect(out.projectedNext).toBeNull();
  });
});

describe('formatCurveMetric', () => {
  it('returns readable labels per metric', () => {
    expect(formatCurveMetric('weight', 'lbs')).toBe('Top set (lbs)');
    expect(formatCurveMetric('one_rep_max', 'lbs')).toBe('Estimated 1RM (lbs)');
    expect(formatCurveMetric('volume', 'kg')).toBe('Volume (kg)');
  });
});
