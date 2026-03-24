import { functions } from '@/firebaseConfig';
import { httpsCallable } from 'firebase/functions';
import type { TagSearchResult } from '../domain/Tag';

const searchHashtagsCallable = httpsCallable<
  { query: string },
  { results: TagSearchResult[] }
>(functions, 'searchHashtags');

export const TagRepository = {
  /**
   * Search for tags matching the given query.
   * Performs prefix search, filters banned tags, and returns top results.
   */
  async searchTags(query: string): Promise<TagSearchResult[]> {
    try {
      const result = await searchHashtagsCallable({ query });
      return result.data.results;
    } catch (error) {
      console.error('Error searching hashtags:', error);
      return [];
    }
  },
};
