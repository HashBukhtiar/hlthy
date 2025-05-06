import React from 'react';
import { StyleSheet, SafeAreaView } from 'react-native';
import Following from '@/screens/Following';

export default function FollowingScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Following />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
});