import { isProgressChartData } from '@/features/ai/domain/ProgressChart';

describe('isProgressChartData', () => {
  const validPayload = {
    title: 'Bench',
    metric: 'weight',
    unit: 'lbs',
    series: [
      {
        label: 'Bench',
        points: [
          { date: '2026-04-01', value: 185 },
          { date: '2026-04-08', value: 190 },
        ],
      },
    ],
  };

  it('accepts a well-formed payload', () => {
    expect(isProgressChartData(validPayload)).toBe(true);
  });

  it('accepts optional color and axis labels', () => {
    expect(
      isProgressChartData({
        ...validPayload,
        series: [{ ...validPayload.series[0], color: '#FF2D55' }],
        x_axis_label: 'Date',
        y_axis_label: 'lbs',
        summary: 'Up 5lbs',
      }),
    ).toBe(true);
  });

  it.each([null, undefined, 'string', 42, []])(
    'rejects non-object input (%p)',
    (bad) => {
      expect(isProgressChartData(bad)).toBe(false);
    },
  );

  it('rejects missing required fields', () => {
    expect(isProgressChartData({ ...validPayload, title: undefined })).toBe(false);
    expect(isProgressChartData({ ...validPayload, metric: undefined })).toBe(false);
    expect(isProgressChartData({ ...validPayload, unit: undefined })).toBe(false);
    expect(isProgressChartData({ ...validPayload, series: undefined })).toBe(false);
  });

  it('rejects unknown metric values', () => {
    expect(isProgressChartData({ ...validPayload, metric: 'bogus' })).toBe(false);
  });

  it('rejects empty series array', () => {
    expect(isProgressChartData({ ...validPayload, series: [] })).toBe(false);
  });

  it('rejects series with malformed points', () => {
    expect(
      isProgressChartData({
        ...validPayload,
        series: [{ label: 'X', points: [{ date: '2026-04-01', value: 'NaN' }] }],
      }),
    ).toBe(false);
  });

  it('rejects series missing a label', () => {
    expect(
      isProgressChartData({
        ...validPayload,
        series: [{ points: [{ date: '2026-04-01', value: 1 }] }],
      }),
    ).toBe(false);
  });
});
