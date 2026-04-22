import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { TagRepository } from '../infra/tagRepository';

export function useTagFollow(tagName: string) {
  const { currentUser } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.uid || !tagName) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    TagRepository.isFollowingTag(currentUser.uid, tagName)
      .then(following => { if (!cancelled) setIsFollowing(following); })
      .catch(() => { if (!cancelled) setIsFollowing(false); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [currentUser?.uid, tagName]);

  const toggle = useCallback(async () => {
    if (!currentUser?.uid || loading) return;
    const prev = isFollowing;
    setIsFollowing(!prev); // optimistic
    try {
      if (prev) {
        await TagRepository.unfollowTag(currentUser.uid, tagName);
      } else {
        await TagRepository.followTag(currentUser.uid, tagName);
      }
    } catch (err) {
      console.error('Error toggling tag follow:', err);
      setIsFollowing(prev); // revert on error
    }
  }, [currentUser?.uid, tagName, isFollowing, loading]);

  return { isFollowing, toggle, loading };
}
