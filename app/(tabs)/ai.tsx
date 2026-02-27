import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AIConversations from '@/screens/AIConversations';

export default function AITabScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
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
