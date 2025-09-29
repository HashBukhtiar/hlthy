// Reusable helper to generate a secure-ish dummy password for account probing
// Tries available crypto APIs first, falls back to Math.random-based string.
export function generateDummyPassword(): string {
  try {
    // Prefer modern randomUUID when available
    if (typeof crypto !== 'undefined' && typeof (crypto as any).randomUUID === 'function') {
      return (crypto as any).randomUUID();
    }

    // Use getRandomValues to create a hex string if available
    if (typeof crypto !== 'undefined' && typeof (crypto as any).getRandomValues === 'function') {
      const arr = new Uint8Array(16);
      (crypto as any).getRandomValues(arr);
      return Array.from(arr).map((b) => ('0' + b.toString(16)).slice(-2)).join('');
    }
  } catch (e) {
    // swallow and fallback
  }

  // Final fallback: pseudo-random with timestamp
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default generateDummyPassword;
