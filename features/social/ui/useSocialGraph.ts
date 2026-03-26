import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { SocialGraphRepository } from '@/features/social/infra/socialGraphRepository';
import { SocialGraphEntry } from '@/features/social/domain/SocialGraphEntry';
import { TagRepository } from '@/features/tags/infra/tagRepository';
import { logger } from '@/shared/utils/logger';

export type SocialGraphItem =
  | (SocialGraphEntry & { type: 'user' })
  | ({ type: 'tag'; id: string; name: string });

interface UseSocialGraphResult {
  entries: SocialGraphItem[];
  username: string;
  loading: boolean;
  error: string | null;
}

export function useSocialGraph(
  userId: string | undefined,
  mode: 'followers' | 'following'
): UseSocialGraphResult {
  const { currentUser } = useAuth();
  const [entries, setEntries] = useState<SocialGraphEntry[]>([]);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    let active = true;

    const fetch = async () => {
      try {
        setLoading(true);
        // Only fetch followed tags when viewing the current user's own following list
        const shouldFetchTags = mode === 'following' && userId === currentUser?.uid;

        const [resolvedUsername, resolvedEntries, resolvedTags] = await Promise.all([
          SocialGraphRepository.fetchUsername(userId),
          mode === 'followers'
            ? SocialGraphRepository.listFollowers(userId)
            : SocialGraphRepository.listFollowing(userId),
          shouldFetchTags ? TagRepository.fetchFollowedTags(userId) : Promise.resolve([]),
        ]);
        if (!active) return;
        setUsername(resolvedUsername);

        // Combine users and tags into a single list for 'following' mode
        const combined: SocialGraphItem[] = [
          ...resolvedEntries.map(u => ({ ...u, type: 'user' as const })),
          ...(resolvedTags.map(tagName => ({
            type: 'tag' as const,
            id: tagName,
            name: tagName,
          }))),
        ];

        setEntries(combined);
        setError(null);
      } catch (err: any) {
        logger.error('useSocialGraph', `Failed to load ${mode}`, err);
        if (active) setError(err?.message ?? 'Unknown error');
      } finally {
        if (active) setLoading(false);
      }
    };

    fetch();

    return () => {
      active = false;
    };
  }, [userId, mode, currentUser?.uid]);

  return { entries, username, loading, error };
}
