import React from 'react';
import { StyleSheet, SafeAreaView } from 'react-native';
import EditProfileSocialLinks from '@/screens/EditProfileSocialLinks';

export default function EditProfileSocialLinksScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <EditProfileSocialLinks />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
});
