/**
 * Age-gating logic, shared by the signup UI and the signup service.
 *
 * Single source of truth for the minimum-age floor so the client UI, the
 * pre-write re-validation, and (mirrored separately) the Firestore rules all
 * agree. Dates of birth are stored/entered as "MM/DD/YYYY".
 *
 * Keep this in sync with the age check in `firestore.rules` (users create).
 */

/** Minimum age (in years) required to create an account. */
export const MINIMUM_AGE = 16;

/**
 * Parse a "MM/DD/YYYY" string into a real calendar date.
 * Returns null if the string is malformed or not a real date
 * (e.g. 02/30/2000 or 13/01/2000).
 */
export function parseDateOfBirth(dob: string): Date | null {
  if (typeof dob !== 'string' || dob.length !== 10) return null;

  const parts = dob.split('/');
  if (parts.length !== 3) return null;

  const [month, day, year] = parts.map((p) => Number(p));
  if (!Number.isInteger(month) || !Number.isInteger(day) || !Number.isInteger(year)) {
    return null;
  }

  const date = new Date(year, month - 1, day);
  // Reject overflow (e.g. month 13 or day 30 in February rolling over).
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

/**
 * The latest date of birth that still satisfies the minimum age, as of `now`.
 * Useful as a date picker's `maximumDate`.
 */
export function getMaximumBirthDate(now: Date = new Date()): Date {
  return new Date(now.getFullYear() - MINIMUM_AGE, now.getMonth(), now.getDate());
}

/**
 * Serialize a Date to the canonical "MM/DD/YYYY" date-of-birth string used
 * across the app (signup and edit-profile must agree so the Firestore age-gate
 * rule, which parses this format, accepts both write paths).
 */
export function formatDob(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const yyyy = String(date.getFullYear());
  return `${mm}/${dd}/${yyyy}`;
}

/**
 * Whether the given "MM/DD/YYYY" date of birth represents someone who is at
 * least MINIMUM_AGE years old as of `now`. Malformed dates return false.
 */
export function isOldEnough(dob: string, now: Date = new Date()): boolean {
  const date = parseDateOfBirth(dob);
  if (!date) return false;
  return date.getTime() <= getMaximumBirthDate(now).getTime();
}

/**
 * Date-object variant of {@link isOldEnough}, for surfaces that hold the DOB as
 * a Date (e.g. edit-profile settings) rather than a "MM/DD/YYYY" string.
 * Returns false for an invalid Date. Precise to the day (not year-only).
 */
export function isDateOldEnough(date: Date | null | undefined, now: Date = new Date()): boolean {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return false;
  return date.getTime() <= getMaximumBirthDate(now).getTime();
}
