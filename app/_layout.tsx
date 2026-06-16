import 'react-native-get-random-values';
import React from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from '@/context/AuthContext';
import { VideoMuteProvider } from '@/context/VideoMuteContext';
import { GlobalNetworkMonitor } from '@/components/GlobalNetworkMonitor';
import EmailVerificationGuard from '@/components/EmailVerificationGuard';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <VideoMuteProvider>
      <AuthProvider>
        <SafeAreaProvider>
          <GlobalNetworkMonitor />
          <EmailVerificationGuard>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: 'black' },
                animation: 'none',
              }}
            >
            {/* Main tab screens - NativeTabs handles the tab bar */}
            <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />

            {/* Screens with swipe back enabled */}
            <Stack.Screen name="pulse" options={{ gestureEnabled: true, animation: Platform.OS === 'android' ? 'none' : 'slide_from_right' }} />
            <Stack.Screen name="dms" options={{ gestureEnabled: true, animation: Platform.OS === 'android' ? 'none' : 'slide_from_right' }} />
            <Stack.Screen name="explore" options={{ gestureEnabled: true, animation: Platform.OS === 'android' ? 'none' : 'slide_from_right' }} />
            <Stack.Screen name="settings" options={{ gestureEnabled: true, animation: Platform.OS === 'android' ? 'none' : 'slide_from_right' }} />
            <Stack.Screen name="edit-profile" options={{ gestureEnabled: true, animation: Platform.OS === 'android' ? 'none' : 'slide_from_right' }} />
            <Stack.Screen name="settings-notifications" options={{ gestureEnabled: true, animation: Platform.OS === 'android' ? 'none' : 'slide_from_right' }} />
            <Stack.Screen name="edit-profile-social-links" options={{ gestureEnabled: true, animation: Platform.OS === 'android' ? 'none' : 'slide_from_right' }} />

            {/* Other screens */}
            <Stack.Screen name="signup" />
            <Stack.Screen name="select-archetype" />
            <Stack.Screen name="create-workout" options={{ animation: Platform.OS === 'android' ? 'none' : 'slide_from_bottom', gestureEnabled: true }} />
            <Stack.Screen name="view-workout/[id]" options={{ animation: Platform.OS === 'android' ? 'none' : 'fade_from_bottom', gestureEnabled: true }} />
            <Stack.Screen name="view-post/[id]" options={{ animation: Platform.OS === 'android' ? 'none' : 'fade_from_bottom', gestureEnabled: true }} />
            <Stack.Screen name="edit-post/[id]" options={{ gestureEnabled: true, animation: Platform.OS === 'android' ? 'none' : 'slide_from_right' }} />
            <Stack.Screen name="saved-posts" options={{ gestureEnabled: true, animation: Platform.OS === 'android' ? 'none' : 'slide_from_right' }} />
            <Stack.Screen name="view-milestone/[id]" options={{ animation: Platform.OS === 'android' ? 'none' : 'fade_from_bottom', gestureEnabled: true }} />
            <Stack.Screen name="view-profile-card/[userId]" options={{ animation: Platform.OS === 'android' ? 'none' : 'fade_from_bottom', gestureEnabled: true }} />
            <Stack.Screen name="view-links/[userId]" options={{ animation: Platform.OS === 'android' ? 'none' : 'slide_from_right', gestureEnabled: true }} />
            <Stack.Screen name="privacy-policy" options={{ gestureEnabled: true, animation: Platform.OS === 'android' ? 'none' : 'slide_from_right' }} />
            <Stack.Screen name="terms-of-service" options={{ gestureEnabled: true, animation: Platform.OS === 'android' ? 'none' : 'slide_from_right' }} />
            <Stack.Screen name="workout-plan" />
            <Stack.Screen name="diet-plan" />
            <Stack.Screen name="modal" options={{ presentation: 'modal' }} />

            </Stack>
          </EmailVerificationGuard>
        </SafeAreaProvider>
      </AuthProvider>
      </VideoMuteProvider>
    </GestureHandlerRootView>
  );
}

