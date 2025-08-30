import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  Text, 
  TouchableOpacity,
  Dimensions,
  TouchableWithoutFeedback,
  Keyboard,
  Animated,
  ScrollView,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TextInput } from 'react-native-paper';
import CustomSpinner from '@/components/CustomSpinner';

interface ForgotPasswordFormProps {
  visible: boolean;
  onBackPress: () => void;
  onBackToLogin?: () => void;
  onShowSignUp?: () => void;
}

export default function ForgotPasswordForm({ visible, onBackPress, onBackToLogin, onShowSignUp }: ForgotPasswordFormProps) {
  const router = useRouter();
  
  const [emailAddress, setEmailAddress] = useState<string>('');
  const [isEmailValid, setIsEmailValid] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [emailFocused, setEmailFocused] = useState<boolean>(false);
  const [isResending, setIsResending] = useState<boolean>(false);
  const [resendCooldown, setResendCooldown] = useState<number>(0);

  const emailShakeAnim = React.useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(0)).current;
  const loaderFadeAnim = useRef(new Animated.Value(0)).current;

  // Check if the email is valid
  const isValidEmail = (email: string): boolean => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const triggerEmailShake = useCallback(() => {
    emailShakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(emailShakeAnim, { toValue: 1, duration: 50, useNativeDriver: true }),
      Animated.timing(emailShakeAnim, { toValue: -1, duration: 50, useNativeDriver: true }),
      Animated.timing(emailShakeAnim, { toValue: 1, duration: 50, useNativeDriver: true }),
      Animated.timing(emailShakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [emailShakeAnim]);

  const handleBackToLanding = useCallback(() => {
    // Dismiss keyboard first
    Keyboard.dismiss();
    
    // Reset form state
    setErrorMessage('');
    setEmailAddress('');
    setIsEmailValid(true);
    setEmailFocused(false);
    setSubmitted(false);
    setSuccess(false);
    
    // Use onBackToLogin if available, otherwise onBackPress
    if (onBackToLogin) {
      onBackToLogin();
    } else {
      onBackPress();
    }
  }, [onBackPress, onBackToLogin]);

  const handleEmailChange = (text: string) => {
    setEmailAddress(text);
    if (submitted) {
      setIsEmailValid(text === '' || isValidEmail(text));
      if (text !== '' && !isValidEmail(text)) {
        setErrorMessage('Please provide a valid email address.');
      } else {
        setErrorMessage('');
      }
    }
  };

  const handleSubmit = async () => {
    // Dismiss keyboard first
    Keyboard.dismiss();
    // Clear previous errors
    setErrorMessage("");
    setSubmitted(true);
    // Require non-empty and valid email
    if (!emailAddress.trim()) {
      setErrorMessage("Please enter your email address.");
      setIsEmailValid(false);
      triggerEmailShake();
      return;
    }
    if (!isValidEmail(emailAddress)) {
      setErrorMessage("Please provide a valid email address.");
      setIsEmailValid(false);
      triggerEmailShake();
      return;
    }
    setIsEmailValid(true);
    // Show loading indicator
    setLoading(true);
    let emailExists = false;
    let dummyUserCreated = false;
    let dummyUserDeleted = false;
    let randomPassword = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36) + Date.now();
    try {
      // Try to sign in with dummy password to check if user exists
      const { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } = await import('firebase/auth');
      const authInstance = getAuth();
      try {
        await signInWithEmailAndPassword(authInstance, emailAddress, randomPassword);
        // Should not succeed
        console.log('[ForgotPassword] Unexpected: dummy login succeeded for', emailAddress);
      } catch (dummyErr: any) {
        if (dummyErr.code === 'auth/user-not-found') {
          emailExists = false;
          setErrorMessage('User not found.');
          setIsEmailValid(false);
          triggerEmailShake();
          setLoading(false);
          return;
        } else if (dummyErr.code === 'auth/wrong-password' || dummyErr.code === 'auth/email-already-in-use') {
          emailExists = true;
        } else if (dummyErr.code === 'auth/invalid-email') {
          setErrorMessage('Please provide a valid email address.');
          setIsEmailValid(false);
          triggerEmailShake();
          setLoading(false);
          return;
        }
      }
      // Try to create dummy account to check existence (like SignUpStep1)
      try {
        const userCredential = await createUserWithEmailAndPassword(authInstance, emailAddress, randomPassword);
        dummyUserCreated = true;
        if (userCredential && authInstance.currentUser) {
          try {
            await authInstance.currentUser.delete();
            dummyUserDeleted = true;
            console.log('[ForgotPassword] Dummy account created and deleted for', emailAddress);
          } catch (deleteErr) {
            console.warn('[ForgotPassword] Failed to delete dummy account for', emailAddress, deleteErr);
          }
        }
        if (dummyUserCreated) {
          setErrorMessage('User not found.');
          setIsEmailValid(false);
          triggerEmailShake();
          setLoading(false);
          return;
        }
      } catch (err: any) {
        if (err.code === 'auth/email-already-in-use') {
          emailExists = true;
        } else if (err.code === 'auth/invalid-email') {
          setErrorMessage('Please provide a valid email address.');
          setIsEmailValid(false);
          triggerEmailShake();
          setLoading(false);
          return;
        } else {
          console.warn('[ForgotPassword] Error during dummy account creation for', emailAddress, err);
        }
      }
      // If email exists, proceed with sending reset link (simulate API call)
      if (emailExists) {
  await new Promise(resolve => setTimeout(resolve, 2000));
  setSuccess(true);
      }
    } catch (error) {
      setErrorMessage("An error occurred. Please try again later.");
      setIsEmailValid(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // simple cooldown timer for resend button used in success UI
    if (resendCooldown > 0) {
      const t = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(t);
    }

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
            <Text style={styles.loadingText}>Sending link...</Text>
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
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <Animated.View style={[styles.forgotPasswordFullContainer, { transform: [{ translateY: contentTranslateY }] }]}> 
            {success ? (
              // Success State (EmailVerification-style UI)
              <View style={styles.forgotPasswordCenteredContent}>
                <View style={styles.emailIconContainer}>
                  <Ionicons name="mail" size={44} color="#FFFFFF" />
                </View>
                <Text style={styles.successTitle}>Check Your Email</Text>
                <Text style={styles.successMessage}>
                  {`We've sent a password reset link to\n`}
                  <Text style={styles.emailText}>{emailAddress}</Text>
                </Text>
                <Text style={styles.instructionText}>
                  Follow the instructions in the email to reset your password.
                </Text>

                <View style={styles.buttonContainer}> 
                  <TouchableOpacity
                    style={[styles.secondaryButton, (isResending || resendCooldown > 0) && styles.disabledButton]}
                    onPress={async () => {
                      if (isResending || resendCooldown > 0) return;
                      setIsResending(true);
                      try {
                        // Simulate resend
                        await new Promise(r => setTimeout(r, 1200));
                        setResendCooldown(60);
                      } finally {
                        setIsResending(false);
                      }
                    }}
                    activeOpacity={0.8}
                    disabled={isResending || resendCooldown > 0}
                  >
                    <View style={styles.buttonIconContainer}>
                      {isResending ? <CustomSpinner size={16} /> : <Ionicons name="send" size={16} color="#FFFFFF" />}
                    </View>
                    <Text style={styles.secondaryButtonText}>
                      {isResending ? 'Sending...' : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Email'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              // Form State
              <View style={styles.forgotPasswordCenteredContent}>
                <View style={styles.forgotPasswordHeader}>
                  <Text style={styles.forgotPasswordTitle}>Forgot Password</Text>
                  <Text style={styles.forgotPasswordSubtitle}>Enter your email address to reset password</Text>
                </View>
                <View style={styles.formContainer}>
                  <Animated.View
                    style={{
                      transform: [
                        {
                          translateX: submitted && !isEmailValid ? emailShakeAnim.interpolate({ inputRange: [-1, 1], outputRange: [-5, 5] }) : 0,
                        },
                      ],
                    }}
                  >
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
                            setErrorMessage('Please provide a valid email address.');
                          } else {
                            setErrorMessage('');
                          }
                        }
                      }}
                      style={
                        [
                          (emailAddress || emailFocused) ? styles.modernInput : styles.modernInputCompact, 
                          submitted && !isEmailValid && styles.modernInputError
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
                      error={submitted && !isEmailValid}
                      underlineColor={submitted && !isEmailValid ? "#FF5555" : "rgba(255, 255, 255, 0.3)"}
                      activeUnderlineColor={submitted && !isEmailValid ? "#FF5555" : "#FFFFFF"}
                    />
                  </Animated.View>
                  <TouchableOpacity
                    style={[
                      styles.modernSubmitButton,
                      loading && styles.modernSubmitButtonDisabled
                    ]}
                    onPress={handleSubmit}
                    disabled={loading}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.modernSubmitButtonText}>
                      {loading ? 'Sending...' : 'Send Reset Link'}
                    </Text>
                  </TouchableOpacity>
                  <View style={styles.errorContainer}>
                    <Text style={[styles.errorText, { opacity: errorMessage ? 1 : 0 }]}>
                      {errorMessage || ' '}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </Animated.View>
        </TouchableWithoutFeedback>
      </ScrollView>
      {/* Footer buttons - locked at bottom */}
      <View style={styles.forgotPasswordFooterFixed}>
        <TouchableOpacity onPress={onShowSignUp || (() => router.push('/landing'))} activeOpacity={0.7}>
          <Text style={styles.linkText}>Don't have an account? <Text style={styles.linkTextBold}>Sign Up</Text></Text>
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
  forgotPasswordFullContainer: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  forgotPasswordCenteredContent: {
    flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  paddingTop: 40,
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
  forgotPasswordHeader: {
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 40,
  },
  forgotPasswordTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  forgotPasswordSubtitle: {
    fontSize: 16,
    color: '#AAAAAA',
    textAlign: 'center',
    lineHeight: 22,
  },
  successHeader: {
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 40,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  instructionText: {
    fontSize: 14,
    color: '#AAAAAA',
    textAlign: 'center',
    lineHeight: 20,
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
    height: 65,
  },
  modernInputCompact: {
    marginTop: 20,
    marginBottom: 10,
    backgroundColor: 'transparent',
    marginHorizontal: 5,
    paddingHorizontal: 0,
    height: 45,
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
  modernSubmitButton: {
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
  modernSubmitButtonDisabled: {
    backgroundColor: '#666666',
    opacity: 0.6,
  },
  modernSubmitButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  forgotPasswordFooterFixed: {
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
  // EmailVerification-like styles used in success UI
  emailIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  emailText: {
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
    marginTop: 20,
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 25,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    overflow: 'hidden',
    position: 'relative',
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonIconContainer: {
    position: 'relative',
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
});
