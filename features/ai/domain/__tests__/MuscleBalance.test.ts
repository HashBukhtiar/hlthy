import { isMuscleBalanceData } from '@/features/ai/domain/MuscleBalance';

describe('isMuscleBalanceData', () => {
  const valid = {
    title: 'Balance',
    unit: 'sets',
    axes: [
      { label: 'Push', user_value: 40, target_value: 40 },
      { label: 'Pull', user_value: 22, target_value: 40, flag: 'under' },
      { label: 'Legs', user_value: 44, target_value: 40, flag: 'over' },
    ],
  };

  it('accepts a well-formed payload', () => {
    expect(isMuscleBalanceData(valid)).toBe(true);
  });

  it('requires at least 3 axes', () => {
    expect(
      isMuscleBalanceData({
        ...valid,
        axes: [
          { label: 'Push', user_value: 1, target_value: 1 },
          { label: 'Pull', user_value: 1, target_value: 1 },
        ],
      }),
    ).toBe(false);
  });

  it('rejects flag values outside the enum', () => {
    expect(
      isMuscleBalanceData({
        ...valid,
        axes: [
          { label: 'Push', user_value: 40, target_value: 40, flag: 'fine' },
          ...valid.axes.slice(1),
        ],
      }),
    ).toBe(false);
  });

  it('rejects axes with negative values', () => {
    expect(
      isMuscleBalanceData({
        ...valid,
        axes: [
          { label: 'Push', user_value: -1, target_value: 40 },
          ...valid.axes.slice(1),
        ],
      }),
    ).toBe(false);
  });

  it('rejects axes missing labels', () => {
    expect(
      isMuscleBalanceData({
        ...valid,
        axes: [
          { user_value: 1, target_value: 1 } as any,
          ...valid.axes.slice(1),
        ],
      }),
    ).toBe(false);
  });

  it('rejects empty title', () => {
    expect(isMuscleBalanceData({ ...valid, title: '' })).toBe(false);
  });
});
