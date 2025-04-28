import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import globalStyles from '@/styles/globalStyles';

export default function Post() {
  return (
    <View style={[globalStyles.container, styles.container]}>
      <Text style={styles.text}>Post Screen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: 'white',
    fontSize: 20,
  },
});