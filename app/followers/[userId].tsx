import React from 'react';
import { StyleSheet, SafeAreaView } from 'react-native';
import Followers from '@/screens/Followers';

export default function FollowersScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Followers />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
});