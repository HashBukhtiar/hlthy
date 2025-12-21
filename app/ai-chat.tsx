import React from 'react';
import { StyleSheet, SafeAreaView } from 'react-native';
import AIConversations from '@/screens/AIConversations';

export default function AIChatScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <AIConversations />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
});
