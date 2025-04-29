import React from 'react';
import { StyleSheet, SafeAreaView } from 'react-native';
import SignUp from '@/screens/SignUp';

export default function SignUpScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <SignUp />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
});