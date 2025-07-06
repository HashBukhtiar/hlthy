import React, { useState, useCallback } from 'react';
import { 
  View, 
  StyleSheet, 
  Text, 
  TouchableOpacity,
  Dimensions,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';
import { useRouter } from 'expo-router';
import { TextInput, RadioButton } from 'react-native-paper';
import CustomSpinner from '@/components/CustomSpinner';

interface ForgotPasswordFormProps {
  visible: boolean;
  onBackPress: () => void;
  onBackToLogin?: () => void;
}

export default function ForgotPasswordForm({ visible, onBackPress, onBackToLogin }: ForgotPasswordFormProps) {
  const router = useRouter();
  
  const [emailAddress, setEmailAddress] = useState<string>('');
  const [resetMethod, setResetMethod] = useState<string>('email-code'); // 'email-code' or 'reset-link'
  const [isEmailValid, setIsEmailValid] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [emailFocused, setEmailFocused] = useState<boolean>(false);

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
    setIsEmailValid(true);
    setEmailFocused(false);
    setSubmitted(false);
    setResetMethod('email-code');
    
    // Use onBackToLogin if available, otherwise onBackPress
    if (onBackToLogin) {
      onBackToLogin();
    } else {
      onBackPress();
    }
  }, [onBackPress, onBackToLogin]);

  const handleSubmit = async () => {
    try {
      // Dismiss keyboard first
      Keyboard.dismiss();
      
      // Clear previous errors
      setErrorMessage("");
      
      // Validate form data
      if (!isValidEmail(emailAddress)) {
        setErrorMessage("Please provide a valid email address.");
        return;
      }
      
      // Show loading indicator
      setLoading(true);
      
      // Simulate API call delay (replace with actual API call in functionality implementation)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Set submitted state to show success message
      setSubmitted(true);
      
    } catch (error: any) {
      console.error("Forgot password error:", error);
      setErrorMessage("An error occurred. Please try again later.");
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
          <Text style={styles.loadingText}>Sending reset instructions...</Text>
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
        <View style={styles.forgotPasswordFullContainer}>
          {submitted ? (
            // Success State
            <View style={styles.forgotPasswordCenteredContent}>
              <View style={styles.successHeader}>
                <Text style={styles.successTitle}>Check Your Email</Text>
                <Text style={styles.successMessage}>
                  {resetMethod === 'email-code' 
                    ? `We've sent a one-time verification code to ${emailAddress}`
                    : `We've sent a password reset link to ${emailAddress}`
                  }
                </Text>
                <Text style={styles.instructionText}>
                  {resetMethod === 'email-code' 
                    ? 'Enter the verification code in the login page to access your account.'
                    : 'Click the link in your email to reset your password, then return to login.'
                  }
                </Text>
              </View>
            </View>
          ) : (
            // Form State
            <View style={styles.forgotPasswordCenteredContent}>
              <View style={styles.forgotPasswordHeader}>
                <Text style={styles.forgotPasswordTitle}>Forgot Password</Text>
                <Text style={styles.forgotPasswordSubtitle}>Choose how you'd like to recover your account</Text>
              </View>
            
              <View style={styles.formContainer}>
                {/* Reset Method Selection */}
                <View style={styles.radioContainer}>
                  <TouchableOpacity 
                    style={styles.radioOption}
                    onPress={() => setResetMethod('email-code')}
                    activeOpacity={0.7}
                  >
                    <RadioButton
                      value="email-code"
                      status={resetMethod === 'email-code' ? 'checked' : 'unchecked'}
                      onPress={() => setResetMethod('email-code')}
                      color="#FFFFFF"
                    />
                    <View style={styles.radioTextContainer}>
                      <Text style={styles.radioTitle}>One-time Email Code</Text>
                      <Text style={styles.radioDescription}>
                        Receive a verification code to login temporarily
                      </Text>
                    </View>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.radioOption}
                    onPress={() => setResetMethod('reset-link')}
                    activeOpacity={0.7}
                  >
                    <RadioButton
                      value="reset-link"
                      status={resetMethod === 'reset-link' ? 'checked' : 'unchecked'}
                      onPress={() => setResetMethod('reset-link')}
                      color="#FFFFFF"
                    />
                    <View style={styles.radioTextContainer}>
                      <Text style={styles.radioTitle}>Password Reset Link</Text>
                      <Text style={styles.radioDescription}>
                        Receive a link to create a new password
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>

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
                    {loading ? 'Sending...' : 'Send Reset Instructions'}
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
          
          {/* Footer buttons - locked at bottom */}
          <View style={styles.forgotPasswordFooterFixed}>
            {onBackToLogin && (
              <TouchableOpacity onPress={onBackToLogin} activeOpacity={0.7}>
                <Text style={styles.linkText}>Remember your password? <Text style={styles.linkTextBold}>Back to Login</Text></Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity onPress={() => router.push('/signup')} activeOpacity={0.7}>
              <Text style={styles.linkText}>Don't have an account? <Text style={styles.linkTextBold}>Sign Up</Text></Text>
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
  forgotPasswordFullContainer: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  forgotPasswordCenteredContent: {
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
  radioContainer: {
    marginBottom: 30,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingVertical: 8,
  },
  radioTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  radioTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  radioDescription: {
    fontSize: 14,
    color: '#AAAAAA',
    lineHeight: 18,
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
    top: -200,
    left: -200,
    right: -200,
    bottom: -200,
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
