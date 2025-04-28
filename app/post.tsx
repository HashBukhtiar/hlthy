import React from 'react';
import { StyleSheet, SafeAreaView } from 'react-native';
import Post from '@/screens/Post';
import BottomButtons from '@/components/BottomButtons';

export default function PostScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Post />
      <BottomButtons />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
});