import React from 'react';
import { StyleSheet, SafeAreaView, View } from 'react-native';
import Profile from '@/screens/Profile';
import BottomButtons from '@/components/BottomButtons';

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.content}>
        <Profile />
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