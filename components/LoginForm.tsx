import React, { useState, useRef, useCallback, useMemo } from 'react';
import { 
  View, 
  StyleSheet, 
  Text, 
  TouchableOpacity,
  Dimensions,
  Animated,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';
import { useRouter } from 'expo-router';
import { TextInput } from 'react-native-paper';
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from '@/firebaseConfig';
import CustomSpinner from '@/components/CustomSpinner';

interface LoginFormProps {
  visible: boolean;
  onBackPress: () => void;
  onForgotPasswordPress: () => void;
  onShowSignUp?: () => void;
}

export default function LoginForm({ visible, onBackPress, onForgotPasswordPress, onShowSignUp }: LoginFormProps) {
  const router = useRouter();
  const { width } = Dimensions.get('window');
  
  // Login form state
  const [emailAddress, setEmailAddress] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isEmailValid, setIsEmailValid] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [emailFocused, setEmailFocused] = useState<boolean>(false);
  const [passwordFocused, setPasswordFocused] = useState<boolean>(false);
  
  // Animation values
  const slideAnim = useRef(new Animated.Value(0)).current;
  
  // Check if the email is valid
  const isValidEmail = (email: string): boolean => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleBackToLanding = useCallback(() => {
    // Dismiss keyboard first
    Keyboard.dismiss();
    
    // Reset form state
    setErrorMessage('');
    setEmailAddress('');
    setPassword('');
    setIsEmailValid(true);
    setEmailFocused(false);
    setPasswordFocused(false);
    
    onBackPress();
  }, [onBackPress]);

  const handleLogin = async () => {
    try {
      // Dismiss keyboard first
      Keyboard.dismiss();
      
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
      let errorMsg = "Incorrect credentials. Please try again.";
      
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
      
    //   console.error("Login error:", error);
      setErrorMessage(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <View style={styles.slideView}>
      {/* Loading overlay - positioned at slideView level to cover entire screen */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <CustomSpinner size={80} />
          <Text style={styles.loadingText}>Logging in...</Text>
        </View>
      )}
      
      {/* Back button */}
      <TouchableOpacity 
        style={styles.backButtonTop}
        onPress={handleBackToLanding}
        activeOpacity={0.7}
      >
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity>

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.loginFullContainer}>
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
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => {
                    setEmailFocused(false);
                    setIsEmailValid(emailAddress === '' || isValidEmail(emailAddress));
                  }}
                  style={[
                    (emailAddress || emailFocused) ? styles.modernInput : styles.modernInputCompact, 
                    !isEmailValid && styles.modernInputError
                  ]}
                  contentStyle={(emailAddress || emailFocused) ? styles.inputContentStyle : styles.inputContentStyleCompact}
                  dense={!emailAddress && !emailFocused}
                  mode="flat"
                  theme={{ 
                    colors: { 
                      primary: '#FFFFFF', 
                      background: 'transparent',
                      surface: 'transparent',
                      onSurfaceVariant: '#AAAAAA',
                      outline: 'transparent',
                      error: '#FF5555'
                    }
                  }}
                  autoCapitalize='none'
                  keyboardType="email-address"
                  textColor='#FFFFFF'
                  error={!isEmailValid}
                  underlineColor={!isEmailValid ? "#FF5555" : "rgba(255, 255, 255, 0.3)"}
                  activeUnderlineColor={!isEmailValid ? "#FF5555" : "#FFFFFF"}
                />
                
                <TextInput
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  secureTextEntry
                  style={(password || passwordFocused) ? styles.modernInput : styles.modernInputCompact}
                  contentStyle={(password || passwordFocused) ? styles.inputContentStyle : styles.inputContentStyleCompact}
                  dense={!password && !passwordFocused}
                  mode="flat"
                  theme={{ 
                    colors: { 
                      primary: '#FFFFFF', 
                      background: 'transparent',
                      surface: 'transparent',
                      onSurfaceVariant: '#AAAAAA',
                      outline: 'transparent'
                    }
                  }}
                  textColor='#FFFFFF'
                  underlineColor="rgba(255, 255, 255, 0.3)"
                  activeUnderlineColor="#FFFFFF"
                />
                
                <TouchableOpacity
                  style={[
                    styles.modernLoginButton,
                    loading && styles.modernLoginButtonDisabled
                  ]}
                  onPress={handleLogin}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modernLoginButtonText}>
                    {loading ? 'Signing In...' : 'Sign In'}
                  </Text>
                </TouchableOpacity>
                
                <View style={styles.errorContainer}>
                  <Text style={[styles.errorText, { opacity: errorMessage ? 1 : 0 }]}>
                    {errorMessage || ' '}
                  </Text>
                </View>
              </View>

              <View>
                <View style={{ height: '25%' }} />
              </View>
            </View>
            
            {/* Footer buttons - locked at bottom */}
            <View style={styles.loginFooterFixed}>
              <TouchableOpacity onPress={onShowSignUp || (() => router.push('/landing'))} activeOpacity={0.7}>
                <Text style={styles.linkText}>Don't have an account? <Text style={styles.linkTextBold}>Sign Up</Text></Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.forgotPasswordButton}
                onPress={onForgotPasswordPress}
                activeOpacity={0.7}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
    </View>
  );
}

const styles = StyleSheet.create({
  slideView: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: Dimensions.get('window').width,
  },
  loginFullContainer: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  loginCenteredContent: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: 60,
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
    marginTop: 30,
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
    marginBottom: 10,
    backgroundColor: 'transparent',
    marginHorizontal: 5,
    paddingHorizontal: 0,
    height: 65, // Fixed height to prevent repositioning
  },
  modernInputCompact: {
    marginTop: 20,
    marginBottom: 10,
    backgroundColor: 'transparent',
    marginHorizontal: 5,
    paddingHorizontal: 0,
    height: 45, // Smaller height when unfocused and empty
  },
  inputContentStyle: {
    // nothing right now.
  },
  inputContentStyleCompact: {
    // paddingTop: 8, // Minimal padding when unfocused to keep label close to line
    // paddingBottom: 4,
  },
  modernInputError: {
    borderBottomColor: '#FF5555',
    borderBottomWidth: 2,
  },
  errorText: {
    color: '#FF5555',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14,
  },
  errorContainer: {
    minHeight: 44,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  modernLoginButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
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
  loadingOverlay: {
    position: 'absolute',
    top: -200, // Extend well beyond the top
    left: -200, // Extend well beyond the left
    right: -200, // Extend well beyond the right
    bottom: -200, // Extend well beyond the bottom
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 24,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
});
