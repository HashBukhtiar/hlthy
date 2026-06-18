// Pure Hype math — no React, no Firebase. Shared by the profile display and any
// future Hype surface. Mirrors the per-day bucket layout written server-side by
// functions/src/services/hypeService.ts. See docs/hype.md for the full design.

export const HYPE_HALF_LIFE_DAYS = 14;
export const HYPE_WINDOW_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Collapse the per-day Hype buckets into the single decayed number shown to the
 * user. Each day's points decay by an exponential half-life, so the score rises
 * with activity and falls when the user goes quiet (the "rolling window" feel)
 * without any sliding-window storage. Buckets outside the window are ignored.
 *
 * @param hypeByDay map of `yyyy-mm-dd` → points earned that day (UTC keys)
 * @param now      injectable for testing; defaults to the current time
 */
export function currentHype(
  hypeByDay?: Record<string, number> | null,
  now: Date = new Date()
): number {
  if (!hypeByDay) return 0;

  const nowMs = now.getTime();
  let total = 0;

  for (const [day, points] of Object.entries(hypeByDay)) {
    if (!points) continue;
    const dayMs = Date.parse(`${day}T00:00:00Z`);
    if (Number.isNaN(dayMs)) continue;

    const ageDays = (nowMs - dayMs) / DAY_MS;
    if (ageDays < 0 || ageDays > HYPE_WINDOW_DAYS) continue;

    total += points * Math.pow(0.5, ageDays / HYPE_HALF_LIFE_DAYS);
  }

  return Math.round(total);
}
