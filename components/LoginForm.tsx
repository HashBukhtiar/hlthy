import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  Text, 
  TouchableOpacity,
  Dimensions,
  Animated,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView
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
  const [loading, setLoading] = useState<boolean>(true);
  const [emailFocused, setEmailFocused] = useState<boolean>(false);
  const [passwordFocused, setPasswordFocused] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [emailError, setEmailError] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string>('');
  
  // Animation values
  const slideAnim = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(0)).current;
  const loaderFadeAnim = useRef(new Animated.Value(0)).current;
  
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

  const handleEmailChange = (text: string) => {
    setEmailAddress(text);
    // Validate email format on every keystroke
    if (text && !isValidEmail(text)) {
      setEmailError('Please provide a valid email.');
      setIsEmailValid(false);
    } else {
      setEmailError('');
      setIsEmailValid(true);
    }
    // Do not check if email exists in DB here
    if (submitted) {
      setErrorMessage('');
    }
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (submitted) {
      if (!text) {
        setErrorMessage('Please enter your password.');
      } else {
        setErrorMessage('');
      }
    }
  };

  const handleLogin = async () => {
    setSubmitted(true);
    Keyboard.dismiss();
    setErrorMessage("");
    setEmailError('');
    setPasswordError('');
    let valid = true;
    // Only check format here, DB check happens in Firebase sign-in
    if (!isValidEmail(emailAddress)) {
      setEmailError("Please provide a valid email.");
      setIsEmailValid(false);
      valid = false;
    } else {
      setIsEmailValid(true);
    }
    if (!password) {
      setPasswordError("Please enter your password.");
      valid = false;
    }
    if (!valid) return;
    setLoading(true);
    try {
      // Sign in with Firebase Authentication
      await signInWithEmailAndPassword(auth, emailAddress, password);
      router.replace('/');
    } catch (error: any) {
      // Handle specific Firebase errors
      let errorMsg = "Incorrect credentials. Please try again.";
      setIsEmailValid(true);
      if (error.code === 'auth/user-not-found') {
        errorMsg = "User not found.";
        setEmailError(errorMsg);
        setIsEmailValid(false);
        setPasswordError('');
      } else if (error.code === 'auth/wrong-password') {
        errorMsg = "Incorrect password.";
        setPasswordError(errorMsg);
        setEmailError('');
      } else if (error.code === 'auth/invalid-email') {
        errorMsg = "Please enter a valid email address.";
        setEmailError(errorMsg);
        setIsEmailValid(false);
        setPasswordError('');
      } else if (error.code === 'auth/too-many-requests') {
        errorMsg = "Too many failed login attempts. Please try again later.";
        setEmailError('');
        setPasswordError('');
      } else if (error.code === 'auth/user-disabled') {
        errorMsg = "This account has been disabled.";
        setEmailError('');
        setPasswordError('');
      } else {
        setEmailError('');
        setPasswordError('');
      }
      setErrorMessage(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        Animated.timing(contentTranslateY, {
          toValue: -60, // Move up by 60px (adjust as needed)
          duration: 250,
          useNativeDriver: true,
        }).start();
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        Animated.timing(contentTranslateY, {
          toValue: 0,
          duration: 350, // Slightly longer for graceful return
          useNativeDriver: true,
        }).start();
      }
    );
    return () => {
      keyboardDidHideListener?.remove();
      keyboardDidShowListener?.remove();
    };
  }, [contentTranslateY]);

  useEffect(() => {
    if (loading) {
      Animated.timing(loaderFadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(loaderFadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [loading, loaderFadeAnim]);

  // Helper to determine which error to show
  const getActiveError = () => {
    if (emailError) return emailError;
    if (passwordError) return passwordError;
    if (errorMessage) return errorMessage;
    return '';
  };
  const showEmailError = !!emailError;
  const showPasswordError = !emailError && !!passwordError;

  if (!visible) return null;

  return (
    <View style={styles.slideView}>
      {/* Block all interactions when loading */}
      {loading && (
        <View style={styles.loadingBlocker} pointerEvents="auto" />
      )}
      {/* Loading overlay - animated fade-in */}
      <Animated.View
        pointerEvents={loading ? "auto" : "none"}
        style={[styles.loadingOverlay, { opacity: loaderFadeAnim }]}
      >
        {loading && (
          <>
            <CustomSpinner size={80} />
            <Text style={styles.loadingText}>Signing in...</Text>
          </>
        )}
      </Animated.View>
      {/* Back button */}
      <TouchableOpacity 
        style={styles.backButtonTop}
        onPress={handleBackToLanding}
        activeOpacity={0.7}
        disabled={loading}
      >
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={false}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} disabled={loading}>
          <Animated.View style={[styles.loginFullContainer, { transform: [{ translateY: contentTranslateY }] }]}> 
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
                  onChangeText={handleEmailChange}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => {
                    setEmailFocused(false);
                    if (submitted) {
                      setIsEmailValid(emailAddress === '' || isValidEmail(emailAddress));
                      if (emailAddress !== '' && !isValidEmail(emailAddress)) {
                        setEmailError('Please provide a valid email.');
                        setPasswordError('');
                      } else {
                        setEmailError('');
                      }
                    }
                  }}
                  style={
                    [
                      (emailAddress || emailFocused) ? styles.modernInput : styles.modernInputCompact, 
                      (showEmailError && submitted) && styles.modernInputError
                    ]
                  }
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
                  error={showEmailError && submitted}
                  underlineColor={showEmailError && submitted ? "#FF5555" : "rgba(255, 255, 255, 0.3)"}
                  activeUnderlineColor={showEmailError && submitted ? "#FF5555" : "#FFFFFF"}
                  editable={!loading}
                />
                <TextInput
                  label="Password"
                  value={password}
                  onChangeText={handlePasswordChange}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  secureTextEntry
                  style={[
                    (password || passwordFocused) ? styles.modernInput : styles.modernInputCompact,
                    (!password && submitted) && styles.modernInputError,
                  ]}
                  contentStyle={(password || passwordFocused) ? styles.inputContentStyle : styles.inputContentStyleCompact}
                  dense={!password && !passwordFocused}
                  mode="flat"
                  theme={{ 
                    colors: { 
                      primary: '#FFFFFF', 
                      background: 'transparent',
                      surface: 'transparent',
                      onSurfaceVariant: '#AAAAAA',
                      outline: 'transparent',
                      error: '#FF5555',
                    }
                  }}
                  textColor="#FFFFFF"
                  error={!password && submitted}
                  underlineColor={!password && submitted ? '#FF5555' : 'rgba(255, 255, 255, 0.3)'}
                  activeUnderlineColor={!password && submitted ? '#FF5555' : '#FFFFFF'}
                  editable={!loading}
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
                  <Text style={[styles.errorText, { opacity: getActiveError() ? 1 : 0 }]}> 
                    {getActiveError() || ' '}
                  </Text>
                </View>
              </View>
            </View>
          </Animated.View>
        </TouchableWithoutFeedback>
      </ScrollView>
      {/* Footer buttons - locked at bottom */}
      <View style={styles.loginFooterFixed} pointerEvents={loading ? "none" : "auto"}>
        <TouchableOpacity onPress={onShowSignUp || (() => router.push('/landing'))} activeOpacity={0.7} disabled={loading}>
          <Text style={styles.linkText}>Don't have an account? <Text style={styles.linkTextBold}>Sign Up</Text></Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.forgotPasswordButton}
          onPress={onForgotPasswordPress}
          activeOpacity={0.7}
          disabled={loading}
        >
          <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
        </TouchableOpacity>
      </View>
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
    marginBottom: 30,
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
    top: '50%',
    left: '50%',
    width: 180,
    height: 180,
    marginLeft: -90, // half of width
    marginTop: -90, // half of height
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 24,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  // Add scrollContent style for consistent padding
  scrollContent: {
    flexGrow: 1,
    // paddingHorizontal: 20,
  },
  loadingBlocker: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 999,
  },
});
