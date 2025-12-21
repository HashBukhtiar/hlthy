import React from 'react';
import { StyleSheet, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

export default function AIChatScreen() {
  const router = useRouter();
  const { currentUser } = useAuth();

  React.useEffect(() => {
    // Navigate to the AI conversation chat screen
    if (currentUser) {
      const aiConversationId = `${currentUser.uid}_ai_conversation`;
      router.replace(`/chat/${aiConversationId}`);
    }
  }, [currentUser]);

  return (
    <SafeAreaView style={styles.container} />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
});
