import React from 'react';
import { View, StyleSheet } from 'react-native';
import ProfileCard from '@/screens/ProfileCard';
import { Stack, useLocalSearchParams } from 'expo-router';

export default function ViewProfileCardScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: false,
          animation: 'fade_from_bottom',
          gestureEnabled: true,
        }}
      />
      <ProfileCard userId={userId} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});
