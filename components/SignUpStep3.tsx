import React, { useState, useCallback, useRef, useEffect } from 'react';
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
import CustomSpinner from '@/components/CustomSpinner';

interface SignUpStep3Props {
  visible: boolean;
  onBackPress: () => void;
  onComplete: (data: { password: string; confirmPassword: string }) => void;
  onShowLogin?: () => void;
  loading?: boolean;
}

export default function SignUpStep3({ visible, onBackPress, onComplete, onShowLogin, loading = false }: SignUpStep3Props) {
  const { width, height } = Dimensions.get('window');
  
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [submitted, setSubmitted] = useState(false);
  
  // Focus states
  const [passwordFocused, setPasswordFocused] = useState<boolean>(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState<boolean>(false);

  // Animated padding for keyboard
  const contentPaddingAnim = useRef(new Animated.Value(80)).current;

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

  const validatePassword = (password: string): { isValid: boolean; message?: string } => {
    if (password.length < 8) {
      return { isValid: false, message: 'Password must be at least 8 characters long' };
    }
    
    if (!/[A-Z]/.test(password)) {
      return { isValid: false, message: 'Password must contain at least one uppercase letter' };
    }
    
    if (!/[a-z]/.test(password)) {
      return { isValid: false, message: 'Password must contain at least one lowercase letter' };
    }
    
    if (!/\d/.test(password)) {
      return { isValid: false, message: 'Password must contain at least one number' };
    }
    
    return { isValid: true };
  };

  const getPasswordStrength = (password: string): { strength: number; label: string; color: string } => {
    let score = 0;
    
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^A-Za-z\d]/.test(password)) score++;
    
    if (score <= 2) return { strength: score, label: 'Weak', color: '#FF6B6B' };
    if (score <= 3) return { strength: score, label: 'Fair', color: '#FFB347' };
    if (score <= 4) return { strength: score, label: 'Good', color: '#87CEEB' };
    return { strength: score, label: 'Strong', color: '#90EE90' };
  };

  // Live validation after first submit
  useEffect(() => {
    if (!submitted) return;
    // Check password requirements
    const isStrong = password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password);
    if (!isStrong) {
      setErrorMessage('Password is not strong enough');
      return;
    }
    if (!confirmPassword.trim() || password !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }
    setErrorMessage('');
  }, [password, confirmPassword, submitted]);

  // Shake animations for password and confirm password fields
  const passwordShakeAnim = useRef(new Animated.Value(0)).current;
  const confirmPasswordShakeAnim = useRef(new Animated.Value(0)).current;

  const triggerShake = useCallback((field: 'password' | 'confirm') => {
    const anim = field === 'password' ? passwordShakeAnim : confirmPasswordShakeAnim;
    anim.setValue(0);
    Animated.sequence([
      Animated.timing(anim, { toValue: 1, duration: 50, useNativeDriver: true }),
      Animated.timing(anim, { toValue: -1, duration: 50, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 1, duration: 50, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [passwordShakeAnim, confirmPasswordShakeAnim]);

  const handleComplete = useCallback(() => {
    Keyboard.dismiss();
    setSubmitted(true);
    const isStrong = password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password);
    if (!isStrong) {
      setErrorMessage('Password is not strong enough');
      triggerShake('password');
      return;
    }
    if (!confirmPassword.trim() || password !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      triggerShake('confirm');
      return;
    }
    setErrorMessage('');
    onComplete({ password, confirmPassword });
  }, [password, confirmPassword, onComplete, triggerShake]);

  const handleBackPress = useCallback(() => {
    Keyboard.dismiss();
    onBackPress();
  }, [onBackPress]);

  // Animation for password strength indicator
  const strengthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (password) {
      Animated.timing(strengthAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: false,
      }).start();
    } else {
      Animated.timing(strengthAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: false,
      }).start();
    }
  }, [password]);

  const passwordStrength = password ? getPasswordStrength(password) : null;

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
          <View style={styles.header} />

          {/* Content */}
          <Animated.View style={[styles.content, { paddingTop: contentPaddingAnim }]}> 
            <Text style={styles.title}>Protect your account</Text>
            <Text style={styles.subtitle}>Create and confirm a secure password</Text>

            {/* Form */}
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Animated.View
                  style={{
                    transform: [
                      {
                        translateX:
                          submitted && errorMessage === 'Password is not strong enough'
                            ? passwordShakeAnim.interpolate({ inputRange: [-1, 1], outputRange: [-5, 5] })
                            : 0,
                      },
                    ],
                  }}
                >
                  <TextInput
                    label="Password"
                    value={password}
                    onChangeText={setPassword}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    secureTextEntry={!showPassword}
                    style={[
                      (password || passwordFocused) ? styles.modernInput : styles.modernInputCompact,
                      submitted && errorMessage === 'Password is not strong enough' && styles.modernInputError,
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
                      },
                    }}
                    textColor="#FFFFFF"
                    error={submitted && errorMessage === 'Password is not strong enough'}
                    underlineColor={submitted && errorMessage === 'Password is not strong enough' ? '#FF5555' : 'rgba(255, 255, 255, 0.3)'}
                    activeUnderlineColor={submitted && errorMessage === 'Password is not strong enough' ? '#FF5555' : '#FFFFFF'}
                    right={
                      <TextInput.Icon
                        icon={showPassword ? 'eye-off' : 'eye'}
                        onPress={() => setShowPassword(!showPassword)}
                      />
                    }
                    textContentType="newPassword"
                    autoComplete="new-password"
                  />
                </Animated.View>
              </View>
              <View style={styles.inputContainer}>
                <Animated.View
                  style={{
                    transform: [
                      {
                        translateX:
                          submitted && errorMessage === 'Passwords do not match'
                            ? confirmPasswordShakeAnim.interpolate({ inputRange: [-1, 1], outputRange: [-5, 5] })
                            : 0,
                      },
                    ],
                  }}
                >
                  <TextInput
                    label="Confirm Password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    onFocus={() => setConfirmPasswordFocused(true)}
                    onBlur={() => setConfirmPasswordFocused(false)}
                    secureTextEntry={!showConfirmPassword}
                    style={[
                      (confirmPassword || confirmPasswordFocused) ? styles.modernInput : styles.modernInputCompact,
                      errorMessage === 'Passwords do not match' && styles.modernInputError,
                    ]}
                    contentStyle={(confirmPassword || confirmPasswordFocused) ? styles.inputContentStyle : styles.inputContentStyleCompact}
                    dense={!confirmPassword && !confirmPasswordFocused}
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
                    error={errorMessage === 'Passwords do not match'}
                    underlineColor={errorMessage === 'Passwords do not match' ? '#FF5555' : 'rgba(255, 255, 255, 0.3)'}
                    activeUnderlineColor={errorMessage === 'Passwords do not match' ? '#FF5555' : '#FFFFFF'}
                    right={
                      <TextInput.Icon
                        icon={showConfirmPassword ? 'eye-off' : 'eye'}
                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      />
                    }
                    textContentType="newPassword"
                    autoComplete="new-password"
                  />
                </Animated.View>
              </View>
              {/* Password Strength Indicator with animation */}
              <Animated.View
                style={{
                  opacity: strengthAnim,
                  height: strengthAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 15] }),
                  marginBottom: strengthAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 5] }),
                  overflow: 'hidden',
                }}
              >
                {passwordStrength && (
                  <View style={styles.passwordStrength}>
                    <View style={styles.strengthBars}>
                      {[1, 2, 3, 4, 5].map((bar) => (
                        <View
                          key={bar}
                          style={[
                            styles.strengthBar,
                            {
                              backgroundColor: bar <= passwordStrength.strength 
                                ? passwordStrength.color 
                                : 'rgba(255, 255, 255, 0.2)'
                            }
                          ]}
                        />
                      ))}
                    </View>
                    <Text style={[styles.strengthLabel, { color: passwordStrength.color }]}> {passwordStrength.label} </Text>
                  </View>
                )}
              </Animated.View>
            </View>

            {/* Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.completeButton, loading && styles.disabledButton]}
                onPress={handleComplete}
                activeOpacity={0.8}
                disabled={loading}
              >
                {loading ? (
                  <CustomSpinner size={20} />
                ) : (
                  <>
                    <Text style={styles.completeButtonText}>Create Account</Text>
                    <Ionicons name="chevron-forward" size={20} color="#000000" />
                  </>
                )}
              </TouchableOpacity>
              {/* Error message only for strong password or mismatch */}
              <View style={styles.errorContainer}>
                <Text style={[styles.errorText, { opacity: errorMessage ? 1 : 0 }]}> {errorMessage || ' '} </Text>
              </View>
            </View>
          </Animated.View>
        </ScrollView>
        {/* Password Requirements - fixed at bottom, outside ScrollView */}
        <View style={styles.requirementsBoxFixed}>
          <Text style={styles.requirementsTitle}>Password must contain:</Text>
          <View style={styles.requirement}>
            <Ionicons 
              name={password.length >= 8 ? "checkmark-circle" : password.length > 0 ? "close-circle" : "ellipse-outline"} 
              size={16} 
              color={password.length >= 8 ? '#90EE90' : password.length > 0 ? '#FF5555' : 'rgba(255, 255, 255, 0.5)'} 
            />
            <Text style={styles.requirementText}>At least 8 characters</Text>
          </View>
          <View style={styles.requirement}>
            <Ionicons 
              name={/[A-Z]/.test(password) ? "checkmark-circle" : password.length > 0 ? "close-circle" : "ellipse-outline"} 
              size={16} 
              color={/[A-Z]/.test(password) ? '#90EE90' : password.length > 0 ? '#FF5555' : 'rgba(255, 255, 255, 0.5)'} 
            />
            <Text style={styles.requirementText}>One uppercase letter</Text>
          </View>
          <View style={styles.requirement}>
            <Ionicons 
              name={/[a-z]/.test(password) ? "checkmark-circle" : password.length > 0 ? "close-circle" : "ellipse-outline"} 
              size={16} 
              color={/[a-z]/.test(password) ? '#90EE90' : password.length > 0 ? '#FF5555' : 'rgba(255, 255, 255, 0.5)'} 
            />
            <Text style={styles.requirementText}>One lowercase letter</Text>
          </View>
          <View style={styles.requirement}>
            <Ionicons 
              name={/\d/.test(password) ? "checkmark-circle" : password.length > 0 ? "close-circle" : "ellipse-outline"} 
              size={16} 
              color={/\d/.test(password) ? '#90EE90' : password.length > 0 ? '#FF5555' : 'rgba(255, 255, 255, 0.5)'} 
            />
            <Text style={styles.requirementText}>One number</Text>
          </View>
        </View>
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
  inputContainer: {
    marginBottom: 10,
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
  modernInputError: {
    borderBottomColor: '#FF5555',
    borderBottomWidth: 2,
  },
  inputContentStyle: {
    // nothing right now.
  },
  inputContentStyleCompact: {
    // paddingTop: 8, // Minimal padding when unfocused to keep label close to line
    // paddingBottom: 4,
  },
  input: {
    backgroundColor: 'transparent',
  },
  passwordStrength: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 5,
  },
  strengthBars: {
    flexDirection: 'row',
    gap: 4,
    flex: 1,
  },
  strengthBar: {
    height: 4,
    flex: 1,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 8,
    minWidth: 50,
    textAlign: 'center',
  },
  errorText: {
    color: '#FF5555',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 0, // Remove any top margin
  },
  errorContainer: {
    minHeight: 24,
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginTop: 0,
  },
  requirementsBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 30,
  },
  requirementsBoxFixed: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
  },
  requirementsTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  requirement: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  requirementText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
  },
  buttonContainer: {
    gap: 15,
  },
  completeButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    height: 50,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  disabledButton: {
    opacity: 0.7,
  },
  completeButtonText: {
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
});
