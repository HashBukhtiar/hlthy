import React, { useState, useRef } from 'react';
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
  KeyboardAvoidingView,
  ScrollView,
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
import SimplifiedAurora from '@/components/SimplifiedAurora';
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

  const handleShowLogin = () => {
    setShowLogin(true);
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const handleBackToLanding = () => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setShowLogin(false);
      setErrorMessage('');
      setEmailAddress('');
      setPassword('');
    });
  };

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
          <SimplifiedAurora 
            colorStops={['#FF2D55', '#a434eb', '#5227FF']}
            speed={0.4}
            intensity={1.2}
          />
        )}
      </View>
      
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.contentWrapper}>
          {/* Landing Content */}
          <Animated.View style={[
            styles.slideView,
            {
              transform: [{
                translateX: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -width]
                })
              }]
            }
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
          <Animated.View style={[
            styles.slideView,
            {
              transform: [{
                translateX: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [width, 0]
                })
              }]
            }
          ]}>
            <KeyboardAvoidingView 
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={styles.loginContainer}
            >
              <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <ScrollView 
                  contentContainerStyle={styles.loginScrollContainer}
                  keyboardShouldPersistTaps="handled"
                >
                  {loading && (
                    <View style={styles.loadingOverlay}>
                      <ActivityIndicator size="large" color="#FFFFFF" />
                      <Text style={styles.loadingText}>Logging in...</Text>
                    </View>
                  )}

                  <View style={styles.loginLogoContainer}>
                    <Image
                      style={styles.loginLogo}
                      source={require('@/assets/images/logo-dark.png')}
                    />
                  </View>
                  
                  <View style={styles.loginContentContainer}>
                    <TouchableOpacity 
                      style={styles.backButton}
                      onPress={handleBackToLanding}
                    >
                      <Text style={styles.backButtonText}>← Back</Text>
                    </TouchableOpacity>

                    <Text style={[styles.header, {fontWeight: 'bold'}]}>Login</Text>
                    
                    <TextInput
                      label="Email Address"
                      value={emailAddress}
                      onChangeText={setEmailAddress}
                      onBlur={() => setIsEmailValid(isValidEmail(emailAddress))}
                      style={styles.input}
                      mode="outlined"
                      theme={{ 
                        colors: { 
                          primary: 'white', 
                          background: '#222222',
                          onSurfaceVariant: 'white',
                          outline: 'white'
                        }
                      }}
                      autoCapitalize='none'
                      keyboardType="email-address"
                      textColor='white'
                      error={!isEmailValid}
                    />
                    
                    <TextInput
                      label="Password"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                      style={styles.input}
                      mode="outlined"
                      theme={{ 
                        colors: { 
                          primary: 'white', 
                          background: '#222222',
                          onSurfaceVariant: 'white',
                          outline: 'white'
                        }
                      }}
                      textColor='white'
                    />
                    
                    <Button 
                      mode="contained" 
                      onPress={handleLogin}
                      style={[styles.loginSubmitButton, { backgroundColor: '#FFFFFF' }]} 
                      labelStyle={{ color: '#000' }}>
                      Log In
                    </Button>
                    
                    <Text style={{ color: '#FF5555', textAlign: 'center', marginTop: 15, marginBottom: 10 }}>{errorMessage}</Text>
                    
                    <Button 
                      mode="text" 
                      onPress={() => router.push('/signup')}
                      style={[styles.loginSubmitButton]} 
                      labelStyle={{ color: '#FFFFFF' }}>
                      Don't have an account? Sign Up
                    </Button>
                    
                    <Button 
                      mode="text" 
                      onPress={() => router.push('/forgot-password')}
                      style={[styles.loginSubmitButton]} 
                      labelStyle={{ color: '#AAAAAA' }}>
                      Forgot Password?
                    </Button>
                  </View>
                </ScrollView>
              </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
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
    height: '60%',
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
  loginContainer: {
    flex: 1,
  },
  loginScrollContainer: {
    flexGrow: 1,
  },
  loginLogoContainer: {
    paddingTop: 20,
    alignItems: 'center',
  },
  loginLogo: {
    width: 50,
    height: 50,
  },
  loginContentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 20,
    padding: 5,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  header: {
    fontSize: 24,
    color: 'white',
    marginBottom: 20,
    textAlign: 'center',
    marginTop: 10,
  },
  input: {
    marginBottom: 16,
    color: 'white',
  },
  loginSubmitButton: {
    marginTop: 16,
  },
  loadingOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: {
    color: 'white',
    marginTop: 10,
  },
});
