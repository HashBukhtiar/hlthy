import { calculateImprovementPercentage } from '../milestoneUtils';

describe('calculateImprovementPercentage', () => {
  it('returns null when either value is missing', () => {
    expect(calculateImprovementPercentage(null, 100)).toBeNull();
    expect(calculateImprovementPercentage(100, null)).toBeNull();
    expect(calculateImprovementPercentage(undefined, undefined)).toBeNull();
  });

  it('returns null when previous value is zero (division by zero)', () => {
    expect(calculateImprovementPercentage(50, 0)).toBeNull();
  });

  it('returns 0 when there is no improvement', () => {
    expect(calculateImprovementPercentage(100, 100)).toBe(0);
    expect(calculateImprovementPercentage(80, 100)).toBe(0);
  });

  it('computes a positive percentage improvement', () => {
    expect(calculateImprovementPercentage(150, 100)).toBe(50);
    expect(calculateImprovementPercentage(110, 100)).toBe(10);
  });

  it('rounds to one decimal place', () => {
    // 105/95 -> 10.526...% -> 10.5
    expect(calculateImprovementPercentage(105, 95)).toBe(10.5);
  });
});
