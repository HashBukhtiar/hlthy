import { useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { NotificationService } from '@/services/NotificationService';
import { logger } from '@/shared/utils/logger';

/**
 * NotificationBootstrap — renderless component.
 *
 * Mount this inside AuthProvider. It initializes push notifications once a
 * fully-loaded user profile is available, and properly cleans up listener
 * subscriptions on unmount (fixing the leak in the original AuthContext code).
 *
 * Token removal on logout is still handled by AuthContext.logout() which runs
 * before signOut() — that timing is intentional and must stay there.
 */
export function NotificationBootstrap(): null {
  const { currentUser, userProfile } = useAuth();
  const initializedForUid = useRef<string | null>(null);
  const listenersRef = useRef<{
    notificationListener: { remove(): void };
    responseListener: { remove(): void };
  } | null>(null);

  useEffect(() => {
    // Only run when both auth user and Firestore profile are present.
    // Guard against re-running for the same UID on profile refreshes.
    if (!currentUser?.uid || !userProfile) return;
    if (initializedForUid.current === currentUser.uid) return;

    let cancelled = false;

    const setup = async () => {
      try {
        await NotificationService.setupNotificationChannels();
        const success = await NotificationService.registerForPushNotifications(currentUser.uid);
        if (cancelled) return;

        if (success) {
          // Store subscription refs so we can remove them on cleanup.
          listenersRef.current = NotificationService.setupNotificationListeners();
        }

        initializedForUid.current = currentUser.uid;
        logger.debug('NotificationBootstrap', 'Notifications initialized', { uid: currentUser.uid });
      } catch (error) {
        logger.error('NotificationBootstrap', 'Notification setup failed', error);
      }
    };

    setup();

    return () => {
      cancelled = true;
    };
  }, [currentUser?.uid, userProfile]);

  // Clean up listener subscriptions when the component unmounts or user changes.
  useEffect(() => {
    return () => {
      if (listenersRef.current) {
        listenersRef.current.notificationListener.remove();
        listenersRef.current.responseListener.remove();
        listenersRef.current = null;
      }
    };
  }, []);

  // Reset the initialization guard when user signs out.
  useEffect(() => {
    if (!currentUser) {
      initializedForUid.current = null;
    }
  }, [currentUser]);

  return null;
}
