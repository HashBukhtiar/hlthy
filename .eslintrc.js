module.exports = {
  root: true,
  extends: ['expo'],
  rules: {
    // Prevent direct Firebase SDK imports in presentation and application layers.
    // Repositories in features/*/infra/ are the only allowed Firestore access point.
    // Set to 'warn' during migration; promote to 'error' per directory as domains migrate.
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
  overrides: [
    {
      // Repositories and existing services are the ONLY files allowed to import Firebase directly.
      files: [
        'features/*/infra/**/*.ts',
        'features/*/infra/**/*.tsx',
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
        'hooks/useFeedData.tsx',
        'hooks/usePostsData.tsx',
        'hooks/useProfileData.tsx',
        'hooks/useProfileActions.ts',
        'hooks/useContentActions.ts',
        'hooks/useSettingsHandlers.ts',
        'hooks/useReporting.tsx',
      ],
      rules: {
        'no-restricted-imports': 'off',
      },
    },
  ],
};
