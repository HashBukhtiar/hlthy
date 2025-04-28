import React from 'react';
import { Stack } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: 'black' },
        animation: 'none',
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="select-archetype" />
      <Stack.Screen name="post" />
      <Stack.Screen name="ai" />
      <Stack.Screen name="workouts" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="pulse" />
      <Stack.Screen name="explore" />
      <Stack.Screen name="create-workout" />
      <Stack.Screen name="view-workout" />
      <Stack.Screen name="view-post" />
      <Stack.Screen name="workout-plan" />
      <Stack.Screen name="diet-plan" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
