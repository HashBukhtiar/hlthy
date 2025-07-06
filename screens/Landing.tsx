import React, { useState, useRef, useCallback, useMemo } from 'react';
import { 
  View, 
  StyleSheet, 
  Text, 
  Image, 
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  Animated
} from 'react-native';
import { useRouter } from 'expo-router';
import AuthBackground from '@/components/AuthBackground';
import LoginForm from '@/components/LoginForm';
import ForgotPasswordForm from '@/components/ForgotPasswordForm';

export default function Landing() {
  const router = useRouter();
  const { width } = Dimensions.get('window');
  
  // State for showing forms
  const [showLogin, setShowLogin] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  
  // Single animation value for all screens
  const slideAnim = useRef(new Animated.Value(0)).current;

  const handleShowLogin = useCallback(() => {
    setShowLogin(true);
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [slideAnim]);

  const handleBackToLanding = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setShowLogin(false);
      setShowForgotPassword(false);
    });
  }, [slideAnim]);

  const handleShowForgotPassword = useCallback(() => {
    setShowForgotPassword(true);
    Animated.timing(slideAnim, {
      toValue: 2, // Move to the third screen position
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [slideAnim]);

  const handleBackToLandingFromForgotPassword = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: 1, // Back to login position
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setShowForgotPassword(false);
    });
  }, [slideAnim]);

  // Memoize interpolation values for better performance
  const landingTransform = useMemo(() => ({
    transform: [{
      translateX: slideAnim.interpolate({
        inputRange: [0, 1, 2],
        outputRange: [0, -width, -width * 2],
        extrapolate: 'clamp'
      })
    }]
  }), [slideAnim, width]);

  const loginTransform = useMemo(() => ({
    transform: [{
      translateX: slideAnim.interpolate({
        inputRange: [0, 1, 2],
        outputRange: [width, 0, -width],
        extrapolate: 'clamp'
      })
    }]
  }), [slideAnim, width]);

  const forgotPasswordTransform = useMemo(() => ({
    transform: [{
      translateX: slideAnim.interpolate({
        inputRange: [0, 1, 2],
        outputRange: [width * 2, width, 0],
        extrapolate: 'clamp'
      })
    }]
  }), [slideAnim, width]);

  return (
    <AuthBackground>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.contentWrapper}>
          {/* Landing Content */}
          <Animated.View style={[styles.slideView, landingTransform]}>
            <View style={styles.content}>
              <View style={styles.centeredContent}>
                <View style={styles.logoContainer}>
                  <Image
                    style={styles.logo}
                    source={require('@/assets/images/logo-dark.png')}
                  />
                  <Text style={styles.appName}>HLTHY</Text>
                </View>

                <View style={styles.taglineContainer}>
                  <Text style={styles.tagline}>Smarter Fitness Starts Here</Text>
                  <Text style={styles.subtagline}>Stay motivated, track progress, and grow together with AI-powered support</Text>
                </View>

                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={[styles.button, styles.signUpButton]}
                    onPress={() => router.push('/signup')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.buttonText}>Sign Up</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.button, styles.loginButton]}
                    onPress={handleShowLogin}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.buttonText, styles.loginButtonText]}>Login</Text>
                  </TouchableOpacity>
                </View>

                <View>
                  <View style={{ height: '15%' }} />
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Login Content */}
          <Animated.View style={[styles.slideView, loginTransform]}>
            <LoginForm 
              visible={showLogin} 
              onBackPress={handleBackToLanding} 
              onForgotPasswordPress={handleShowForgotPassword}
            />
          </Animated.View>

          {/* Forgot Password Content */}
          <Animated.View style={[styles.slideView, forgotPasswordTransform]}>
            <ForgotPasswordForm 
              visible={showForgotPassword} 
              onBackPress={handleBackToLandingFromForgotPassword}
              onBackToLogin={handleBackToLandingFromForgotPassword}
            />
          </Animated.View>
        </View>
      </SafeAreaView>
    </AuthBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  contentWrapper: {
    flex: 1,
    position: 'relative',
  },
  slideView: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: Dimensions.get('window').width,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backfaceVisibility: 'hidden',
  },
  centeredContent: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 10,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  taglineContainer: {
    alignItems: 'center',
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  tagline: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtagline: {
    fontSize: 16,
    color: '#AAAAAA',
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    paddingHorizontal: 20,
  },
  button: {
    width: '100%',
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  signUpButton: {
    backgroundColor: '#FFFFFF',
  },
  loginButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
  },
  loginButtonText: {
    color: '#FFFFFF',
  },
});
