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

interface SignUpStep2Props {
  visible: boolean;
  onBackPress: () => void;
  onNext: (data: { username: string; dateOfBirth: string }) => void;
  onShowLogin?: () => void;
}

export default function SignUpStep2({ visible, onBackPress, onNext, onShowLogin }: SignUpStep2Props) {
  const { width, height } = Dimensions.get('window');
  
  const [username, setUsername] = useState<string>('');
  const [dateOfBirth, setDateOfBirth] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  // Focus states
  const [usernameFocused, setUsernameFocused] = useState<boolean>(false);
  const [dateFocused, setDateFocused] = useState<boolean>(false);

  const validateUsername = (username: string): boolean => {
    // Username should be 3-20 characters, alphanumeric and underscores only
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    return usernameRegex.test(username);
  };

  const formatDateInput = (text: string): string => {
    // Remove all non-digits
    const digits = text.replace(/\D/g, '');
    
    // Format as MM/DD/YYYY
    if (digits.length >= 5) {
      return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
    } else if (digits.length >= 3) {
      return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    } else {
      return digits;
    }
  };

  const validateDate = (dateString: string): boolean => {
    if (dateString.length !== 10) return false;
    
    const [month, day, year] = dateString.split('/').map(Number);
    const date = new Date(year, month - 1, day);
    
    // Check if date is valid and user is at least 13 years old
    const today = new Date();
    const minDate = new Date(today.getFullYear() - 13, today.getMonth(), today.getDate());
    
    return date.getMonth() === month - 1 && 
           date.getDate() === day && 
           date.getFullYear() === year &&
           date <= minDate;
  };

  const handleDateChange = (text: string) => {
    const formatted = formatDateInput(text);
    setDateOfBirth(formatted);
  };

  const handleNext = useCallback(() => {
    // Dismiss keyboard first
    Keyboard.dismiss();
    
    setErrorMessage('');
    
    if (!username.trim()) {
      setErrorMessage('Please enter a username');
      return;
    }
    
    if (!validateUsername(username)) {
      setErrorMessage('Username must be 3-20 characters and contain only letters, numbers, and underscores');
      return;
    }
    
    if (!dateOfBirth.trim()) {
      setErrorMessage('Please enter your date of birth');
      return;
    }
    
    if (!validateDate(dateOfBirth)) {
      setErrorMessage('Please enter a valid date of birth (MM/DD/YYYY). You must be at least 13 years old.');
      return;
    }
    
    onNext({ username, dateOfBirth });
  }, [username, dateOfBirth, onNext]);

  const handleBackPress = useCallback(() => {
    Keyboard.dismiss();
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
            <View style={styles.progressContainer}>
              <View style={styles.progressDot} />
              <View style={[styles.progressDot, styles.progressDotActive]} />
              <View style={styles.progressDot} />
            </View>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.title}>Choose your identity</Text>
            <Text style={styles.subtitle}>Pick a username and tell us when you were born</Text>

            {/* Form */}
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <TextInput
                  label="Username"
                  value={username}
                  onChangeText={setUsername}
                  onFocus={() => setUsernameFocused(true)}
                  onBlur={() => setUsernameFocused(false)}
                  style={(username || usernameFocused) ? styles.modernInput : styles.modernInputCompact}
                  contentStyle={(username || usernameFocused) ? styles.inputContentStyle : styles.inputContentStyleCompact}
                  dense={!username && !usernameFocused}
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
                  autoCapitalize="none"
                  left={<TextInput.Icon icon="at" />}
                />
              </View>

              <View style={styles.inputContainer}>
                <TextInput
                  label="Date of Birth (MM/DD/YYYY)"
                  value={dateOfBirth}
                  onChangeText={handleDateChange}
                  onFocus={() => setDateFocused(true)}
                  onBlur={() => setDateFocused(false)}
                  style={(dateOfBirth || dateFocused) ? styles.modernInput : styles.modernInputCompact}
                  contentStyle={(dateOfBirth || dateFocused) ? styles.inputContentStyle : styles.inputContentStyleCompact}
                  dense={!dateOfBirth && !dateFocused}
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
                  keyboardType="numeric"
                  maxLength={10}
                  left={<TextInput.Icon icon="calendar" />}
                />
              </View>
            </View>

            {/* Info Box */}
            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={20} color="rgba(255, 255, 255, 0.7)" />
              <Text style={styles.infoText}>
                Your username will be visible to other users. Choose something that represents you!
              </Text>
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

            <View>
              <View style={{ height: '15%' }} />
            </View>
          </View>
          
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
  errorText: {
    color: '#FF5555',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
  },
  errorContainer: {
    minHeight: 44,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 30,
    gap: 12,
  },
  infoText: {
    flex: 1,
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    lineHeight: 20,
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
