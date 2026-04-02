import { httpsCallable } from 'firebase/functions';
import { functions } from '../../../firebaseConfig';
import { MentionSuggestion } from '../domain/Mention';

interface SearchResponse {
  suggestions: MentionSuggestion[];
}

export class MentionRepository {
  static async searchUsersForMention(query: string): Promise<MentionSuggestion[]> {
    const callable = httpsCallable<{ query: string }, SearchResponse>(
      functions,
      'searchUsersForMention'
    );
    const result = await callable({ query });
    return result.data.suggestions;
  }
}
