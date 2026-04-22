import { useCallback, useEffect, useRef, useState } from 'react';
import { TagRepository } from '../infra/tagRepository';
import type { TagSearchResult } from '../domain/Tag';

export function useTagSearch() {
  const [suggestions, setSuggestions] = useState<TagSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout>();

  const search = useCallback((query: string) => {
    // Clear existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (!query.trim()) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // 300ms debounce
    debounceTimer.current = setTimeout(async () => {
      const results = await TagRepository.searchTags(query);
      setSuggestions(results);
      setLoading(false);
    }, 300);
  }, []);

  const clear = useCallback(() => {
    setSuggestions([]);
    setLoading(false);
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return { suggestions, loading, search, clear };
}
