/** Jest config for the Cloud Functions project (ts-jest, node env). */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.ts"],
  // ts-jest with isolatedModules: faster, and we don't need full type-checking
  // of test files to validate runtime behavior.
  transform: {
    "^.+\\.ts$": ["ts-jest", { isolatedModules: true }],
  },
};
