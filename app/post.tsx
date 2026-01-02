import React from 'react';
import { StyleSheet, SafeAreaView, View } from 'react-native';
import Post from '@/screens/Post';
import BottomButtons from '@/components/BottomButtons';

export default function PostScreen() {
  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.content}>
        <Post />
      </SafeAreaView>
      <BottomButtons />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  content: {
    flex: 1,
  },
});