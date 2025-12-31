import React from 'react';
import { StyleSheet, SafeAreaView, View } from 'react-native';
import DMs from '@/screens/DMs';
import BottomButtons from '@/components/BottomButtons';

export default function DMsScreen() {
  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.content}>
        <DMs />
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