import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useBlockEnforcement } from '@/utils/blockUtils';
import { ActivityRepository } from '@/features/notifications/infra/activityRepository';
import { ActivityItem } from '@/features/notifications/domain/ActivityItem';
import { logger } from '@/shared/utils/logger';

interface UsePulseResult {
  followRequests: ActivityItem[];
  otherActivities: ActivityItem[];
  loadingRequests: boolean;
  loadingActivities: boolean;
}

export function usePulse(): UsePulseResult {
  const { currentUser } = useAuth();
  const { isUserBlocked } = useBlockEnforcement();

  const [followRequests, setFollowRequests] = useState<ActivityItem[]>([]);
  const [otherActivities, setOtherActivities] = useState<ActivityItem[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [loadingActivities, setLoadingActivities] = useState(true);

  // Follow requests listener
  useEffect(() => {
    if (!currentUser?.uid) {
      setFollowRequests([]);
      setLoadingRequests(false);
      return;
    }

    setLoadingRequests(true);
    const uid = currentUser.uid;

    const unsubscribe = ActivityRepository.subscribeFollowRequests(
      uid,
      items => {
        // Deduplicate by fromUserId; filter blocked users.
        const seen = new Set<string>();
        const filtered = items.filter(item => {
          if (isUserBlocked(item.fromUserId)) return false;
          if (seen.has(item.fromUserId)) return false;
          seen.add(item.fromUserId);
          return true;
        });
        setFollowRequests(filtered);
        setLoadingRequests(false);
      },
      err => {
        logger.error('usePulse', 'Error fetching follow requests', err);
        setLoadingRequests(false);
      }
    );

    return unsubscribe;
  }, [currentUser?.uid, isUserBlocked]);

  // Other activities listener
  useEffect(() => {
    if (!currentUser?.uid) {
      setOtherActivities([]);
      setLoadingActivities(false);
      return;
    }

    setLoadingActivities(true);
    const uid = currentUser.uid;

    const unsubscribe = ActivityRepository.subscribeOtherActivities(
      uid,
      items => {
        const filtered = items.filter(item => !isUserBlocked(item.fromUserId));
        setOtherActivities(filtered);
        setLoadingActivities(false);
      },
      err => {
        logger.error('usePulse', 'Error fetching activities', err);
        setLoadingActivities(false);
      }
    );

    return unsubscribe;
  }, [currentUser?.uid, isUserBlocked]);

  return { followRequests, otherActivities, loadingRequests, loadingActivities };
}
