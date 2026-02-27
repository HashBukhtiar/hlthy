import React from 'react';
import { StyleSheet, View } from 'react-native';
import Profile from '@/screens/Profile';

export default function ProfileTabScreen() {
  return (
    <View style={styles.container}>
      <Profile />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
});
