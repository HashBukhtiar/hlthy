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
  
  // Focus states
  const [firstNameFocused, setFirstNameFocused] = useState<boolean>(false);
  const [lastNameFocused, setLastNameFocused] = useState<boolean>(false);
  const [emailFocused, setEmailFocused] = useState<boolean>(false);
  const [isEmailValid, setIsEmailValid] = useState<boolean>(true);
  
  // Animation for keyboard
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

  const validateEmail = (email: string): boolean => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleNext = useCallback(() => {
    // Dismiss keyboard first
    Keyboard.dismiss();
    
    setErrorMessage('');
    
    if (!firstName.trim()) {
      setErrorMessage('Please enter your first name');
      return;
    }
    
    if (!lastName.trim()) {
      setErrorMessage('Please enter your last name');
      return;
    }
    
    if (!email.trim()) {
      setErrorMessage('Please enter your email address');
      return;
    }
    
    if (!validateEmail(email)) {
      setErrorMessage('Please provide a valid email.');
      return;
    }
    
    onNext({ firstName, lastName, email });
  }, [firstName, lastName, email, onNext]);

  const handleBackPress = useCallback(() => {
    Keyboard.dismiss();
    setErrorMessage('');
    setFirstName('');
    setLastName('');
    setEmail('');
    setIsEmailValid(true);
    onBackPress();
  }, [onBackPress]);

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
            <Text style={styles.title}>Let's get started</Text>
            <Text style={styles.subtitle}>Tell us a bit about yourself</Text>

            {/* Form */}
            <View style={styles.form}>
              <View style={styles.nameRow}>
                <View style={[styles.inputContainer, styles.nameInput]}>
                  <TextInput
                    label="First Name"
                    value={firstName}
                    onChangeText={setFirstName}
                    onFocus={() => setFirstNameFocused(true)}
                    onBlur={() => setFirstNameFocused(false)}
                    style={(firstName || firstNameFocused) ? styles.modernInput : styles.modernInputCompact}
                    contentStyle={(firstName || firstNameFocused) ? styles.inputContentStyle : styles.inputContentStyleCompact}
                    dense={!firstName && !firstNameFocused}
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
                    autoCapitalize="words"
                  />
                </View>
                
                <View style={[styles.inputContainer, styles.nameInput]}>
                  <TextInput
                    label="Last Name"
                    value={lastName}
                    onChangeText={setLastName}
                    onFocus={() => setLastNameFocused(true)}
                    onBlur={() => setLastNameFocused(false)}
                    style={(lastName || lastNameFocused) ? styles.modernInput : styles.modernInputCompact}
                    contentStyle={(lastName || lastNameFocused) ? styles.inputContentStyle : styles.inputContentStyleCompact}
                    dense={!lastName && !lastNameFocused}
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
                    autoCapitalize="words"
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <TextInput
                  label="Email Address"
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => {
                    setEmailFocused(false);
                    setIsEmailValid(email === '' || validateEmail(email));
                  }}
                  style={[
                    (email || emailFocused) ? styles.modernInput : styles.modernInputCompact, 
                    !isEmailValid && styles.modernInputError
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
});
