import { currentHype, HYPE_HALF_LIFE_DAYS, HYPE_WINDOW_DAYS } from '../hype';

const DAY_MS = 24 * 60 * 60 * 1000;
// Use a UTC-midnight "now" so day-key math is exact regardless of test TZ.
const NOW = new Date('2026-06-21T00:00:00Z');

function dayKey(offsetDays: number): string {
  return new Date(NOW.getTime() - offsetDays * DAY_MS).toISOString().slice(0, 10);
}

describe('currentHype', () => {
  it('returns 0 for null/empty input', () => {
    expect(currentHype(null, NOW)).toBe(0);
    expect(currentHype(undefined, NOW)).toBe(0);
    expect(currentHype({}, NOW)).toBe(0);
  });

  it('counts same-day points at full value', () => {
    expect(currentHype({ [dayKey(0)]: 100 }, NOW)).toBe(100);
  });

  it('halves points after one half-life', () => {
    expect(currentHype({ [dayKey(HYPE_HALF_LIFE_DAYS)]: 100 }, NOW)).toBe(50);
  });

  it('ignores points outside the rolling window', () => {
    expect(currentHype({ [dayKey(HYPE_WINDOW_DAYS + 1)]: 1000 }, NOW)).toBe(0);
  });

  it('ignores future-dated and malformed buckets', () => {
    expect(currentHype({ [dayKey(-2)]: 500, 'not-a-date': 999 }, NOW)).toBe(0);
  });

  it('sums multiple buckets and rounds', () => {
    const total = currentHype(
      { [dayKey(0)]: 10, [dayKey(HYPE_HALF_LIFE_DAYS)]: 10 },
      NOW
    );
    expect(total).toBe(15); // 10 + 5
  });
});
