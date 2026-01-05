import React from 'react';
import { StyleSheet, SafeAreaView } from 'react-native';
import Post from '@/screens/Post';

export default function PostScreen() {
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