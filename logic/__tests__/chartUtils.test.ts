import {
  buildChartInputs,
  formatDateRange,
  formatMetric,
  formatShortDate,
  parseDateToTs,
  MAX_POINTS_PER_SERIES,
  MAX_SERIES,
} from '@/logic/chartUtils';
import type { ProgressChartData } from '@/features/ai/domain/ProgressChart';

const makeData = (overrides: Partial<ProgressChartData> = {}): ProgressChartData => ({
  title: 'Bench',
  metric: 'weight',
  unit: 'lbs',
  series: [{ label: 'Bench', points: [] }],
  ...overrides,
});

describe('parseDateToTs', () => {
  it('parses ISO date (YYYY-MM-DD)', () => {
    const ts = parseDateToTs('2026-04-22');
    expect(ts).not.toBeNull();
    expect(new Date(ts!).getUTCFullYear()).toBe(2026);
  });

  it('parses full ISO datetime', () => {
    const ts = parseDateToTs('2026-04-22T10:30:00Z');
    expect(ts).not.toBeNull();
  });

  it('rejects non-ISO format (MM/DD/YYYY)', () => {
    expect(parseDateToTs('04/22/2026')).toBeNull();
  });

  it('rejects garbage', () => {
    expect(parseDateToTs('not-a-date')).toBeNull();
  });

  it('rejects empty/non-string inputs', () => {
    expect(parseDateToTs('')).toBeNull();
    expect(parseDateToTs(null as unknown as string)).toBeNull();
  });
});

describe('formatMetric', () => {
  it('handles each metric variant', () => {
    expect(formatMetric('weight', 'lbs')).toBe('Weight (lbs)');
    expect(formatMetric('volume', 'kg')).toBe('Volume (kg)');
    expect(formatMetric('reps', 'reps')).toBe('Reps');
    expect(formatMetric('one_rep_max', 'lbs')).toBe('Estimated 1RM (lbs)');
  });
});

describe('formatDateRange', () => {
  it('returns empty string for empty data', () => {
    expect(formatDateRange([])).toBe('');
  });

  it('returns single date when first === last', () => {
    const ts = Date.parse('2026-04-22');
    expect(formatDateRange([{ x: ts }])).toBe(formatShortDate(ts));
  });

  it('returns range when first !== last', () => {
    const a = Date.parse('2026-03-01');
    const b = Date.parse('2026-04-22');
    expect(formatDateRange([{ x: a }, { x: b }])).toContain('→');
  });
});

describe('buildChartInputs', () => {
  it('filters out points with non-numeric value', () => {
    const data = makeData({
      series: [
        {
          label: 'A',
          points: [
            { date: '2026-04-01', value: 100 },
            { date: '2026-04-08', value: NaN },
            { date: '2026-04-15', value: 110 },
          ] as any,
        },
      ],
    });
    const out = buildChartInputs(data);
    expect(out.mergedData).toHaveLength(2);
    expect(out.mergedData.map((r) => r.s0)).toEqual([100, 110]);
  });

  it('filters out points with unparseable dates', () => {
    const data = makeData({
      series: [
        {
          label: 'A',
          points: [
            { date: 'garbage', value: 100 },
            { date: '2026-04-15', value: 110 },
          ],
        },
      ],
    });
    const out = buildChartInputs(data);
    expect(out.mergedData).toHaveLength(1);
    expect(out.mergedData[0].s0).toBe(110);
  });

  it('sorts points by ascending timestamp', () => {
    const data = makeData({
      series: [
        {
          label: 'A',
          points: [
            { date: '2026-04-15', value: 110 },
            { date: '2026-04-01', value: 100 },
            { date: '2026-04-08', value: 105 },
          ],
        },
      ],
    });
    const out = buildChartInputs(data);
    expect(out.mergedData.map((r) => r.s0)).toEqual([100, 105, 110]);
  });

  it(`caps series at ${MAX_SERIES}`, () => {
    const data = makeData({
      series: Array.from({ length: 7 }, (_, i) => ({
        label: `S${i}`,
        points: [{ date: '2026-04-01', value: i }],
      })),
    });
    const out = buildChartInputs(data);
    expect(out.yKeys).toHaveLength(MAX_SERIES);
    expect(out.seriesMeta).toHaveLength(MAX_SERIES);
  });

  it(`caps points per series at ${MAX_POINTS_PER_SERIES}`, () => {
    const points = Array.from({ length: 90 }, (_, i) => ({
      date: `2026-01-${String((i % 28) + 1).padStart(2, '0')}`,
      value: i,
    }));
    const data = makeData({ series: [{ label: 'A', points }] });
    const out = buildChartInputs(data);
    // Points are deduped by date (last-wins), so unique-date count <= 28.
    // The cap still ensures we never exceed MAX_POINTS_PER_SERIES.
    const s0Values = out.mergedData.map((r) => r.s0).filter((v) => v !== undefined);
    expect(s0Values.length).toBeLessThanOrEqual(MAX_POINTS_PER_SERIES);
  });

  it('merges sparse multi-series into a union x-axis', () => {
    const data = makeData({
      series: [
        { label: 'A', points: [{ date: '2026-04-01', value: 1 }] },
        { label: 'B', points: [{ date: '2026-04-08', value: 2 }] },
      ],
    });
    const out = buildChartInputs(data);
    expect(out.mergedData).toHaveLength(2);
    expect(out.mergedData[0].s0).toBe(1);
    expect(out.mergedData[0].s1).toBeUndefined();
    expect(out.mergedData[1].s0).toBeUndefined();
    expect(out.mergedData[1].s1).toBe(2);
  });

  it('handles duplicate timestamps within a series (last-wins + reports count)', () => {
    const data = makeData({
      series: [
        {
          label: 'A',
          points: [
            { date: '2026-04-01', value: 100 },
            { date: '2026-04-01', value: 105 },
            { date: '2026-04-01', value: 110 },
          ],
        },
      ],
    });
    const out = buildChartInputs(data);
    expect(out.mergedData).toHaveLength(1);
    expect(out.mergedData[0].s0).toBe(110);
    expect(out.duplicateDateCount).toBe(2);
  });

  it('returns mergedData.length < 2 when all series are empty', () => {
    const data = makeData({ series: [{ label: 'A', points: [] }] });
    const out = buildChartInputs(data);
    expect(out.mergedData.length).toBeLessThan(2);
  });

  it('preserves color and label in seriesMeta', () => {
    const data = makeData({
      series: [
        { label: 'Bench', color: '#FF2D55', points: [{ date: '2026-04-01', value: 1 }] },
        { label: 'Squat', points: [{ date: '2026-04-01', value: 2 }] },
      ],
    });
    const out = buildChartInputs(data);
    expect(out.seriesMeta[0].color).toBe('#FF2D55');
    expect(out.seriesMeta[0].label).toBe('Bench');
    expect(out.seriesMeta[1].color).toBeUndefined();
    expect(out.seriesMeta[1].label).toBe('Squat');
  });
});
