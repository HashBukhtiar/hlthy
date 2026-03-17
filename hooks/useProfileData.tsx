import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { app } from '@/firebaseConfig';
import { useAuth } from '@/context/AuthContext';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { UserProfile } from '@/types/user';
import { ProfileRepository } from '@/features/profile/infra/profileRepository';

export type { Milestone, GroupedMilestones } from '@/features/profile/domain/Milestone';
import type { Milestone, GroupedMilestones } from '@/features/profile/domain/Milestone';

// ── Pure helpers (no Firestore) ──────────────────────────────────────────────

function processUserProfile(userData: any): UserProfile {
  if (!userData) throw new Error('User data is required');
  return {
    ...userData,
    followerCount: userData.followerCount ?? userData.stats?.followerCount ?? 0,
    followingCount: userData.followingCount ?? userData.stats?.followingCount ?? 0,
    stats: {
      followerCount: userData.followerCount ?? userData.stats?.followerCount ?? 0,
      followingCount: userData.followingCount ?? userData.stats?.followingCount ?? 0,
      postCount: userData.stats?.postCount ?? 0,
      workoutCount: userData.stats?.workoutCount ?? 0,
    },
    profileImageUrl: userData.profileImageUrl || '',
    profileThumbnailUrl: userData.profileThumbnailUrl || null,
    uid: userData.uid || userData.id,
    username: userData.username || '',
    displayName: userData.displayName || '',
    email: userData.email || '',
    bio: userData.bio || '',
    archetype: userData.archetype || 'generalist',
    createdAt: userData.createdAt,
    profileVisibility: userData.profileVisibility ?? 'public',
    dateOfBirth: userData.dateOfBirth || undefined,
    accountPrivacy: userData.accountPrivacy || 'public',
    latestPRs: userData.latestPRs || {},
    physicalStats: userData.physicalStats || undefined,
    fitnessGoals: userData.fitnessGoals || [],
    preferredWorkoutTypes: userData.preferredWorkoutTypes || [],
    workoutFrequency: userData.workoutFrequency || undefined,
    isVerified: userData.isVerified || false,
    isPremium: userData.isPremium || false,
    subscriptionStatus: userData.subscriptionStatus || 'free',
    lastActive: userData.lastActive || undefined,
    isOnline: userData.isOnline || false,
    location: userData.location || undefined,
    socialLinks: userData.socialLinks || undefined,
    notificationSettings: userData.notificationSettings || {
      pushNotifications: true,
      emailNotifications: false,
      followRequests: true,
      workoutReminders: true,
      socialUpdates: true,
    },
    badges: userData.badges || [],
    achievements: userData.achievements || [],
    currentStreak: userData.currentStreak || 0,
    longestStreak: userData.longestStreak || 0,
    contentPreferences: userData.contentPreferences || {
      showMilestones: true,
      showWorkouts: true,
      allowTagging: true,
      profileVisibility: 'everyone',
    },
    units: userData.units || 'metric',
    language: userData.language || 'en',
    region: userData.region || undefined,
    isProfileComplete: userData.isProfileComplete || false,
    profileCompletionPercentage: userData.profileCompletionPercentage || 0,
  } as UserProfile;
}

