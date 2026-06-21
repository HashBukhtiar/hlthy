/**
 * Pure text sanitization for user-generated content (no React, no Firebase).
 *
 * Client-side defense + UX. The hard, unbypassable limits live in
 * firestore.rules - these mirror them and clean up input before it's written.
 */

// UX-facing length limits (match the maxLength on the corresponding inputs).
// firestore.rules enforces a higher hard cap as the anti-abuse backstop.
export const TEXT_LIMITS = {
  postCaption: 2200,
  comment: 500,
  reply: 500,
  message: 2000,
} as const;

const TAB = 0x09;
const NEWLINE = 0x0a;
const CARRIAGE_RETURN = 0x0d;
const DEL = 0x7f;
// Zero-width space/joiner/non-joiner, word-joiner, BOM.
const ZERO_WIDTH = new Set([0x200b, 0x200c, 0x200d, 0x2060, 0xfeff]);

/** True for chars we strip: C0/C1 control chars (except tab/newline/CR) and zero-width. */
function isStrippable(code: number): boolean {
  if (code === TAB || code === NEWLINE || code === CARRIAGE_RETURN) return false;
  if (code < 0x20 || code === DEL) return true;
  return ZERO_WIDTH.has(code);
}

/**
 * Strip control/zero-width characters, collapse excessive blank lines, trim,
 * and hard-cap length. Returns '' for nullish input.
 */
export function sanitizeText(input: string | null | undefined, maxLength: number): string {
  if (!input) return '';

  let cleaned = '';
  for (const ch of String(input)) {
    const code = ch.codePointAt(0);
    if (code !== undefined && isStrippable(code)) continue;
    cleaned += ch;
  }

  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();
  return cleaned.length > maxLength ? cleaned.slice(0, maxLength) : cleaned;
}
