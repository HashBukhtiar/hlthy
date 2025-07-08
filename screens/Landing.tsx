import React, { useState, useRef, useCallback, useEffect } from 'react';
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
import SignUpForm from '@/components/SignUpForm';

export default function Landing() {
  const router = useRouter();
  const { width } = Dimensions.get('window');
  
  // State for current active screen
  const [currentScreen, setCurrentScreen] = useState<'landing' | 'signup' | 'login' | 'forgot'>('landing');
  
  // Animation values for each screen - only center instance needed, positioned dynamically
  const landingAnim = useRef(new Animated.Value(0)).current;
  const signUpAnim = useRef(new Animated.Value(width)).current;
  const loginAnim = useRef(new Animated.Value(width)).current;
  const forgotPasswordAnim = useRef(new Animated.Value(width)).current;

  // Initialize screen positions
  useEffect(() => {
    // Landing starts active (center), others start off-screen (right)
    landingAnim.setValue(0);
    signUpAnim.setValue(width);
    loginAnim.setValue(width);
    forgotPasswordAnim.setValue(width);
  }, []);

  // Helper function to animate screen transitions with position restoration
  const animateToScreen = useCallback((
    targetScreen: 'landing' | 'signup' | 'login' | 'forgot', 
    direction: 'forward' | 'backward' = 'forward'
  ) => {
    if (targetScreen === currentScreen) return;

    const currentAnim = currentScreen === 'landing' ? landingAnim :
                       currentScreen === 'signup' ? signUpAnim :
                       currentScreen === 'login' ? loginAnim : forgotPasswordAnim;
    
    const targetAnim = targetScreen === 'landing' ? landingAnim :
                      targetScreen === 'signup' ? signUpAnim :
                      targetScreen === 'login' ? loginAnim : forgotPasswordAnim;

    if (direction === 'forward') {
      // Forward navigation: target slides in from right, current slides out to left
      targetAnim.setValue(width);
      
      Animated.parallel([
        Animated.timing(currentAnim, {
          toValue: -width,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(targetAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        })
      ]).start(() => {
        // Reset the old current screen to be ready on the right side again
        setTimeout(() => {
          currentAnim.setValue(width);
        }, 50);
      });
    } else {
      // Backward navigation: target slides in from left, current slides out to right
      targetAnim.setValue(-width);
      
      Animated.parallel([
        Animated.timing(currentAnim, {
          toValue: width,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(targetAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        })
      ]).start(() => {
        // Reset the old current screen to be ready on the left side again
        setTimeout(() => {
          currentAnim.setValue(-width);
        }, 50);
      });
    }

    setCurrentScreen(targetScreen);
  }, [currentScreen, landingAnim, signUpAnim, loginAnim, forgotPasswordAnim, width]);

  const handleShowSignUp = useCallback(() => {
    animateToScreen('signup', 'forward');
  }, [animateToScreen]);

  const handleShowSignUpFromLogin = useCallback(() => {
    animateToScreen('signup', 'forward');
  }, [animateToScreen]);

  const handleShowSignUpFromForgotPassword = useCallback(() => {
    animateToScreen('signup', 'forward');
  }, [animateToScreen]);

  const handleShowLogin = useCallback(() => {
    animateToScreen('login', 'forward');
  }, [animateToScreen]);

  const handleBackToLanding = useCallback(() => {
    animateToScreen('landing', 'backward');
  }, [animateToScreen]);

  const handleShowForgotPassword = useCallback(() => {
    animateToScreen('forgot', 'forward');
  }, [animateToScreen]);

  const handleBackToLandingFromForgotPassword = useCallback(() => {
    animateToScreen('login', 'backward');
  }, [animateToScreen]);

  return (
    <AuthBackground>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.contentWrapper}>
          {/* Landing Content */}
          <Animated.View style={[
            styles.slideView, 
            { transform: [{ translateX: landingAnim }] }
          ]}>
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
                    onPress={handleShowSignUp}
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

          {/* Sign Up Content */}
          <Animated.View style={[
            styles.slideView, 
            { transform: [{ translateX: signUpAnim }] }
          ]}>
            <SignUpForm 
              visible={true} 
              onBackPress={handleBackToLanding}
              onShowLogin={handleShowLogin}
            />
          </Animated.View>

          {/* Login Content */}
          <Animated.View style={[
            styles.slideView, 
            { transform: [{ translateX: loginAnim }] }
          ]}>
            <LoginForm 
              visible={true} 
              onBackPress={handleBackToLanding} 
              onForgotPasswordPress={handleShowForgotPassword}
              onShowSignUp={handleShowSignUpFromLogin}
            />
          </Animated.View>

          {/* Forgot Password Content */}
          <Animated.View style={[
            styles.slideView, 
            { transform: [{ translateX: forgotPasswordAnim }] }
          ]}>
            <ForgotPasswordForm 
              visible={true} 
              onBackPress={handleBackToLandingFromForgotPassword}
              onBackToLogin={handleBackToLandingFromForgotPassword}
              onShowSignUp={handleShowSignUpFromForgotPassword}
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