function groupAndSortMilestones(milestonesToSort: Milestone[]): GroupedMilestones {
  const sorted = [...milestonesToSort].sort((a, b) => {
    let dateA: Date | null = a.date;
    let dateB: Date | null = b.date;
    if (dateA && typeof dateA === 'object' && (dateA as any).seconds)
      dateA = new Date((dateA as any).seconds * 1000);
    else if (dateA && !(dateA instanceof Date)) dateA = new Date(dateA as any);
    else if (!dateA) dateA = null;
    if (dateB && typeof dateB === 'object' && (dateB as any).seconds)
      dateB = new Date((dateB as any).seconds * 1000);
    else if (dateB && !(dateB instanceof Date)) dateB = new Date(dateB as any);
    else if (!dateB) dateB = null;
    if (!dateA && !dateB) return 0;
    if (!dateA) return 1;
    if (!dateB) return -1;
    return dateB.getTime() - dateA.getTime();
  });

  return sorted.reduce((groups: GroupedMilestones, milestone) => {
    let date: Date | null = milestone.date;
    if (date && typeof date === 'object' && (date as any).seconds)
      date = new Date((date as any).seconds * 1000);
    else if (date && !(date instanceof Date)) date = new Date(date as any);
    else if (!date || !(date instanceof Date)) return groups;
    try {
      const monthYear = date.toLocaleString('default', { month: 'long', year: 'numeric' });
      if (!groups[monthYear]) groups[monthYear] = [];
      groups[monthYear].push(milestone);
    } catch (err) {
      console.error('Error formatting month/year for milestone:', err, milestone);
    }
    return groups;
  }, {});
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useProfileData(userId = null, contextUserProfile: UserProfile | null = null) {
  const { currentUser } = useAuth();
  const profileIdToFetch = userId || currentUser?.uid;
  const functions = getFunctions(app, 'northamerica-northeast2');
  const followUserFn = httpsCallable(functions, 'followUser');
  const unfollowUserFn = httpsCallable(functions, 'unfollowUser');

  const isOwnProfile = useMemo(() => !userId || userId === currentUser?.uid, [userId, currentUser?.uid]);

  const hasCleared = useRef(false);
  const lastUserId = useRef<string | null | undefined>(undefined);
  const isFetching = useRef(false);
  const lastFetchedUserId = useRef<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [groupedMilestones, setGroupedMilestones] = useState<GroupedMilestones>({});
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [followers, setFollowers] = useState<any[]>([]);
  const [following, setFollowing] = useState<any[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [isRequestPending, setIsRequestPending] = useState(false);
  const [isFollowingStatus, setIsFollowingStatus] = useState(false);
  const [followActionLoading, setFollowActionLoading] = useState(false);
  const [savedWorkouts, setSavedWorkouts] = useState<any[]>([]);
  const [loadingWorkouts, setLoadingWorkouts] = useState(false);

  const fetchProfileData = useCallback(async () => {
    if (isFetching.current) return;
    if (!profileIdToFetch) {
      setLoading(false);
      setError(new Error('No profile ID available to fetch data.'));
      return;
    }
    if (!currentUser?.uid) {
      if (!hasCleared.current) {
        setLoading(false);
        setLoadingWorkouts(false);
        setProfileData(null);
        setPosts([]);
        setGroupedMilestones({});
        setWorkouts([]);
        setSavedWorkouts([]);
        setFollowers([]);
        setFollowing([]);
        setError(null);
        hasCleared.current = true;
        lastFetchedUserId.current = null;
      }
      return;
    }
    if (lastFetchedUserId.current === profileIdToFetch) return;

    hasCleared.current = false;
    isFetching.current = true;
    lastFetchedUserId.current = profileIdToFetch;
    setLoading(true);
    setLoadingWorkouts(true);
    setError(null);

    try {
      // 1. Fetch user profile
      let userData: UserProfile;
      try {
        const raw = await ProfileRepository.getById(profileIdToFetch);
        if (!currentUser?.uid) { setLoading(false); setLoadingWorkouts(false); return; }
        userData = processUserProfile(raw);
      } catch (profileError) {
        if (!currentUser?.uid) { setLoading(false); setLoadingWorkouts(false); return; }
        console.error('Error fetching user profile:', profileError);
        setError(profileError as Error);
        setLoading(false);
        return;
      }

      // 2. Fetch user posts
      let userPosts: any[] = [];
      try {
        userPosts = await ProfileRepository.getUserPosts(
          profileIdToFetch,
          userData.profileImageUrl,
          userData.profileThumbnailUrl
        );
      } catch (e) {
        console.error('Error fetching posts:', e);
      }

      // 3. Extract milestones from posts (pure transformation, no Firestore)
      let userMilestonesRaw: Milestone[] = [];
      try {
        userMilestonesRaw = userPosts
          .filter(post => post.isMilestone && post.milestoneDetails)
          .map(post => {
            const milestone: Milestone = {
              id: post.id,
              postId: post.id,
              date: post.createdAt,
              exerciseName: '',
              reps: 0,
              weight: '',
            };
            if (post.milestoneDetails.type === 'PR') {
              milestone.exerciseName = post.milestoneDetails.exerciseName || 'Unknown Exercise';
              milestone.reps = post.milestoneDetails.reps || 0;
              milestone.weight = `${post.milestoneDetails.value || 0} ${post.milestoneDetails.weightUnit || ''}`;
              milestone.value = post.milestoneDetails.value;
              milestone.weightUnit = post.milestoneDetails.weightUnit;
              milestone.duration = post.milestoneDetails.duration;
              milestone.level = post.milestoneDetails.level;
              milestone.distance = post.milestoneDetails.distance;
              milestone.distanceUnit = post.milestoneDetails.distanceUnit;
            } else if (
              post.milestoneDetails.type === 'weightLoss' ||
              post.milestoneDetails.type === 'weightGain'
            ) {
              milestone.exerciseName =
                post.milestoneDetails.type === 'weightLoss' ? 'Weight Loss' : 'Weight Gain';
              milestone.weight = `${post.milestoneDetails.newWeight || 0} ${post.milestoneDetails.newWeightUnit || ''}`;
              milestone.newWeight = post.milestoneDetails.newWeight;
              milestone.newWeightUnit = post.milestoneDetails.newWeightUnit;
            }
            return milestone;
          });
      } catch (e) {
        console.error('Error processing milestones:', e);
      }

      // 4. Fetch workouts
      let userWorkouts: any[] = [];
      try {
        userWorkouts = await ProfileRepository.getUserWorkouts(profileIdToFetch);
      } catch (e) {
        console.error('Error fetching workouts:', e);
      }

      // 5. Fetch saved workouts (own profile only)
      let userSavedWorkouts: any[] = [];
      if (isOwnProfile) {
        try {
          userSavedWorkouts = await ProfileRepository.getSavedWorkouts(profileIdToFetch);
        } catch (e) {
          console.error('Error fetching saved workouts:', e);
        }
      }

      // 6. Fetch followers
      let userFollowers: any[] = [];
      try {
        userFollowers = await ProfileRepository.getFollowers(profileIdToFetch);
      } catch (e) {
        console.error('Error fetching followers:', e);
      }

      // 7. Fetch following
      let userFollowingData: any[] = [];
      try {
        userFollowingData = await ProfileRepository.getFollowing(profileIdToFetch);
      } catch (e) {
        console.error('Error fetching following:', e);
      }

      // 8. Follow status (only for other users)
      if (currentUser && profileIdToFetch !== currentUser.uid) {
        try {
          const { isFollowing, isPending } = await ProfileRepository.getFollowStatus(
            profileIdToFetch,
            currentUser.uid
          );
          setIsFollowingStatus(isFollowing);
          setIsRequestPending(isPending);
        } catch (e) {
          console.error('Error checking follow/pending status:', e);
        }
      } else if (profileIdToFetch === currentUser?.uid) {
        setIsFollowingStatus(false);
        setIsRequestPending(false);
      }

      const finalGroupedMilestones = groupAndSortMilestones(userMilestonesRaw);

      setProfileData(userData);
      setPosts(userPosts);
      setGroupedMilestones(finalGroupedMilestones);
      setWorkouts(userWorkouts);
      setSavedWorkouts(userSavedWorkouts);
      setFollowers(userFollowers);
      setFollowing(userFollowingData);
    } catch (err) {
      if (!currentUser?.uid) return;
      console.error('Error in fetchProfileData:', err);
      setError(err as Error);
    } finally {
      if (currentUser?.uid) {
        setLoading(false);
        setLoadingWorkouts(false);
      }
      isFetching.current = false;
    }
  }, [profileIdToFetch, currentUser?.uid, isOwnProfile]);

  const followUser = async (targetUserId: string) => {
    if (!currentUser?.uid) {
      console.error('Current user not found or not authenticated for follow operation');
      return;
    }
    if (currentUser.uid === targetUserId) {
      console.error('Cannot send follow request to yourself');
      return;
    }
    if (isFollowingStatus || isRequestPending) return;
    setFollowActionLoading(true);
    try {
      const result = await followUserFn({ targetUserId });
      const message = (result?.data as { message?: string })?.message || '';
      if (message.includes('pending approval')) {
        setIsRequestPending(true);
        setIsFollowingStatus(false);
      } else {
        setIsFollowingStatus(true);
        setIsRequestPending(false);
      }
    } catch (error) {
      console.error('Error in follow operation:', error);
    } finally {
      setFollowActionLoading(false);
    }
  };

  const unfollowUser = async (targetUserId: string) => {
    if (!currentUser?.uid || followActionLoading) {
      console.error('Current user not found or action in progress for unfollow operation');
      return;
    }
    if (currentUser.uid === targetUserId) {
      console.error('Cannot unfollow yourself');
      return;
    }
    setFollowActionLoading(true);
    try {
      const isPending = await ProfileRepository.isPendingFollowRequest(targetUserId, currentUser.uid);
      if (isPending) {
        const cancelFn = httpsCallable(functions, 'cancelSentFollowRequest');
        await cancelFn({ targetUserId });
        setIsRequestPending(false);
      } else {
        await unfollowUserFn({ targetUserId });
        setIsFollowingStatus(false);
      }
    } catch (error) {
      console.error('Error in unfollow/cancel request operation:', error);
    } finally {
      setFollowActionLoading(false);
    }
  };

  const refreshProfileData = useCallback(async () => {
    lastFetchedUserId.current = null;
    await fetchProfileData();
  }, [fetchProfileData]);

  useEffect(() => {
    const currentUserId = currentUser?.uid;

    if (lastUserId.current === currentUserId && hasCleared.current) return;

    if (lastUserId.current !== currentUserId) {
      lastUserId.current = currentUserId;
      hasCleared.current = false;
      isFetching.current = false;
      lastFetchedUserId.current = null;
    }

    if (!currentUserId) {
      if (!hasCleared.current) {
        setLoading(false);
        setLoadingWorkouts(false);
        setProfileData(null);
        setPosts([]);
        setGroupedMilestones({});
        setWorkouts([]);
        setSavedWorkouts([]);
        setFollowers([]);
        setFollowing([]);
        hasCleared.current = true;
        lastFetchedUserId.current = null;
      }
      return;
    }

    hasCleared.current = false;
    if (profileIdToFetch) {
      fetchProfileData();
    } else {
      setLoading(false);
    }
  }, [fetchProfileData, profileIdToFetch, currentUser?.uid]);

  return {
    loading,
    profileData,
    posts,
    groupedMilestones,
    workouts,
    savedWorkouts,
    loadingWorkouts,
    followers,
    following,
    error,
    refreshProfileData,
    isFollowingStatus,
    isRequestPending,
    followUser,
    unfollowUser,
    followActionLoading,
    viewedProfileId: profileIdToFetch,
  };
}
