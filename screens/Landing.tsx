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
  Animated,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, TextInput } from 'react-native-paper';
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from '@/firebaseConfig';
import Aurora from '@/components/Aurora';
import { useScreenIsFocused } from '@/hooks/useScreenIsFocused';

export default function Landing() {
  const router = useRouter();
  const { width, height } = Dimensions.get('window');
  const isFocused = useScreenIsFocused();
  
  // State for showing login form
  const [showLogin, setShowLogin] = useState(false);
  
  // Login form state
  const [emailAddress, setEmailAddress] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isEmailValid, setIsEmailValid] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  
  // Animation values
  const slideAnim = useRef(new Animated.Value(0)).current;
  
  // Check if the email is valid
  const isValidEmail = (email: string): boolean => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleShowLogin = useCallback(() => {
    setShowLogin(true);
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [slideAnim]);

  const handleBackToLanding = useCallback(() => {
    // Dismiss keyboard first
    Keyboard.dismiss();
    
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setShowLogin(false);
      setErrorMessage('');
      setEmailAddress('');
      setPassword('');
      setIsEmailValid(true);
    });
  }, [slideAnim]);

  const handleLogin = async () => {
    try {
      // Clear previous errors
      setErrorMessage("");
      
      // Validate form data
      if (!isValidEmail(emailAddress)) {
        setErrorMessage("Please provide a valid email.");
        return;
      }
      
      if (!password) {
        setErrorMessage("Please enter your password.");
        return;
      }
      
      // Show loading indicator
      setLoading(true);
      
      // Sign in with Firebase Authentication
      await signInWithEmailAndPassword(auth, emailAddress, password);
      
      // Navigate to root where index.tsx will handle the redirect
      router.replace('/');
      
    } catch (error: any) {
      // Handle specific Firebase errors
      let errorMsg = "An error occurred during login, ensure your email and password.";
      
      console.log("Error code:", error.code);
      
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMsg = "Invalid email or password.";
      } else if (error.code === 'auth/invalid-email') {
        errorMsg = "Please enter a valid email address.";
      } else if (error.code === 'auth/too-many-requests') {
        errorMsg = "Too many failed login attempts. Please try again later.";
      } else if (error.code === 'auth/user-disabled') {
        errorMsg = "This account has been disabled.";
      }
      
      console.error("Login error:", error);
      setErrorMessage(errorMsg);
    } finally {
      setLoading(false);
    }
  };

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
        style={[styles.gradient, { height: height + 100 }]} // Extended height
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
                  >
                    <Text style={styles.buttonText}>Sign Up</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.button, styles.loginButton]}
                    onPress={handleShowLogin}
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
            {/* Back button - locked at top */}
            <TouchableOpacity 
              style={styles.backButtonTop}
              onPress={handleBackToLanding}
            >
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>

            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={styles.loginFullContainer}>
                  {loading && (
                    <View style={styles.loadingOverlay}>
                      <ActivityIndicator size="large" color="#FFFFFF" />
                      <Text style={styles.loadingText}>Logging in...</Text>
                    </View>
                  )}
                  
                  {/* Centered login content */}
                  <View style={styles.loginCenteredContent}>
                    <View style={styles.loginHeader}>
                      <Text style={styles.loginTitle}>Welcome Back</Text>
                      <Text style={styles.loginSubtitle}>Sign in to continue your fitness journey</Text>
                    </View>
                  
                    <View style={styles.formContainer}>
                      <TextInput
                        label="Email Address"
                        value={emailAddress}
                        onChangeText={setEmailAddress}
                        onBlur={() => setIsEmailValid(emailAddress === '' || isValidEmail(emailAddress))}
                        style={styles.modernInput}
                        mode="outlined"
                        theme={{ 
                          colors: { 
                            primary: '#FFFFFF', 
                            background: '#000000',
                            surface: '#000000',
                            onSurfaceVariant: '#AAAAAA',
                            outline: '#333333',
                            error: '#FF5555'
                          }
                        }}
                        autoCapitalize='none'
                        keyboardType="email-address"
                        textColor='#FFFFFF'
                        error={!isEmailValid}
                        outlineColor="#333333"
                        activeOutlineColor="#FFFFFF"
                      />
                      
                      <TextInput
                        label="Password"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        style={styles.modernInput}
                        mode="outlined"
                        theme={{ 
                          colors: { 
                            primary: '#FFFFFF', 
                            background: '#000000',
                            surface: '#000000',
                            onSurfaceVariant: '#AAAAAA',
                            outline: '#333333'
                          }
                        }}
                        textColor='#FFFFFF'
                        outlineColor="#333333"
                        activeOutlineColor="#FFFFFF"
                      />
                      
                      {errorMessage ? (
                        <Text style={styles.errorText}>{errorMessage}</Text>
                      ) : null}
                      
                      <TouchableOpacity
                        style={[
                          styles.modernLoginButton,
                          loading && styles.modernLoginButtonDisabled
                        ]}
                        onPress={handleLogin}
                        disabled={loading}
                      >
                        <Text style={styles.modernLoginButtonText}>
                          {loading ? 'Signing In...' : 'Sign In'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <View>
                      <View style={{ height: '25%' }} />
                    </View>
                  </View>
                  
                  {/* Footer buttons - locked at bottom */}
                  <View style={styles.loginFooterFixed}>
                    <TouchableOpacity onPress={() => router.push('/signup')}>
                      <Text style={styles.linkText}>Don't have an account? <Text style={styles.linkTextBold}>Sign Up</Text></Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.forgotPasswordButton}
                      onPress={() => router.push('/forgot-password')}
                    >
                      <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
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
    height: '55%', // Increased to make motion more visible
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
    justifyContent: 'center', // Center content vertically
    alignItems: 'center', // Center content horizontally
    zIndex: 10, // Higher z-index to ensure it's above all backgrounds
    backfaceVisibility: 'hidden', // Improves text rendering
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
  // Login form styles
  loginFullContainer: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  loginCenteredContent: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: 60, // Account for back button space
  },
  loginContentContainer: {
    flex: 1,
    padding: 24,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 30,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonTop: {
    position: 'absolute',
    top: 20,
    left: 20,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  loginHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  loginTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  loginSubtitle: {
    fontSize: 16,
    color: '#AAAAAA',
    textAlign: 'center',
    lineHeight: 22,
  },
  formContainer: {
    width: '100%',
    marginBottom: 30,
  },
  modernInput: {
    marginBottom: 20,
    backgroundColor: 'transparent',
  },
  errorText: {
    color: '#FF5555',
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 14,
  },
  modernLoginButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modernLoginButtonDisabled: {
    backgroundColor: '#666666',
    opacity: 0.6,
  },
  modernLoginButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  loginFooter: {
    alignItems: 'center',
    gap: 16,
  },
  loginFooterFixed: {
    alignItems: 'center',
    gap: 16,
    paddingBottom: 20,
  },
  linkText: {
    color: '#AAAAAA',
    fontSize: 14,
    textAlign: 'center',
  },
  linkTextBold: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  forgotPasswordButton: {
    padding: 8,
  },
  forgotPasswordText: {
    color: '#888888',
    fontSize: 14,
  },
  input: {
    marginBottom: 16,
    color: 'white',
  },
  loadingOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    borderRadius: 12,
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
});
