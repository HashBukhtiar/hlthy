import 'react-native-get-random-values';
import React from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, StyleSheet, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from '@/context/AuthContext';
import { GlobalNetworkMonitor } from '@/components/GlobalNetworkMonitor';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <SafeAreaProvider>
          <View style={styles.container}>
            <GlobalNetworkMonitor />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: 'black' },
                animation: Platform.OS === 'android' ? 'fade' : 'none',
              }}
            >
            {/* Main tab screens - NativeTabs handles the tab bar */}
            <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
            
            {/* Screens with swipe back enabled */}
            <Stack.Screen name="pulse" options={{ gestureEnabled: true, animation: 'slide_from_right' }} />
            <Stack.Screen name="dms" options={{ gestureEnabled: true, animation: 'slide_from_right' }} />
            <Stack.Screen name="explore" options={{ gestureEnabled: true, animation: 'slide_from_right' }} />
            <Stack.Screen name="settings" options={{ gestureEnabled: true, animation: 'slide_from_right' }} />
            
            {/* AI Coach */}
            <Stack.Screen name="ai-chat" options={{ gestureEnabled: true, animation: 'slide_from_right' }} />

            {/* Other screens */}
            <Stack.Screen name="signup" />
            <Stack.Screen name="select-archetype" />
            <Stack.Screen name="create-workout" options={{ animation: 'slide_from_bottom', gestureEnabled: true }} />
            <Stack.Screen name="view-workout/[id]" options={{ animation: 'fade_from_bottom', gestureEnabled: true }} />
            <Stack.Screen name="view-post/[id]" options={{ animation: 'fade_from_bottom', gestureEnabled: true }} />
            <Stack.Screen name="view-milestone/[id]" options={{ animation: 'fade_from_bottom', gestureEnabled: true }} />
            <Stack.Screen name="view-profile-card/[userId]" options={{ animation: 'fade_from_bottom', gestureEnabled: true }} />
            <Stack.Screen name="workout-plan" />
            <Stack.Screen name="diet-plan" />
            <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
            
          </Stack>
        </View>
      </SafeAreaProvider>
    </AuthProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
});
