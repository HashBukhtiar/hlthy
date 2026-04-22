import { isVolumeBreakdownData } from '@/features/ai/domain/VolumeBreakdown';

describe('isVolumeBreakdownData', () => {
  const valid = {
    title: 'This week',
    unit: 'lbs',
    entries: [
      { label: 'Chest', value: 8000 },
      { label: 'Back', value: 9200 },
    ],
  };

  it('accepts a well-formed payload', () => {
    expect(isVolumeBreakdownData(valid)).toBe(true);
  });

  it('accepts optional total / prior_total / summary', () => {
    expect(
      isVolumeBreakdownData({ ...valid, total: 17200, prior_total: 15000, summary: 'Up 14%' }),
    ).toBe(true);
  });

  it.each([null, undefined, 'str', 42, []])('rejects non-object input (%p)', (bad) => {
    expect(isVolumeBreakdownData(bad)).toBe(false);
  });

  it('rejects empty entries', () => {
    expect(isVolumeBreakdownData({ ...valid, entries: [] })).toBe(false);
  });

  it('rejects negative values', () => {
    expect(
      isVolumeBreakdownData({
        ...valid,
        entries: [{ label: 'Chest', value: -1 }],
      }),
    ).toBe(false);
  });

  it('rejects NaN values', () => {
    expect(
      isVolumeBreakdownData({
        ...valid,
        entries: [{ label: 'Chest', value: NaN }],
      }),
    ).toBe(false);
  });

  it('rejects non-finite total', () => {
    expect(isVolumeBreakdownData({ ...valid, total: Infinity })).toBe(false);
  });

  it('rejects missing label on entry', () => {
    expect(
      isVolumeBreakdownData({ ...valid, entries: [{ value: 10 }] }),
    ).toBe(false);
  });
});
