import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { MentionRepository } from '../infra/mentionRepository';
import { SelfUnmentionParams } from '../domain/Mention';

export function useSelfUnmention() {
  const [loading, setLoading] = useState(false);

  const promptSelfUnmention = useCallback(
    async (
      params: SelfUnmentionParams,
      authorUsername: string,
      authorUid: string,
      onSuccess?: () => void
    ) => {
      return new Promise<{ blockMention: boolean }>((resolve) => {
        let blockMention = false;

        Alert.alert(
          'Remove your mention?',
          "Your @username will no longer link to your profile. This cannot be undone.",
          [
            {
              text: 'Cancel',
              onPress: () => resolve({ blockMention: false }),
              style: 'cancel',
            },
            {
              text: 'Remove Mention',
              onPress: async () => {
                setLoading(true);
                try {
                  // Show checkbox option before confirming removal
                  Alert.alert(
                    'Additional option',
                    `Also prevent @${authorUsername} from mentioning you in the future?`,
                    [
                      {
                        text: 'No',
                        onPress: async () => {
                          try {
                            await MentionRepository.selfUnmention(params);
                            onSuccess?.();
                            resolve({ blockMention: false });
                          } catch (error) {
                            console.error('Error removing mention:', error);
                            Alert.alert('Error', 'Failed to remove mention. Please try again.');
                            resolve({ blockMention: false });
                          } finally {
                            setLoading(false);
                          }
                        },
                      },
                      {
                        text: 'Yes, block them',
                        onPress: async () => {
                          try {
                            await MentionRepository.selfUnmention(params);
                            await MentionRepository.blockMentionUser(authorUid);
                            onSuccess?.();
                            resolve({ blockMention: true });
                          } catch (error) {
                            console.error('Error removing mention or blocking user:', error);
                            Alert.alert('Error', 'Failed to complete action. Please try again.');
                            resolve({ blockMention: false });
                          } finally {
                            setLoading(false);
                          }
                        },
                      },
                    ]
                  );
                } catch (error) {
                  console.error('Error in promptSelfUnmention:', error);
                  Alert.alert('Error', 'An unexpected error occurred.');
                  setLoading(false);
                  resolve({ blockMention: false });
                }
              },
              style: 'destructive',
            },
          ]
        );
      });
    },
    []
  );

  return { promptSelfUnmention, loading };
}
