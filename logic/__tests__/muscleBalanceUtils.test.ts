import {
  prepareMuscleBalance,
  polarXY,
  buildPolygonPath,
  MAX_AXES,
  MIN_AXES,
} from '@/logic/muscleBalanceUtils';
import type { MuscleBalanceData } from '@/features/ai/domain/MuscleBalance';

const make = (o: Partial<MuscleBalanceData> = {}): MuscleBalanceData => ({
  title: 'Balance',
  unit: 'sets',
  axes: [
    { label: 'Push', user_value: 40, target_value: 40 },
    { label: 'Pull', user_value: 22, target_value: 40 },
    { label: 'Legs', user_value: 44, target_value: 40 },
  ],
  ...o,
});

describe('prepareMuscleBalance', () => {
  it('assigns angles starting from top, clockwise', () => {
    const out = prepareMuscleBalance(make());
    expect(out.axes[0].angle).toBeCloseTo(-Math.PI / 2);
    expect(out.axes.length).toBe(3);
  });

  it('returns empty axes if fewer than MIN_AXES survive sanitization', () => {
    const out = prepareMuscleBalance(
      make({
        axes: [
          { label: 'A', user_value: 1, target_value: 1 },
          { label: 'B', user_value: 1, target_value: 1 },
        ],
      }),
    );
    expect(out.axes.length).toBe(0);
    expect(out.scaleMax).toBe(0);
  });

  it('derives flag when not provided (under/over/balanced)', () => {
    const out = prepareMuscleBalance(
      make({
        axes: [
          // 50/100 → under
          { label: 'Pull', user_value: 50, target_value: 100 },
          // 100/100 → balanced
          { label: 'Push', user_value: 100, target_value: 100 },
          // 200/100 → over
          { label: 'Legs', user_value: 200, target_value: 100 },
        ],
      }),
    );
    expect(out.axes.find((a) => a.label === 'Pull')!.flag).toBe('under');
    expect(out.axes.find((a) => a.label === 'Push')!.flag).toBe('balanced');
    expect(out.axes.find((a) => a.label === 'Legs')!.flag).toBe('over');
  });

  it('respects explicit flags', () => {
    const out = prepareMuscleBalance(
      make({
        axes: [
          { label: 'A', user_value: 50, target_value: 100, flag: 'balanced' },
          { label: 'B', user_value: 100, target_value: 100 },
          { label: 'C', user_value: 200, target_value: 100 },
        ],
      }),
    );
    expect(out.axes[0].flag).toBe('balanced');
  });

  it('counts asymmetries', () => {
    const out = prepareMuscleBalance(
      make({
        axes: [
          { label: 'A', user_value: 10, target_value: 100 },
          { label: 'B', user_value: 100, target_value: 100 },
          { label: 'C', user_value: 200, target_value: 100 },
        ],
      }),
    );
    expect(out.asymmetryCount).toBe(2);
  });

  it(`caps axes at MAX_AXES=${MAX_AXES}`, () => {
    const axes = Array.from({ length: 12 }, (_, i) => ({
      label: `A${i}`,
      user_value: 1,
      target_value: 1,
    }));
    const out = prepareMuscleBalance(make({ axes }));
    expect(out.axes.length).toBe(MAX_AXES);
  });

  it('normalizes ratios with 10% headroom above the max', () => {
    const out = prepareMuscleBalance(
      make({
        axes: [
          { label: 'A', user_value: 50, target_value: 100 },
          { label: 'B', user_value: 75, target_value: 100 },
          { label: 'C', user_value: 100, target_value: 100 },
        ],
      }),
    );
    // scaleMax = 100 * 1.1 = 110
    expect(out.scaleMax).toBeCloseTo(110);
    const c = out.axes.find((a) => a.label === 'C')!;
    expect(c.userRatio).toBeCloseTo(100 / 110);
  });

  it('exports MIN_AXES = 3', () => {
    expect(MIN_AXES).toBe(3);
  });
});

describe('polarXY', () => {
  it('returns center when ratio is 0', () => {
    const p = polarXY(50, 50, 40, 0, 0);
    expect(p.x).toBe(50);
    expect(p.y).toBe(50);
  });

  it('places top vertex correctly at angle -π/2, ratio 1', () => {
    const p = polarXY(50, 50, 40, -Math.PI / 2, 1);
    expect(p.x).toBeCloseTo(50);
    expect(p.y).toBeCloseTo(10);
  });

  it('clamps ratio to [0, 1]', () => {
    const over = polarXY(50, 50, 40, 0, 2);
    const at1 = polarXY(50, 50, 40, 0, 1);
    expect(over.x).toBeCloseTo(at1.x);
  });
});

describe('buildPolygonPath', () => {
  it('returns empty string for empty input', () => {
    expect(buildPolygonPath([])).toBe('');
  });

  it('produces a closed SVG path', () => {
    const d = buildPolygonPath([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ]);
    expect(d.startsWith('M')).toBe(true);
    expect(d.endsWith('Z')).toBe(true);
    expect(d).toContain('L 10.00 0.00');
  });
});
