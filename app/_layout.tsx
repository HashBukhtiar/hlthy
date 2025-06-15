import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, StyleSheet } from 'react-native';
import BottomButtons from '@/components/BottomButtons';
import { usePathname } from 'expo-router';
import { AuthProvider } from '@/context/AuthContext';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const pathname = usePathname();
  const [showBottomBar, setShowBottomBar] = useState(true);

  // Routes that should not display the bottom navigation
  const hideBottomBarRoutes = [
    'settings', 
    'view-post',
    'signup',
    'select-archetype',
    'landing',
    'login',
    'chat',
    'forgot-password',
  ];

  // Check if we should hide the bottom bar based on current route
  useEffect(() => {
    if (!pathname) {
      setShowBottomBar(true);
      return;
    }

    // Check if current path includes any of the routes where we should hide the bottom bar
    const shouldHide = hideBottomBarRoutes.some(route => pathname.includes(route));
    setShowBottomBar(!shouldHide);
  }, [pathname]);

  return (
    <AuthProvider>
      <SafeAreaProvider>
        <View style={styles.container}>
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
            <Stack.Screen name="dms" options={{ gestureEnabled: false }} />
            <Stack.Screen name="workouts" options={{ gestureEnabled: false }} />
            <Stack.Screen name="profile" options={{ gestureEnabled: false }} />
            
            {/* Screens with swipe back enabled */}
            <Stack.Screen name="pulse" options={{ gestureEnabled: true, animation: 'slide_from_right' }} />
            <Stack.Screen name="explore" options={{ gestureEnabled: true, animation: 'slide_from_right' }} />
            <Stack.Screen name="settings" options={{ gestureEnabled: true, animation: 'slide_from_right' }} />
            
            {/* Other screens */}
            <Stack.Screen name="signup" />
            <Stack.Screen name="select-archetype" />
            <Stack.Screen name="create-workout" options={{ animation: 'slide_from_bottom', gestureEnabled: true }} />
            <Stack.Screen name="view-workout/[id]" options={{ animation: 'fade_from_bottom', gestureEnabled: true }} />
            <Stack.Screen name="view-post/[id]" options={{ animation: 'fade_from_bottom', gestureEnabled: true }} />
            <Stack.Screen name="view-milestone/[id]" options={{ animation: 'fade_from_bottom', gestureEnabled: true }} />
            <Stack.Screen name="workout-plan" />
            <Stack.Screen name="diet-plan" />
            <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
          </Stack>
          
          {/* Bottom navigation that persists across route changes but hides on specific screens */}
          {showBottomBar && <BottomButtons />}
        </View>
      </SafeAreaProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
});
