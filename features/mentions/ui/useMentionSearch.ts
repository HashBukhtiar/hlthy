import { useState, useRef, useCallback } from 'react';
import { MentionSuggestion } from '../domain/Mention';
import { MentionRepository } from '../infra/mentionRepository';

export function useMentionSearch() {
  const [suggestions, setSuggestions] = useState<MentionSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestQueryRef = useRef('');

  const search = useCallback((query: string) => {
    latestQueryRef.current = query;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!query.trim()) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    debounceRef.current = setTimeout(async () => {
      try {
        const results = await MentionRepository.searchUsersForMention(query.trim());
        // Only update if this is still the latest query
        if (latestQueryRef.current === query) {
          setSuggestions(results);
        }
      } catch (error) {
        console.error('Mention search error:', error);
        if (latestQueryRef.current === query) {
          setSuggestions([]);
        }
      } finally {
        if (latestQueryRef.current === query) {
          setLoading(false);
        }
      }
    }, 300);
  }, []);

  const clear = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    latestQueryRef.current = '';
    setSuggestions([]);
    setLoading(false);
  }, []);

  return { suggestions, loading, search, clear };
}
