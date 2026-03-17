# Settings

The Settings screen lets users control their profile, privacy, notifications, and account.

---

## Key Files

| File | Purpose |
|------|---------|
| `screens/Settings.tsx` | Full settings UI |
| `hooks/useSettingsHandlers.ts` | All save/export/import/logout/delete actions |
| `features/settings/infra/settingsRepository.ts` | `updateUser(uid, data)` — writes to Firestore |
| `utils/settingsValidation.ts` | Input validation (display name, bio, etc.) |
| `utils/settingsBackup.ts` | Local AsyncStorage backup before saving |
| `utils/settingsExport.ts` | Export/import settings as a JSON file |
| `utils/settingsAnalytics.ts` | Privacy score + insights displayed in settings |
| `types/settings.ts` | `UserSettings` type |

---

## Settings Sections

### Profile Info
- **Display name** — 2–30 characters; no special symbols
- **Bio** — Up to 300 characters
- **Archetype** — Fitness persona (athlete, bodybuilder, etc.)
- **Date of birth** — Private; used for age verification and insights
- **Social links** — Instagram, Twitter, TikTok, YouTube, etc.
- **Profile photo** — Tap to pick from camera roll; uploaded to Storage

### Account & Security
- **Email** — Read-only (tied to Firebase Auth)
- **Change password** — Sends a Firebase password reset email
- **Two-factor authentication** — Toggle (stored as flag; implementation depends on future auth provider support)

### Privacy & Visibility

| Setting | Options | Effect |
|---------|---------|--------|
| Profile visibility | Public / Private | Private requires follow approval |
| Message permission | Everyone / Followers only | Controls who can DM you |
| Follow permission | Anyone / Approval required | Controls public vs private account |
| Comment permission | Everyone / Followers only | Controls who can comment on your posts |

### Notifications

Toggle for each notification type:
- New followers
- Likes and comments
- Direct messages
- Follow request accepted
- Tagged in comments
- Mentioned in replies

### App Preferences
- **Theme** — Light / Dark / System
- **Language** — English, Spanish, French, German, Italian, Dutch
- **Units** — Metric / Imperial (separate for weight and distance)

### Privacy Insights

The settings screen displays a **Privacy Level** indicator (`open` / `moderate` / `strict`) calculated from a weighted score of the user's privacy settings. It also shows personalized recommendations (e.g., "Consider making your profile private").

### Data & Account

| Action | What it does |
|--------|-------------|
| Export settings | Saves all settings to a `.json` file and opens the share sheet |
| Import settings | Picks a `.json` file and applies settings (excludes sensitive fields like email and blockedUsers) |
| Restore backup | Restores settings from the last local backup (stored in AsyncStorage) |
| Reset to defaults | Wipes all settings back to default values |
| Clear chat history | Calls Cloud Function to delete all AI chat messages |
| Clear search history | Calls Cloud Function to delete search history |
| Change password | Sends Firebase password reset email |
| Delete account | Prompts user to type "DELETE" then calls Cloud Function `deleteUserAccount` |

---

## Save Flow

1. Tapping **Save** calls `handleSaveSettings()`
2. `validateSettings(settings)` runs — returns errors and warnings
3. If there are errors, an alert is shown and save is aborted
4. If there are warnings, the user must confirm before proceeding
5. `sanitizeSettings(settings)` trims strings, normalizes case, etc.
6. A local backup is created in AsyncStorage (`createSettingsBackup`)
7. `SettingsRepository.updateUser(uid, firestoreData)` writes to Firestore
8. If the profile image changed, the old image is deleted from Storage
9. `refreshUserProfile()` re-fetches the user document to sync in-memory state

---

## Unsaved Changes

The settings screen tracks whether the user has unsaved changes. If they navigate back with unsaved changes, they get an alert:
- **Discard** — Reverts to original values; deletes any temporarily uploaded photo
- **Cancel** — Stays on the settings screen
- **Save** — Saves then navigates back

---

## Local Backup

Before every save, the current settings are serialized to AsyncStorage at key `hlthy_settings_backup`. This provides a restore point in case of save failure or user error. The last 5 backups are retained in `hlthy_settings_history`.
