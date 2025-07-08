import React, { useState, useCallback } from 'react';
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
  Platform
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
  
  // Focus states
  const [passwordFocused, setPasswordFocused] = useState<boolean>(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState<boolean>(false);

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

  const handleComplete = useCallback(() => {
    // Dismiss keyboard first
    Keyboard.dismiss();
    
    setErrorMessage('');
    
    if (!password.trim()) {
      setErrorMessage('Please enter a password');
      return;
    }
    
    const validation = validatePassword(password);
    if (!validation.isValid) {
      setErrorMessage(validation.message || '');
      return;
    }
    
    if (!confirmPassword.trim()) {
      setErrorMessage('Please confirm your password');
      return;
    }
    
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }
    
    onComplete({ password, confirmPassword });
  }, [password, confirmPassword, onComplete]);

  const handleBackPress = useCallback(() => {
    Keyboard.dismiss();
    onBackPress();
  }, [onBackPress]);

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
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={handleBackPress}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            
            <View style={styles.progressContainer}>
              <View style={styles.progressDot} />
              <View style={styles.progressDot} />
              <View style={[styles.progressDot, styles.progressDotActive]} />
            </View>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.title}>Secure your account</Text>
            <Text style={styles.subtitle}>Choose a strong password to protect your account</Text>

            {/* Form */}
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <TextInput
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  secureTextEntry={!showPassword}
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
                  right={
                    <TextInput.Icon 
                      icon={showPassword ? "eye-off" : "eye"} 
                      onPress={() => setShowPassword(!showPassword)}
                    />
                  }
                />
                
                {/* Password Strength Indicator */}
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
                    <Text style={[styles.strengthLabel, { color: passwordStrength.color }]}>
                      {passwordStrength.label}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.inputContainer}>
                <TextInput
                  label="Confirm Password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  onFocus={() => setConfirmPasswordFocused(true)}
                  onBlur={() => setConfirmPasswordFocused(false)}
                  secureTextEntry={!showConfirmPassword}
                  style={(confirmPassword || confirmPasswordFocused) ? styles.modernInput : styles.modernInputCompact}
                  contentStyle={(confirmPassword || confirmPasswordFocused) ? styles.inputContentStyle : styles.inputContentStyleCompact}
                  dense={!confirmPassword && !confirmPasswordFocused}
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
                  right={
                    <TextInput.Icon 
                      icon={showConfirmPassword ? "eye-off" : "eye"} 
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    />
                  }
                />
              </View>
            </View>

            {/* Password Requirements */}
            <View style={styles.requirementsBox}>
              <Text style={styles.requirementsTitle}>Password must contain:</Text>
              <View style={styles.requirement}>
                <Ionicons 
                  name={password.length >= 8 ? "checkmark-circle" : "ellipse-outline"} 
                  size={16} 
                  color={password.length >= 8 ? '#90EE90' : 'rgba(255, 255, 255, 0.5)'} 
                />
                <Text style={styles.requirementText}>At least 8 characters</Text>
              </View>
              <View style={styles.requirement}>
                <Ionicons 
                  name={/[A-Z]/.test(password) ? "checkmark-circle" : "ellipse-outline"} 
                  size={16} 
                  color={/[A-Z]/.test(password) ? '#90EE90' : 'rgba(255, 255, 255, 0.5)'} 
                />
                <Text style={styles.requirementText}>One uppercase letter</Text>
              </View>
              <View style={styles.requirement}>
                <Ionicons 
                  name={/[a-z]/.test(password) ? "checkmark-circle" : "ellipse-outline"} 
                  size={16} 
                  color={/[a-z]/.test(password) ? '#90EE90' : 'rgba(255, 255, 255, 0.5)'} 
                />
                <Text style={styles.requirementText}>One lowercase letter</Text>
              </View>
              <View style={styles.requirement}>
                <Ionicons 
                  name={/\d/.test(password) ? "checkmark-circle" : "ellipse-outline"} 
                  size={16} 
                  color={/\d/.test(password) ? '#90EE90' : 'rgba(255, 255, 255, 0.5)'} 
                />
                <Text style={styles.requirementText}>One number</Text>
              </View>
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
                    <Ionicons name="checkmark" size={20} color="#000000" />
                  </>
                )}
              </TouchableOpacity>

              {/* Error message container with fixed height */}
              <View style={styles.errorContainer}>
                <Text style={[styles.errorText, { opacity: errorMessage ? 1 : 0 }]}>
                  {errorMessage || ' '}
                </Text>
              </View>

              {onShowLogin && (
                <TouchableOpacity
                  style={styles.loginLink}
                  onPress={onShowLogin}
                  activeOpacity={0.7}
                >
                  <Text style={styles.loginLinkText}>
                    Already have an account? <Text style={styles.loginLinkBold}>Sign In</Text>
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 40,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  progressDotActive: {
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: 20,
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
    marginBottom: 40,
  },
  form: {
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
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
  input: {
    backgroundColor: 'transparent',
  },
  passwordStrength: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
  },
  errorContainer: {
    minHeight: 44,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  requirementsBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 30,
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
    gap: 20,
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
