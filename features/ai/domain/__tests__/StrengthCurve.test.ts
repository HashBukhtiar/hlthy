import { isStrengthCurveData } from '@/features/ai/domain/StrengthCurve';

describe('isStrengthCurveData', () => {
  const valid = {
    exercise_name: 'Back Squat',
    metric: 'weight',
    unit: 'lbs',
    points: [
      { date: '2026-02-10', value: 315 },
      { date: '2026-03-21', value: 340, is_pr: true, reps: 3 },
    ],
  };

  it('accepts a well-formed payload', () => {
    expect(isStrengthCurveData(valid)).toBe(true);
  });

  it('requires at least 2 points', () => {
    expect(
      isStrengthCurveData({ ...valid, points: [{ date: '2026-02-10', value: 315 }] }),
    ).toBe(false);
  });

  it.each([null, undefined, 42, 'x'])('rejects non-object input (%p)', (bad) => {
    expect(isStrengthCurveData(bad)).toBe(false);
  });

  it('rejects unknown metric values', () => {
    expect(isStrengthCurveData({ ...valid, metric: 'bogus' })).toBe(false);
  });

  it('rejects points with missing date', () => {
    expect(
      isStrengthCurveData({
        ...valid,
        points: [{ value: 100 }, { date: '2026-03-21', value: 120 }],
      }),
    ).toBe(false);
  });

  it('rejects points with non-numeric value', () => {
    expect(
      isStrengthCurveData({
        ...valid,
        points: [
          { date: '2026-02-10', value: '315' as any },
          { date: '2026-03-21', value: 340 },
        ],
      }),
    ).toBe(false);
  });

  it('rejects points with non-boolean is_pr', () => {
    expect(
      isStrengthCurveData({
        ...valid,
        points: [
          { date: '2026-02-10', value: 315, is_pr: 1 as any },
          { date: '2026-03-21', value: 340 },
        ],
      }),
    ).toBe(false);
  });
});
