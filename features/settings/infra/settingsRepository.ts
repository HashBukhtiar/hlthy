import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/firebaseConfig';

export const SettingsRepository = {
  /** Persists an arbitrary partial update to users/{uid}. */
  async updateUser(uid: string, data: Record<string, unknown>): Promise<void> {
    await updateDoc(doc(db, 'users', uid), data);
  },

  /** Increments analytics counters on the user document. Non-critical — swallows errors. */
  async trackSettingsChange(uid: string, settingKey: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'users', uid), {
        'analytics.settingsUpdateCount': increment(1),
        'analytics.lastSettingsUpdate': new Date(),
        [`analytics.changedSettings.${settingKey}`]: increment(1),
      });
    } catch {
      // Analytics is non-critical; do not surface errors to callers.
    }
  },
};
