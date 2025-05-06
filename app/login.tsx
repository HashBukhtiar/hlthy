import React from 'react';
import { StyleSheet, SafeAreaView } from 'react-native';
import Login from '@/screens/Login';

export default function LoginScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Login />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
});