import React from 'react';
import { StyleSheet, SafeAreaView } from 'react-native';
import Post from '@/screens/Post';

export default function PostTabScreen() {
  console.log('[PostTabScreen] Rendering tabs/post.tsx');
  
  return (
    <SafeAreaView style={styles.container}>
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
