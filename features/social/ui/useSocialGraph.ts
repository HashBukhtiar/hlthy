import { useState, useEffect } from 'react';
import { SocialGraphRepository } from '@/features/social/infra/socialGraphRepository';
import { SocialGraphEntry } from '@/features/social/domain/SocialGraphEntry';
import { logger } from '@/shared/utils/logger';

interface UseSocialGraphResult {
  entries: SocialGraphEntry[];
  username: string;
  loading: boolean;
  error: string | null;
}

export function useSocialGraph(
  userId: string | undefined,
  mode: 'followers' | 'following'
): UseSocialGraphResult {
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
        const [resolvedUsername, resolvedEntries] = await Promise.all([
          SocialGraphRepository.fetchUsername(userId),
          mode === 'followers'
            ? SocialGraphRepository.listFollowers(userId)
            : SocialGraphRepository.listFollowing(userId),
        ]);
        if (!active) return;
        setUsername(resolvedUsername);
        setEntries(resolvedEntries);
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
  }, [userId, mode]);

  return { entries, username, loading, error };
}
