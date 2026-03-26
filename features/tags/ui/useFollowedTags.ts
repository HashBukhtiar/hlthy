import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { TagRepository } from '../infra/tagRepository';

export function useFollowedTags() {
  const { currentUser } = useAuth();
  const [followedTags, setFollowedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentUser?.uid) {
      setFollowedTags([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    TagRepository.fetchFollowedTags(currentUser.uid)
      .then(tags => { if (!cancelled) setFollowedTags(tags); })
      .catch(() => { if (!cancelled) setFollowedTags([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [currentUser?.uid]);

  return { followedTags, loading };
}
