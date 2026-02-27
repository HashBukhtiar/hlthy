import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { WorkoutRepository } from '@/features/workouts/infra/workoutRepository';
import { WorkoutListItem } from '@/features/workouts/domain/WorkoutListItem';
import { logger } from '@/shared/utils/logger';

export interface UseWorkoutListResult {
  myWorkouts: WorkoutListItem[];
  favoriteWorkouts: WorkoutListItem[];
  followingWorkouts: WorkoutListItem[];
  trendingWorkouts: WorkoutListItem[];
  loadingMyWorkouts: boolean;
  loadingFavorites: boolean;
  loadingFollowingWorkouts: boolean;
  loadingTrending: boolean;
  refreshing: boolean;
  refresh: () => void;
}

export function useWorkoutList(): UseWorkoutListResult {
  const { currentUser } = useAuth();

  const [myWorkouts, setMyWorkouts] = useState<WorkoutListItem[]>([]);
  const [favoriteWorkouts, setFavoriteWorkouts] = useState<WorkoutListItem[]>([]);
  const [followingWorkouts, setFollowingWorkouts] = useState<WorkoutListItem[]>([]);
  const [trendingWorkouts, setTrendingWorkouts] = useState<WorkoutListItem[]>([]);

  const [loadingMyWorkouts, setLoadingMyWorkouts] = useState(false);
  const [loadingFavorites, setLoadingFavorites] = useState(false);
  const [loadingFollowingWorkouts, setLoadingFollowingWorkouts] = useState(false);
  const [loadingTrending, setLoadingTrending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMyWorkouts = useCallback(async () => {
    if (!currentUser) return;
    setLoadingMyWorkouts(true);
    try {
      setMyWorkouts(await WorkoutRepository.listMyWorkouts(currentUser.uid));
    } catch (e) {
      logger.error('useWorkoutList', 'listMyWorkouts failed', e);
      setMyWorkouts([]);
    } finally {
      setLoadingMyWorkouts(false);
    }
  }, [currentUser]);

  const fetchFavoriteWorkouts = useCallback(async () => {
    if (!currentUser) return;
    setLoadingFavorites(true);
    try {
      setFavoriteWorkouts(await WorkoutRepository.listFavorites(currentUser.uid));
    } catch (e) {
      logger.error('useWorkoutList', 'listFavorites failed', e);
      setFavoriteWorkouts([]);
    } finally {
      setLoadingFavorites(false);
    }
  }, [currentUser]);

  const fetchFollowingWorkouts = useCallback(async () => {
    if (!currentUser) return;
    setLoadingFollowingWorkouts(true);
    try {
      setFollowingWorkouts(await WorkoutRepository.listFromFollowing(currentUser.uid));
    } catch (e) {
      logger.error('useWorkoutList', 'listFromFollowing failed', e);
      setFollowingWorkouts([]);
    } finally {
      setLoadingFollowingWorkouts(false);
    }
  }, [currentUser]);

  const fetchTrendingWorkouts = useCallback(async () => {
    if (!currentUser) return;
    setLoadingTrending(true);
    try {
      setTrendingWorkouts(await WorkoutRepository.listTrending());
    } catch (e) {
      logger.error('useWorkoutList', 'listTrending failed', e);
      setTrendingWorkouts([]);
    } finally {
      setLoadingTrending(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    fetchMyWorkouts();
    fetchFavoriteWorkouts();
    fetchFollowingWorkouts();
    fetchTrendingWorkouts();
  }, [currentUser, fetchMyWorkouts, fetchFavoriteWorkouts, fetchFollowingWorkouts, fetchTrendingWorkouts]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([
      fetchMyWorkouts(),
      fetchFavoriteWorkouts(),
      fetchFollowingWorkouts(),
      fetchTrendingWorkouts(),
    ]).finally(() => setRefreshing(false));
  }, [fetchMyWorkouts, fetchFavoriteWorkouts, fetchFollowingWorkouts, fetchTrendingWorkouts]);

  return {
    myWorkouts,
    favoriteWorkouts,
    followingWorkouts,
    trendingWorkouts,
    loadingMyWorkouts,
    loadingFavorites,
    loadingFollowingWorkouts,
    loadingTrending,
    refreshing,
    refresh,
  };
}
