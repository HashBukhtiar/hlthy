module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:import/errors",
    "plugin:import/warnings",
    "plugin:import/typescript",
    "google",
    "plugin:@typescript-eslint/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: ["tsconfig.json", "tsconfig.dev.json"],
    sourceType: "module",
    tsconfigRootDir: __dirname,
  },
  ignorePatterns: [
    "/lib/**/*",
    "/node_modules/**/*",
  ],
  plugins: ["@typescript-eslint", "import"],
  rules: {
    "quotes": ["error", "double"],
    "import/no-unresolved": 0,
    "indent": ["error", 2],
    "linebreak-style": "off",
    "object-curly-spacing": ["error", "never"],
    "max-len": ["error", {"code": 200, "ignoreComments": true, "ignoreUrls": true}],
    "no-trailing-spaces": "error",
    "eol-last": ["error", "always"],
    "require-jsdoc": 0,
    "valid-jsdoc": 0,
    "@typescript-eslint/no-unused-vars": "warn",
  },
};
