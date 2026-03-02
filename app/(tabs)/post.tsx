import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Post from '@/screens/Post';

export default function PostTabScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Post />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
});
