import React, { useRef, useEffect, useState, useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated, Dimensions, ActivityIndicator } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BOTTOM_BAR_HEIGHT } from '@/styles/globalStyles';

function BottomButtons() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { width } = Dimensions.get('window');

  const { currentUser, userProfile, loading: authLoading, isFromSignup } = useAuth();
  
  // Create animated value for the slider indicator
  const indicatorPosition = useRef(new Animated.Value(0)).current;
  const buttonWidth = width / 5;
  
  // Keep track of current position
  const [currentPosition, setCurrentPosition] = useState(0);

  // Update the indicator position based on the current route
  useEffect(() => {
    let position = 0;
    
    if (pathname === '/' || pathname.includes('/(tabs)')) {
      position = 0; // Home
    } else if (pathname.includes('/dms')) {
      position = 1; // DMs
    } else if (pathname.includes('/post')) {
      position = 2; // Post
    } else if (pathname.includes('/workouts') || pathname.includes('/view-workout')) {
      position = 3; // Workouts
    } else if (pathname.includes('/profile')) {
      position = 4; // Profile
    }

    // Only animate if position changed
    if (position !== currentPosition) {
      Animated.spring(indicatorPosition, {
        toValue: position * buttonWidth,
        useNativeDriver: true,
        tension: 100,
        friction: 10
      }).start();
      setCurrentPosition(position);
    }
  }, [pathname, buttonWidth, currentPosition]);

  // Helper to determine if a route is active
  const isActive = useCallback((route: string) => {
    if (route === 'home' && (pathname === '/' || pathname.includes('/(tabs)') || pathname.includes('/pulse') || pathname.includes('/explore') || pathname.includes('/view-milestone'))) return true;
    if (route === 'dms' && pathname.includes('/dms')) return true;
    if (route === 'post' && pathname.includes('/post')) return true;
    if (route === 'workouts' && (pathname.includes('/workouts') || pathname.includes('/view-workout'))) return true;
    if (route === 'profile' && pathname.includes('/profile')) return true;
    return false;
  }, [pathname]);

  // Navigation handlers with useCallback to prevent re-renders
  const navigateHome = useCallback(() => {
    router.push('/');
  }, [router]);

  const navigateDMs = useCallback(() => {
    router.push('/dms');
  }, [router]);

  const navigatePost = useCallback(() => {
    router.push('/post');
  }, [router]);

  const navigateWorkouts = useCallback(() => {
    router.push('/workouts');
  }, [router]);

  const navigateProfile = useCallback(() => {
    router.push('/profile');
  }, [router]);

  // If the auth context says the user exists but hasn't verified their email,
  // the EmailVerificationGuard or verification UI will be shown — hide the bottom bar.
  // Check both Firebase Auth emailVerified AND Firestore userProfile emailVerified
  // (userProfile.emailVerified is set to true during dev bypass)
  // BUT: only hide the bar if the user is coming from signup (isFromSignup === true)
  // If they logged in (isFromSignup === false), show the bar even if unverified
  
  // During auth loading or waiting for profile, don't show navigation yet
  if (authLoading) {
    return (
      <View style={[styles.bottomBar, { height: BOTTOM_BAR_HEIGHT + insets.bottom, paddingBottom: insets.bottom }]}>
        {/* Empty placeholder to maintain layout */}
      </View>
    );
  }
  
  if (!authLoading && currentUser && userProfile && !(currentUser.emailVerified || userProfile.emailVerified) && isFromSignup) {
    // user not verified AND came from signup - hide the bar
    return null;
  }

  // Hide bottom bar on specific routes (after all hooks are called)
  if (
    pathname === '/create-workout' ||
    pathname?.includes('/settings') ||
    pathname?.includes('/view-post') ||
    pathname?.includes('/landing') ||
    pathname?.includes('/chat') ||
    pathname?.includes('/forgot-password') ||
    pathname?.includes('/view-milestone') ||
    pathname?.includes('/email-verification') ||
    pathname?.includes('/verify-email')
  ) {
    return null;
  }

  // show navigation

  return (
    <View 
      style={[
        styles.bottomBar, 
        { 
          paddingBottom: Math.max(insets.bottom, 10),
          height: BOTTOM_BAR_HEIGHT + insets.bottom
        }
      ]}
    >
      {/* Animated slider indicator */}
      <Animated.View 
        style={[
          styles.sliderIndicator,
          { transform: [{ translateX: indicatorPosition }] }
        ]}
      />

      <TouchableOpacity 
        style={styles.navButton} 
        onPress={navigateHome}
        activeOpacity={0.7}
      >
        <Ionicons 
          name="home" 
          size={28} 
          color={isActive('home') ? "white" : "grey"} 
        />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.navButton} 
        onPress={navigateDMs}
        activeOpacity={0.7}
      >
        <Ionicons 
          name="chatbubbles" 
          size={28} 
          color={isActive('dms') ? "white" : "grey"} 
        />
      </TouchableOpacity>
      
      <TouchableOpacity 
        onPress={navigatePost}
        style={styles.navButton}
        activeOpacity={0.7}
      >
        <Ionicons 
          name="add-circle" 
          size={40} 
          color={isActive('post') ? "white" : "grey"} 
        />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.navButton} 
        onPress={navigateWorkouts}
        activeOpacity={0.7}
      >
        <Ionicons 
          name="flame" 
          size={28} 
          color={isActive('workouts') ? "white" : "grey"} 
        />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.navButton} 
        onPress={navigateProfile}
        activeOpacity={0.7}
      >
        <Ionicons 
          name="person" 
          size={28} 
          color={isActive('profile') ? "white" : "grey"} 
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopColor: '#333',
    borderTopWidth: 1,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'black',
    paddingTop: 5,
    zIndex: 1000
  },
  navButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sliderIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: Dimensions.get('window').width / 5,
    height: 2,
    backgroundColor: 'white',
  },
});

export default React.memo(BottomButtons);