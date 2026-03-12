import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebaseConfig';

export const SettingsRepository = {
  /** Persists an arbitrary partial update to users/{uid}. */
  async updateUser(uid: string, data: Record<string, unknown>): Promise<void> {
    await updateDoc(doc(db, 'users', uid), data);
  },
};
