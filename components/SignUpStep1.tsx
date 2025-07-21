import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  Text, 
  TouchableOpacity,
  Dimensions,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated
} from 'react-native';
import { TextInput } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import CustomSpinner from '@/components/CustomSpinner';

interface SignUpStep1Props {
  visible: boolean;
  onBackPress: () => void;
  onNext: (data: { firstName: string; lastName: string; email: string }) => void;
  onShowLogin?: () => void;
}

export default function SignUpStep1({ visible, onBackPress, onNext, onShowLogin }: SignUpStep1Props) {
  const { width, height } = Dimensions.get('window');
  
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [submitted, setSubmitted] = useState(false); // Track first submit
  const [loading, setLoading] = useState(false);

  // Focus states
  const [firstNameFocused, setFirstNameFocused] = useState<boolean>(false);
  const [lastNameFocused, setLastNameFocused] = useState<boolean>(false);
  const [emailFocused, setEmailFocused] = useState<boolean>(false);
  const [isEmailValid, setIsEmailValid] = useState<boolean>(true);
  
  // Animation for keyboard
  const contentPaddingAnim = useRef(new Animated.Value(80)).current;
  const spinnerFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        Animated.timing(contentPaddingAnim, {
          toValue: 20,
          duration: 250,
          useNativeDriver: false,
        }).start();
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        Animated.timing(contentPaddingAnim, {
          toValue: 80,
          duration: 250,
          useNativeDriver: false,
        }).start();
      }
    );

    return () => {
      keyboardDidHideListener?.remove();
      keyboardDidShowListener?.remove();
    };
  }, [contentPaddingAnim]);

  useEffect(() => {
    if (loading) {
      Animated.timing(spinnerFadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(spinnerFadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [loading, spinnerFadeAnim]);

  const validateEmail = (email: string): boolean => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  // Shake animations for each field
  const firstNameShakeAnim = useRef(new Animated.Value(0)).current;
  const lastNameShakeAnim = useRef(new Animated.Value(0)).current;
  const emailShakeAnim = useRef(new Animated.Value(0)).current;

  const triggerShake = useCallback((field: 'first' | 'last' | 'email') => {
    const anim = field === 'first' ? firstNameShakeAnim : field === 'last' ? lastNameShakeAnim : emailShakeAnim;
    anim.setValue(0);
    Animated.sequence([
      Animated.timing(anim, { toValue: 1, duration: 50, useNativeDriver: true }),
      Animated.timing(anim, { toValue: -1, duration: 50, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 1, duration: 50, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [firstNameShakeAnim, lastNameShakeAnim, emailShakeAnim]);

  const handleNext = useCallback(async () => {
    // Dismiss keyboard first
    Keyboard.dismiss();
    setSubmitted(true);
    setErrorMessage('');
    setLoading(true);
    const trimmedEmail = email.trim().toLowerCase();
    if (!firstName.trim()) {
      setErrorMessage('Please enter your first name');
      triggerShake('first');
      setLoading(false);
      return;
    }
    if (!lastName.trim()) {
      setErrorMessage('Please enter your last name');
      triggerShake('last');
      setLoading(false);
      return;
    }
    if (!trimmedEmail) {
      setErrorMessage('Please enter your email address');
      triggerShake('email');
      setLoading(false);
      return;
    }
    if (!validateEmail(trimmedEmail)) {
      setErrorMessage('Please provide a valid email.');
      setIsEmailValid(false);
      triggerShake('email');
      setLoading(false);
      return;
    }
    setIsEmailValid(true);
    const auth = getAuth();
    const randomPassword = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36) + Date.now();
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, randomPassword);
      // Unexpected: user did not exist, so we created a dummy account. Delete it immediately.
      if (userCredential && auth.currentUser) {
        try {
          await auth.currentUser.delete();
          setLoading(false);
          onNext({ firstName, lastName, email: trimmedEmail });
          return;
        } catch (deleteErr) {
          setLoading(false);
          setErrorMessage('Something went wrong. Please try again.');
          setIsEmailValid(false);
          triggerShake('email');
          console.warn('Failed to delete dummy account for', trimmedEmail, deleteErr);
          return;
        }
      }
    } catch (err: any) {
      setLoading(false);
      if (err.code === 'auth/email-already-in-use') {
        setErrorMessage('This email is already registered. Try signing in.');
        setIsEmailValid(false);
        triggerShake('email');
        return;
      } else if (err.code === 'auth/invalid-email') {
        setErrorMessage('Please provide a valid email address.');
        setIsEmailValid(false);
        triggerShake('email');
        return;
      } else {
        setErrorMessage('Error checking email. Please try again.');
        setIsEmailValid(false);
        triggerShake('email');
        return;
      }
    }
  }, [firstName, lastName, email, onNext, triggerShake]);

  const handleBackPress = useCallback(() => {
    Keyboard.dismiss();
    setErrorMessage('');
    setFirstName('');
    setLastName('');
    setEmail('');
    setIsEmailValid(true);
    onBackPress();
  }, [onBackPress]);

  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (submitted) {
      setIsEmailValid(text === '' || validateEmail(text));
    }
  };

  if (!visible) return null;

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={false}
        >
          {/* Back button - positioned absolutely like LoginForm */}
          <TouchableOpacity 
            style={styles.backButtonTop} 
            onPress={handleBackPress}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
          </View>

          {/* Content */}
          <Animated.View style={[styles.content, { paddingTop: contentPaddingAnim }]}>
            <Text style={styles.title}>Let's Get Started</Text>
            <Text style={styles.subtitle}>Tell us a bit about yourself</Text>

            {/* Form */}
            <View style={styles.form}>
              <View className="nameRow" style={styles.nameRow}>
                <View style={[styles.inputContainer, styles.nameInput]}>
                  <Animated.View
                    style={{
                      transform: [
                        {
                          translateX:
                            errorMessage === 'Please enter your first name'
                              ? firstNameShakeAnim.interpolate({ inputRange: [-1, 1], outputRange: [-5, 5] })
                              : 0,
                        },
                      ],
                    }}
                  >
                    <TextInput
                      label="First Name"
                      value={firstName}
                      onChangeText={setFirstName}
                      onFocus={() => setFirstNameFocused(true)}
                      onBlur={() => setFirstNameFocused(false)}
                      style={[
                        (firstName || firstNameFocused) ? styles.modernInput : styles.modernInputCompact,
                        submitted && !firstName.trim() && styles.modernInputError,
                      ]}
                      contentStyle={(firstName || firstNameFocused) ? styles.inputContentStyle : styles.inputContentStyleCompact}
                      dense={!firstName && !firstNameFocused}
                      mode="flat"
                      theme={{
                        colors: {
                          primary: '#FFFFFF',
                          background: 'transparent',
                          surface: 'transparent',
                          onSurfaceVariant: '#AAAAAA',
                          outline: 'transparent',
                          error: '#FF5555',
                        },
                      }}
                      textColor="#FFFFFF"
                      underlineColor={submitted && !firstName.trim() ? '#FF5555' : 'rgba(255, 255, 255, 0.3)'}
                      activeUnderlineColor={submitted && !firstName.trim() ? '#FF5555' : '#FFFFFF'}
                      autoCapitalize="words"
                    />
                  </Animated.View>
                </View>
                
                <View style={[styles.inputContainer, styles.nameInput]}>
                  <Animated.View
                    style={{
                      transform: [
                        {
                          translateX:
                            errorMessage === 'Please enter your last name'
                              ? lastNameShakeAnim.interpolate({ inputRange: [-1, 1], outputRange: [-5, 5] })
                              : 0,
                        },
                      ],
                    }}
                  >
                    <TextInput
                      label="Last Name"
                      value={lastName}
                      onChangeText={setLastName}
                      onFocus={() => setLastNameFocused(true)}
                      onBlur={() => setLastNameFocused(false)}
                      style={[
                        (lastName || lastNameFocused) ? styles.modernInput : styles.modernInputCompact,
                        submitted && !lastName.trim() && styles.modernInputError,
                      ]}
                      contentStyle={(lastName || lastNameFocused) ? styles.inputContentStyle : styles.inputContentStyleCompact}
                      dense={!lastName && !lastNameFocused}
                      mode="flat"
                      theme={{
                        colors: {
                          primary: '#FFFFFF',
                          background: 'transparent',
                          surface: 'transparent',
                          onSurfaceVariant: '#AAAAAA',
                          outline: 'transparent',
                          error: '#FF5555',
                        },
                      }}
                      textColor="#FFFFFF"
                      underlineColor={submitted && !lastName.trim() ? '#FF5555' : 'rgba(255, 255, 255, 0.3)'}
                      activeUnderlineColor={submitted && !lastName.trim() ? '#FF5555' : '#FFFFFF'}
                      autoCapitalize="words"
                    />
                  </Animated.View>
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Animated.View
                  style={{
                    transform: [
                      {
                        translateX:
                          errorMessage === 'Please enter your email address' || errorMessage === 'Please provide a valid email.'
                            ? emailShakeAnim.interpolate({ inputRange: [-1, 1], outputRange: [-5, 5] })
                            : 0,
                      },
                    ],
                  }}
                >
                  <TextInput
                    label="Email Address"
                    value={email}
                    onChangeText={handleEmailChange}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => {
                      setEmailFocused(false);
                      setIsEmailValid(email === '' || validateEmail(email));
                    }}
                    style={[
                      (email || emailFocused) ? styles.modernInput : styles.modernInputCompact,
                      !isEmailValid && styles.modernInputError,
                    ]}
                    contentStyle={(email || emailFocused) ? styles.inputContentStyle : styles.inputContentStyleCompact}
                    dense={!email && !emailFocused}
                    mode="flat"
                    theme={{
                      colors: {
                        primary: '#FFFFFF',
                        background: 'transparent',
                        surface: 'transparent',
                        onSurfaceVariant: '#AAAAAA',
                        outline: 'transparent',
                        error: '#FF5555',
                      },
                    }}
                    autoCapitalize='none'
                    keyboardType="email-address"
                    textColor='#FFFFFF'
                    error={!isEmailValid}
                    underlineColor={!isEmailValid ? '#FF5555' : 'rgba(255, 255, 255, 0.3)'}
                    activeUnderlineColor={!isEmailValid ? '#FF5555' : '#FFFFFF'}
                  />
                </Animated.View>
              </View>
            </View>

            {/* Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.nextButton}
                onPress={handleNext}
                activeOpacity={0.8}
              >
                <Text style={styles.nextButtonText}>Continue</Text>
                <Ionicons name="chevron-forward" size={20} color="#000000" />
              </TouchableOpacity>

              {/* Error message container with fixed height */}
              <View style={styles.errorContainer}>
                <Text style={[styles.errorText, { opacity: errorMessage ? 1 : 0 }]}>
                  {errorMessage || ' '}
                </Text>
              </View>
            </View>
          </Animated.View>
          
          {/* Footer buttons - locked at bottom */}
          {onShowLogin && (
            <View style={styles.loginFooterFixed}>
              <TouchableOpacity
                onPress={onShowLogin}
                activeOpacity={0.7}
              >
                <Text style={styles.linkText}>
                  Already have an account? <Text style={styles.linkTextBold}>Sign In</Text>
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {/* Loading spinner overlay */}
        {loading || spinnerFadeAnim._value > 0 ? (
          <>
            <View style={styles.loadingBlocker} pointerEvents="auto" />
            <Animated.View style={[styles.loadingOverlay, { opacity: spinnerFadeAnim }]} pointerEvents="auto">
              <CustomSpinner size={48} />
              <Text style={styles.loadingText}>Checking email...</Text>
            </Animated.View>
          </>
        ) : null}
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
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
  content: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 30,
  },
  form: {
    marginBottom: 10,
  },
  nameRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  inputContainer: {
    marginBottom: 10,
  },
  nameInput: {
    flex: 1,
    marginBottom: 0,
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
  input: {
    backgroundColor: 'transparent',
  },
  errorText: {
    color: '#FF5555',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 0,
  },
  errorContainer: {
    minHeight: 44,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  buttonContainer: {
    gap: 20,
  },
  nextButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    height: 50,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  nextButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loginFooterFixed: {
    alignItems: 'center',
    gap: 16,
    paddingBottom: 50,
    paddingHorizontal: 20,
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
  loginLink: {
    alignItems: 'center',
  },
  loginLinkText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
  },
  loginLinkBold: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  loadingOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 180,
    height: 180,
    marginLeft: -90,
    marginTop: -90,
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
