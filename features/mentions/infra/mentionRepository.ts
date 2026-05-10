import { httpsCallable } from 'firebase/functions';
import { functions } from '../../../firebaseConfig';
import { MentionSuggestion, SelfUnmentionParams } from '../domain/Mention';

interface SearchResponse {
  suggestions: MentionSuggestion[];
}

interface SelfUnmentionResponse {
  success: boolean;
  message: string;
}

interface BlockMentionUserResponse {
  success: boolean;
  message: string;
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

  static async selfUnmention(params: SelfUnmentionParams): Promise<void> {
    const callable = httpsCallable<SelfUnmentionParams, SelfUnmentionResponse>(
      functions,
      'selfUnmention'
    );
    await callable(params);
  }

  static async blockMentionUser(targetUid: string): Promise<void> {
    const callable = httpsCallable<{ targetUid: string }, BlockMentionUserResponse>(
      functions,
      'blockMentionUser'
    );
    await callable({ targetUid });
  }

  static async unblockMentionUser(targetUid: string): Promise<void> {
    const callable = httpsCallable<{ targetUid: string }, { success: boolean; message: string }>(
      functions,
      'unblockMentionUser'
    );
    await callable({ targetUid });
  }
}
