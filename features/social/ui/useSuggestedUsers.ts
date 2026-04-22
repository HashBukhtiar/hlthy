import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { SuggestedUsersRepository } from '@/features/social/infra/suggestedUsersRepository';
import { SuggestedUser } from '@/features/social/domain/SuggestedUser';
import { logger } from '@/shared/utils/logger';

const DOMAIN = 'useSuggestedUsers';

export function useSuggestedUsers() {
  const { currentUser } = useAuth();
  const [suggestions, setSuggestions] = useState<SuggestedUser[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentUser) return;

    let active = true;

    const fetch = async () => {
      setLoading(true);
      try {
        const results = await SuggestedUsersRepository.getSuggestions(currentUser.uid);
        if (active) setSuggestions(results);
      } catch (err) {
        logger.error(DOMAIN, 'Failed to load suggested users', err);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetch();

    return () => {
      active = false;
    };
  }, [currentUser]);

  return { suggestions, loading };
}
