import React from 'react';
import { StyleSheet, SafeAreaView } from 'react-native';
import ForgotPassword from '@/screens/ForgotPassword';

export default function ForgotPasswordScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ForgotPassword />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
});