import React from 'react';
import { StyleSheet, SafeAreaView } from 'react-native';
import ViewPost from '@/screens/ViewPost';

export default function ViewPostScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ViewPost />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
});