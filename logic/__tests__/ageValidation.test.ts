import {
  MINIMUM_AGE,
  parseDateOfBirth,
  getMaximumBirthDate,
  isOldEnough,
} from '../ageValidation';

// Fixed "now" so the tests are deterministic.
const NOW = new Date(2026, 5, 21); // 2026-06-21 (month is 0-indexed)

describe('ageValidation', () => {
  it('exposes a minimum age of 16', () => {
    expect(MINIMUM_AGE).toBe(16);
  });

  describe('parseDateOfBirth', () => {
    it('parses a valid MM/DD/YYYY date', () => {
      const d = parseDateOfBirth('03/15/2000');
      expect(d).not.toBeNull();
      expect(d!.getFullYear()).toBe(2000);
      expect(d!.getMonth()).toBe(2); // March
      expect(d!.getDate()).toBe(15);
    });

    it('rejects malformed strings', () => {
      expect(parseDateOfBirth('')).toBeNull();
      expect(parseDateOfBirth('2000-03-15')).toBeNull();
      expect(parseDateOfBirth('3/15/2000')).toBeNull(); // wrong length
      expect(parseDateOfBirth('ab/cd/efgh')).toBeNull();
    });

    it('rejects impossible calendar dates', () => {
      expect(parseDateOfBirth('02/30/2000')).toBeNull();
      expect(parseDateOfBirth('13/01/2000')).toBeNull();
    });
  });

  describe('getMaximumBirthDate', () => {
    it('returns the date exactly MINIMUM_AGE years before now', () => {
      const max = getMaximumBirthDate(NOW);
      expect(max.getFullYear()).toBe(2010); // 2026 - 16
      expect(max.getMonth()).toBe(5);
      expect(max.getDate()).toBe(21);
    });
  });

  describe('isOldEnough', () => {
    it('accepts someone comfortably over 16', () => {
      expect(isOldEnough('01/01/2000', NOW)).toBe(true);
    });

    it('accepts someone who turns 16 exactly today', () => {
      expect(isOldEnough('06/21/2010', NOW)).toBe(true);
    });

    it('rejects someone one day short of 16', () => {
      expect(isOldEnough('06/22/2010', NOW)).toBe(false);
    });

    it('rejects someone clearly under 16', () => {
      expect(isOldEnough('01/01/2020', NOW)).toBe(false);
    });

    it('rejects malformed input', () => {
      expect(isOldEnough('', NOW)).toBe(false);
      expect(isOldEnough('02/30/2000', NOW)).toBe(false);
    });
  });
});
