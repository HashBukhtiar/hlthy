import { formatCount } from '../formattingFunctions';

describe('formatCount', () => {
  it('clamps negatives to "0"', () => {
    expect(formatCount(-5)).toBe('0');
  });

  it('returns plain numbers below 1000', () => {
    expect(formatCount(0)).toBe('0');
    expect(formatCount(999)).toBe('999');
  });

  it('formats thousands with K', () => {
    expect(formatCount(1000)).toBe('1K');
    expect(formatCount(1500)).toBe('1.5K');
    expect(formatCount(12000)).toBe('12K');
    // Edge quirk: 999999/1000 = 999.999 -> toFixed(1) = "1000.0K" (not rolled up to M).
    expect(formatCount(999999)).toBe('1000.0K');
  });

  it('formats millions with M', () => {
    expect(formatCount(1000000)).toBe('1M');
    expect(formatCount(2500000)).toBe('2.5M');
  });

  it('drops the decimal when it is a whole unit', () => {
    expect(formatCount(3000)).toBe('3K');
    expect(formatCount(3000000)).toBe('3M');
  });
});
