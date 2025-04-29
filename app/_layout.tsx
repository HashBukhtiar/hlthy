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
      {/* Main tab screens with disabled swipe gestures */}
      <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
      <Stack.Screen name="post" options={{ gestureEnabled: false }} />
      <Stack.Screen name="ai" options={{ gestureEnabled: false }} />
      <Stack.Screen name="workouts" options={{ gestureEnabled: false }} />
      <Stack.Screen name="profile" options={{ gestureEnabled: false }} />
      
      {/* Screens with swipe back enabled */}
      <Stack.Screen name="pulse" options={{ gestureEnabled: true, animation: 'slide_from_right' }} />
      <Stack.Screen name="explore" options={{ gestureEnabled: true, animation: 'slide_from_right' }} />
      <Stack.Screen name="settings" options={{ gestureEnabled: true, animation: 'slide_from_right' }} />
      
      {/* Other screens */}
      <Stack.Screen name="signup" />
      <Stack.Screen name="select-archetype" />
      <Stack.Screen name="create-workout" />
      <Stack.Screen name="view-workout/[id]" options={{ animation: 'fade_from_bottom', gestureEnabled: true }} />
      <Stack.Screen name="view-post/[id]" options={{ animation: 'fade_from_bottom', gestureEnabled: true }} />
      <Stack.Screen name="workout-plan" />
      <Stack.Screen name="diet-plan" />
      <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
