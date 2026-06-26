import {
  usernameToUrl,
  validatePlatformUrl,
  validateCustomUrl,
} from '../socialLinkValidation';

describe('usernameToUrl', () => {
  it('returns empty string for empty input', () => {
    expect(usernameToUrl('instagram', '')).toBe('');
  });

  it('passes through an existing URL unchanged', () => {
    expect(usernameToUrl('instagram', 'https://instagram.com/abc')).toBe('https://instagram.com/abc');
  });

  it('builds a URL from a bare username, stripping a leading @', () => {
    expect(usernameToUrl('instagram', '@abc')).toBe('https://instagram.com/abc');
    expect(usernameToUrl('github', 'octocat')).toBe('https://github.com/octocat');
  });

  it('adds the @ prefix for platforms that require it', () => {
    expect(usernameToUrl('tiktok', 'abc')).toBe('https://tiktok.com/@abc');
    expect(usernameToUrl('youtube', 'abc')).toBe('https://youtube.com/@abc');
  });
});

describe('validatePlatformUrl', () => {
  it('treats empty as valid (optional field)', () => {
    expect(validatePlatformUrl('instagram', '')).toBe(true);
  });

  it('accepts well-formed platform URLs', () => {
    expect(validatePlatformUrl('instagram', 'https://instagram.com/abc')).toBe(true);
    expect(validatePlatformUrl('twitter', 'https://x.com/abc')).toBe(true);
    expect(validatePlatformUrl('tiktok', 'https://tiktok.com/@abc')).toBe(true);
  });

  it('rejects URLs that do not match the platform pattern', () => {
    expect(validatePlatformUrl('instagram', 'https://example.com/abc')).toBe(false);
    expect(validatePlatformUrl('tiktok', 'https://tiktok.com/abc')).toBe(false); // missing @
  });
});

describe('validateCustomUrl', () => {
  it('treats empty as valid', () => {
    expect(validateCustomUrl('')).toBe(true);
  });

  it('accepts http/https URLs', () => {
    expect(validateCustomUrl('https://example.com')).toBe(true);
    expect(validateCustomUrl('http://example.com/path')).toBe(true);
  });

  it('rejects non-http(s) or malformed URLs', () => {
    expect(validateCustomUrl('ftp://example.com')).toBe(false);
    expect(validateCustomUrl('not a url')).toBe(false);
  });
});
