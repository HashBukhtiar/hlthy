/**
 * Separate Jest config for Firestore security-rules tests. These run in a Node
 * environment against the Firestore emulator (not the jest-expo preset), and are
 * launched via `npm run test:rules` (which wraps them in `firebase emulators:exec`).
 */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/rules/**/*.test.js'],
};
