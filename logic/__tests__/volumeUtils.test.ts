import {
  prepareVolumeBreakdown,
  formatCompactNumber,
  BAR_COLORS,
  MAX_ENTRIES,
} from '@/logic/volumeUtils';
import type { VolumeBreakdownData } from '@/features/ai/domain/VolumeBreakdown';

const make = (o: Partial<VolumeBreakdownData> = {}): VolumeBreakdownData => ({
  title: 'Week',
  unit: 'lbs',
  entries: [{ label: 'Chest', value: 8000 }],
  ...o,
});

describe('prepareVolumeBreakdown', () => {
  it('sorts entries descending by value', () => {
    const out = prepareVolumeBreakdown(
      make({
        entries: [
          { label: 'A', value: 100 },
          { label: 'B', value: 500 },
          { label: 'C', value: 200 },
        ],
      }),
    );
    expect(out.entries.map((e) => e.label)).toEqual(['B', 'C', 'A']);
  });

  it('normalizes ratio against the max', () => {
    const out = prepareVolumeBreakdown(
      make({
        entries: [
          { label: 'A', value: 100 },
          { label: 'B', value: 50 },
        ],
      }),
    );
    expect(out.entries[0].ratio).toBe(1);
    expect(out.entries[1].ratio).toBe(0.5);
  });

  it('computes percent of total for each entry', () => {
    const out = prepareVolumeBreakdown(
      make({
        entries: [
          { label: 'A', value: 75 },
          { label: 'B', value: 25 },
        ],
      }),
    );
    expect(out.entries[0].percent).toBeCloseTo(0.75);
    expect(out.entries[1].percent).toBeCloseTo(0.25);
  });

  it('falls back to BAR_COLORS when entries have no color', () => {
    const out = prepareVolumeBreakdown(
      make({
        entries: [
          { label: 'A', value: 1 },
          { label: 'B', value: 2 },
        ],
      }),
    );
    // After sort, B is first, A second. Color ramp is assigned in sorted order.
    expect(out.entries[0].color).toBe(BAR_COLORS[0]);
    expect(out.entries[1].color).toBe(BAR_COLORS[1]);
  });

  it('preserves explicit entry colors', () => {
    const out = prepareVolumeBreakdown(
      make({
        entries: [{ label: 'X', value: 1, color: '#ABCDEF' }],
      }),
    );
    expect(out.entries[0].color).toBe('#ABCDEF');
  });

  it(`caps entries at MAX_ENTRIES=${MAX_ENTRIES}`, () => {
    const entries = Array.from({ length: 20 }, (_, i) => ({ label: `M${i}`, value: i + 1 }));
    const out = prepareVolumeBreakdown(make({ entries }));
    expect(out.entries.length).toBe(MAX_ENTRIES);
  });

  it('drops entries with invalid values', () => {
    const out = prepareVolumeBreakdown(
      make({
        entries: [
          { label: 'A', value: 100 },
          { label: 'B', value: NaN as unknown as number },
          { label: 'C', value: -5 },
          { label: 'D', value: 50 },
        ],
      }),
    );
    expect(out.entries.map((e) => e.label)).toEqual(['A', 'D']);
  });

  it('derives delta when prior_total is provided', () => {
    const out = prepareVolumeBreakdown(
      make({
        total: 110,
        prior_total: 100,
        entries: [{ label: 'A', value: 110 }],
      }),
    );
    expect(out.deltaPercent).toBeCloseTo(10);
    expect(out.deltaDirection).toBe('up');
  });

  it('returns flat direction when delta is tiny', () => {
    const out = prepareVolumeBreakdown(
      make({
        total: 100.3,
        prior_total: 100,
        entries: [{ label: 'A', value: 100.3 }],
      }),
    );
    expect(out.deltaDirection).toBe('flat');
  });

  it('leaves delta null when prior_total missing', () => {
    const out = prepareVolumeBreakdown(make({ total: 100 }));
    expect(out.deltaPercent).toBeNull();
    expect(out.deltaDirection).toBeNull();
  });
});

describe('formatCompactNumber', () => {
  it.each([
    [0, '0'],
    [42, '42'],
    [999, '999'],
    [1500, '1.5k'],
    [9999, '10.0k'],
    [12_400, '12k'],
    [1_200_000, '1.2M'],
  ])('formats %i → %s', (input, expected) => {
    expect(formatCompactNumber(input)).toBe(expected);
  });

  it('returns em-dash for non-finite', () => {
    expect(formatCompactNumber(NaN)).toBe('—');
    expect(formatCompactNumber(Infinity)).toBe('—');
  });
});
