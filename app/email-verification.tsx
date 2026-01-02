import React, { useCallback, useEffect, useRef } from 'react';
import { SafeAreaView, Animated, Dimensions, StyleSheet } from 'react-native';
import EmailVerificationScreen from '@/components/EmailVerificationScreen';
import { useRouter } from 'expo-router';
import { auth } from '@/firebaseConfig';
import AuthBackground from '@/components/AuthBackground';

export default function EmailVerificationRoute() {
  const router = useRouter();
  const userEmail = auth.currentUser?.email || '';
  const { width } = Dimensions.get('window');

  // Slide animation to match Landing's transitions
  const slideX = useRef(new Animated.Value(width)).current;

  useEffect(() => {
    Animated.timing(slideX, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [slideX]);

  const handleVerificationComplete = useCallback(() => {
    router.replace({ pathname: '/profile' });
  }, [router]);

  const handleBackToSignUp = useCallback(() => {
    // animate out to the right then navigate back to landing
    Animated.timing(slideX, {
      toValue: width,
      duration: 200,
      useNativeDriver: true,
    }).start(() => router.replace({ pathname: '/landing' }));
  }, [router, slideX, width]);

  return (
    <AuthBackground>
      <SafeAreaView style={styles.safeArea}>
        <Animated.View style={[styles.container, { transform: [{ translateX: slideX }] }]}>
          <EmailVerificationScreen
            visible={true}
            userEmail={userEmail}
            onVerificationComplete={handleVerificationComplete}
            onBackToSignUp={handleBackToSignUp}
            emailSent={true}
          />
        </Animated.View>
      </SafeAreaView>
    </AuthBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
});
