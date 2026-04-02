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
      setLoading(true);

      Alert.alert(
        'Remove your mention?',
        "Your @username will no longer link to your profile. This cannot be undone.",
        [
          {
            text: 'Cancel',
            onPress: () => {
              setLoading(false);
            },
            style: 'cancel',
          },
          {
            text: 'Remove Mention',
            onPress: () => {
              // Show option to also block future mentions
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
                        Alert.alert('Success', 'Your mention has been removed.');
                      } catch (error) {
                        console.error('Error removing mention:', error);
                        Alert.alert('Error', 'Failed to remove mention. Please try again.');
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
                        Alert.alert('Success', 'Your mention has been removed and they are blocked from mentioning you.');
                      } catch (error) {
                        console.error('Error removing mention or blocking user:', error);
                        Alert.alert('Error', 'Failed to complete action. Please try again.');
                      } finally {
                        setLoading(false);
                      }
                    },
                  },
                ]
              );
            },
            style: 'destructive',
          },
        ]
      );
    },
    []
  );

  return { promptSelfUnmention, loading };
}
