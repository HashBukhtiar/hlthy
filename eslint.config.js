const tsParser = require('@typescript-eslint/parser');

/**
 * Minimal ESLint flat config for hlthy.
 *
 * Purpose: enforce the boundary rule that prevents screens, hooks, and route files
 * from importing directly from firebase/firestore or firebase/auth.
 *
 * Extends nothing heavy — only uses the TypeScript parser so .ts/.tsx files parse
 * correctly, then applies the no-restricted-imports rule.
 *
 * Upgrade path: once eslint-config-expo is compatible with ESLint v10's flat config
 * API, extend it here and remove the manual parser setup.
 */
module.exports = [
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      // Prevent direct Firebase SDK imports in presentation and application layers.
      // Repositories in features/*/infra/ are the only allowed Firestore access point.
      // Currently 'warn' during migration; promote to 'error' per directory as domains migrate.
      'no-restricted-imports': [
        'warn',
        {
          paths: [
            {
              name: 'firebase/firestore',
              message:
                'Import via a repository in features/*/infra/ instead of calling Firestore directly in screens, hooks, or app routes.',
            },
            {
              name: 'firebase/auth',
              message:
                'Import Firebase Auth via features/auth/ui/useSession instead of directly.',
            },
          ],
        },
      ],
    },
  },
  {
    // Repositories, services, feature module files (domain types + ui hooks), and
    // infra files are all allowed to import Firebase directly.
    // The boundary rule targets screens/, app/, and top-level hooks/ only.
    files: [
      'features/**/*.ts',
      'features/**/*.tsx',
      'services/**/*.ts',
      'services/**/*.tsx',
      'firebaseConfig.ts',
      'context/AuthContext.tsx',
    ],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
  {
    // Existing hooks have Firestore imports; suppress until each hook is migrated.
    // Remove each entry from this list as its domain moves to features/.
    files: [
      // hooks/useFeedData.tsx graduated — Phase 3 complete
      // hooks/useContentActions.ts graduated — no firebase/firestore imports
      // hooks/useReporting.tsx graduated — no firebase/firestore imports
      // hooks/useProfileActions.ts graduated — dead Firestore call removed
      'hooks/usePostsData.tsx',
      'hooks/useProfileData.tsx',
      'hooks/useSettingsHandlers.ts',
    ],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
  {
    // Ignore generated/vendor directories.
    ignores: ['node_modules/**', '.expo/**', 'dist/**', 'build/**'],
  },
];
