import React, { useState, useRef, useCallback, useMemo } from 'react';
import { 
  View, 
  StyleSheet, 
  Text, 
  Image, 
  TouchableOpacity,
  Dimensions,
  StatusBar,
  SafeAreaView,
  Animated
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Aurora from '@/components/Aurora';
import LoginForm from '@/components/LoginForm';
import { useScreenIsFocused } from '@/hooks/useScreenIsFocused';

export default function Landing() {
  const router = useRouter();
  const { width, height } = Dimensions.get('window');
  const isFocused = useScreenIsFocused();
  
  // State for showing login form
  const [showLogin, setShowLogin] = useState(false);
  
  // Animation values
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
    });
  }, [slideAnim]);

  // Memoize interpolation values for better performance
  const landingTransform = useMemo(() => ({
    transform: [{
      translateX: slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -width],
        extrapolate: 'clamp'
      })
    }]
  }), [slideAnim, width]);

  const loginTransform = useMemo(() => ({
    transform: [{
      translateX: slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [width, 0],
        extrapolate: 'clamp'
      })
    }]
  }), [slideAnim, width]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Base background gradient - extending beyond safe area */}
      <LinearGradient
        colors={['#000000', '#121212']}
        style={[styles.gradient, { height: height + 100 }]}
      />
      
      <View style={styles.auroraContainer}>
        {isFocused && (
          <Aurora 
            colorStops={['#FF2D55', '#a434eb', '#5227FF']}
            speed={0.8}
            intensity={1.2}
          />
        )}
      </View>
      
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
            <LoginForm visible={showLogin} onBackPress={handleBackToLanding} />
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  auroraContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '55%',
    zIndex: 2,
  },
  safeArea: {
    flex: 1,
    zIndex: 10,
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
    zIndex: 10,
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
