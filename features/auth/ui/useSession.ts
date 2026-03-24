// Re-export Firebase Auth SDK and provide a small helper for session access.
export * from 'firebase/auth';

import { getAuth } from 'firebase/auth';
const _auth = getAuth();
export function getAppAuth() {
  return _auth;
}
