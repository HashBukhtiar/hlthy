import { sanitizeText, TEXT_LIMITS } from '../sanitize';

const NUL = String.fromCharCode(0x00);
const BACKSPACE = String.fromCharCode(0x08);
const DEL = String.fromCharCode(0x7f);
const ZWSP = String.fromCharCode(0x200b); // zero-width space
const ZWNJ = String.fromCharCode(0x200c); // zero-width non-joiner
const BOM = String.fromCharCode(0xfeff); // byte-order mark

describe('sanitizeText', () => {
  it('returns empty string for nullish input', () => {
    expect(sanitizeText(null, 100)).toBe('');
    expect(sanitizeText(undefined, 100)).toBe('');
    expect(sanitizeText('', 100)).toBe('');
  });

  it('trims surrounding whitespace', () => {
    expect(sanitizeText('  hello  ', 100)).toBe('hello');
  });

  it('preserves tab, newline, and carriage return', () => {
    expect(sanitizeText('a\tb\nc', 100)).toBe('a\tb\nc');
  });

  it('strips control characters', () => {
    expect(sanitizeText(`a${NUL}b${BACKSPACE}c${DEL}d`, 100)).toBe('abcd');
  });

  it('strips zero-width and BOM characters', () => {
    expect(sanitizeText(`he${ZWSP}ll${ZWNJ}o${BOM}`, 100)).toBe('hello');
  });

  it('collapses 3+ consecutive newlines to 2', () => {
    expect(sanitizeText('a\n\n\n\n\nb', 100)).toBe('a\n\nb');
  });

  it('hard-caps to maxLength', () => {
    expect(sanitizeText('x'.repeat(50), 10)).toBe('x'.repeat(10));
  });

  it('exposes content limits', () => {
    expect(TEXT_LIMITS.comment).toBeGreaterThan(0);
    expect(TEXT_LIMITS.postCaption).toBeGreaterThanOrEqual(TEXT_LIMITS.comment);
  });
});
