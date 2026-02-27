import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { ActivityItem } from '@/features/notifications/domain/ActivityItem';

export const ActivityRepository = {
  /**
   * Subscribes to pending follow requests for a user.
   * Returns an unsubscribe function.
   */
  subscribeFollowRequests(
    uid: string,
    onUpdate: (items: ActivityItem[]) => void,
    onError: (error: Error) => void
  ): () => void {
    const q = query(
      collection(db, 'activity', uid, 'userActivity'),
      where('type', '==', 'follow_request'),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(
      q,
      snapshot => {
        const items: ActivityItem[] = [];
        snapshot.forEach(doc => {
          items.push({ ...(doc.data() as ActivityItem), id: doc.id });
        });
        onUpdate(items);
      },
      error => onError(error as Error)
    );
  },

  /**
   * Subscribes to non-follow-request activity for a user.
   * Returns an unsubscribe function.
   */
  subscribeOtherActivities(
    uid: string,
    onUpdate: (items: ActivityItem[]) => void,
    onError: (error: Error) => void
  ): () => void {
    const q = query(
      collection(db, 'activity', uid, 'userActivity'),
      where('type', '!=', 'follow_request'),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(
      q,
      snapshot => {
        const items: ActivityItem[] = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          if (data.type !== 'follow_request') {
            items.push({ ...(data as ActivityItem), id: doc.id });
          }
        });
        onUpdate(items);
      },
      error => onError(error as Error)
    );
  },
};
