import React from 'react';
import { StyleSheet, SafeAreaView } from 'react-native';
import EditProfile from '@/screens/EditProfile';

export default function EditProfileScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <EditProfile />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
});
