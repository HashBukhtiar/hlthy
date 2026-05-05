import React from 'react';
import { StyleSheet, SafeAreaView } from 'react-native';
import NotificationsSettings from '@/screens/settings/NotificationsSettings';

export default function NotificationsSettingsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <NotificationsSettings />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
});
