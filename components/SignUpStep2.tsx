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
  Animated,
  Modal
} from 'react-native';
import { TextInput } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import CustomSpinner from '@/components/CustomSpinner';

interface SignUpStep2Props {
  visible: boolean;
  onBackPress: () => void;
  onNext: (data: { username: string; dateOfBirth: string }) => void;
  onShowLogin?: () => void;
  firstName?: string;
}

export default function SignUpStep2({ visible, onBackPress, onNext, onShowLogin, firstName }: SignUpStep2Props) {
  const { width, height } = Dimensions.get('window');
  
  const [username, setUsername] = useState<string>('');
  const [dateOfBirth, setDateOfBirth] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [submitted, setSubmitted] = useState(false); // Track first submit
  const [loading, setLoading] = useState(false);

  // Focus states
  const [usernameFocused, setUsernameFocused] = useState<boolean>(false);
  const [dateFocused, setDateFocused] = useState<boolean>(false);

  // Fitted sigmoid baby!
  const getInitialContentPadding = () => {
    let a = 0.07190;
    let b = -0.03176;
    let h = -836.3;
    let k = 0.06967;
    // console.log('height:', height, '| factor: ', a / (1 + Math.exp(b * (height + h))) + k, '| contentPadding: ', Math.round(height * (a / (1 + Math.exp(b * (height + h))) + k)));
    return Math.round(height * (a / (1 + Math.exp(b * (height + h))) + k));
  };

  // Animation for keyboard
  const contentPaddingAnim = useRef(new Animated.Value(getInitialContentPadding())).current;

  // Animation for floating label and input value
  const floatingLabelAnim = useRef(new Animated.Value(0)).current;
  const inputValueAnim = useRef(new Animated.Value(0)).current;

  // Shake animation for username field
  const usernameShakeAnim = useRef(new Animated.Value(0)).current;

  // Spinner fade animation
  const spinnerFadeAnim = useRef(new Animated.Value(0)).current;
  const [spinnerOpacity, setSpinnerOpacity] = useState<number>(0);

  useEffect(() => {
    const id = spinnerFadeAnim.addListener(({ value }) => {
      setSpinnerOpacity(value);
    });
    return () => {
      spinnerFadeAnim.removeListener(id);
    };
  }, [spinnerFadeAnim]);

  const triggerUsernameShake = useCallback(() => {
    usernameShakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(usernameShakeAnim, { toValue: 1, duration: 50, useNativeDriver: true }),
      Animated.timing(usernameShakeAnim, { toValue: -1, duration: 50, useNativeDriver: true }),
      Animated.timing(usernameShakeAnim, { toValue: 1, duration: 50, useNativeDriver: true }),
      Animated.timing(usernameShakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [usernameShakeAnim]);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        Animated.timing(contentPaddingAnim, {
          toValue: getInitialContentPadding() - 70,
          duration: 250,
          useNativeDriver: false,
        }).start();
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        Animated.timing(contentPaddingAnim, {
          toValue: getInitialContentPadding(),
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
    // Animate label and input in/out
    if (dateFocused || dateOfBirth) {
      Animated.parallel([
        Animated.timing(floatingLabelAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(inputValueAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(floatingLabelAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(inputValueAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [dateFocused, dateOfBirth]);

  // Improved username validation with specific error messages
  const getUsernameError = (username: string): string | null => {
    if (!username.trim()) return 'Please enter a username';
    if (username.length < 3) return 'Username must be at least 3 characters';
    if (username.length > 20) return 'Username must be at most 20 characters';
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return 'Only letters, numbers, and underscores allowed';
    return null;
  };

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

  const handleNext = useCallback(async () => {
    // Dismiss keyboard first
    Keyboard.dismiss();
    setSubmitted(true);
    const usernameErr = getUsernameError(username);
    if (usernameErr) {
      setErrorMessage(usernameErr);
      triggerUsernameShake(); // Shake on error
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
    setErrorMessage('');
    setLoading(true);
    try {
      const db = getFirestore();
      const usersRef = collection(db, 'usersPublic');
      const q = query(usersRef, where('username', '==', username.trim()));
      console.log('Checking username:', username.trim());
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        setErrorMessage('This username is already taken.');
        setLoading(false);
        triggerUsernameShake();
        return;
      }
      setLoading(false);
      onNext({ username, dateOfBirth });
    } catch (err) {
      console.error('Error checking username:', err);
      setErrorMessage('Error checking username. Please try again.');
      setLoading(false);
      triggerUsernameShake();
      return;
    }
  }, [username, dateOfBirth, onNext, triggerUsernameShake]);

  useEffect(() => {
    if (!submitted) return;
    const usernameErr = getUsernameError(username);
    if (usernameErr) {
      setErrorMessage(usernameErr);
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
    setErrorMessage('');
  }, [username, dateOfBirth, submitted]);

  const handleBackPress = useCallback(() => {
    Keyboard.dismiss();
    onBackPress();
  }, [onBackPress]);

  // Username input (no longer prepends '@')
  const getUsernameValue = () => username;
  const handleUsernameChange = (text: string) => {
    // Remove any leading @ characters and trim leading/trailing whitespace
    const sanitized = text.replace(/^@+/, '').trim();
    setUsername(sanitized);
    if (submitted) {
      // Live validation after first submit using sanitized value
      const usernameErr = getUsernameError(sanitized);
      setErrorMessage(usernameErr || '');
    }
  };

  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateObj, setDateObj] = useState<Date>(new Date(2000, 0, 1));
  const [dateOfBirthFormatted, setDateOfBirthFormatted] = useState<string>('');

  // Format date for display
  const formatDate = (date: Date): string => {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month < 10 ? '0' + month : month}/${day < 10 ? '0' + day : day}/${year}`;
  };

  const handleDateChangePicker = (event: any, selectedDate?: Date) => {
    if (event.type === 'set' && selectedDate) {
      setDateObj(selectedDate);
      setDateOfBirthFormatted(formatDate(selectedDate));
      setDateOfBirth(formatDate(selectedDate));
    }
  };

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
            disabled={loading} // Disable back button when loading
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
          </View>

          {/* Content */}
          <Animated.View style={[styles.content, { paddingTop: contentPaddingAnim }]}> 
            <Text style={styles.title}>Welcome, {firstName || 'there'}</Text>
            <Text style={styles.subtitle}>Pick a username and enter your birthdate</Text>

            {/* Form */}
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Animated.View
                  style={{
                    transform: [
                      {
                        translateX: submitted && getUsernameError(username)
                          ? usernameShakeAnim.interpolate({ inputRange: [-1, 1], outputRange: [-5, 5] })
                          : 0,
                      },
                    ],
                  }}
                >
                  <TextInput
                    label="Username"
                    value={username}
                    onChangeText={handleUsernameChange}
                    onFocus={() => setUsernameFocused(true)}
                    onBlur={() => setUsernameFocused(false)}
                    style={[
                      (username || usernameFocused) ? styles.modernInput : styles.modernInputCompact,
                      submitted && getUsernameError(username) && styles.modernInputError,
                    ]}
                    contentStyle={(username || usernameFocused) ? styles.inputContentStyle : styles.inputContentStyleCompact}
                    dense={!username && !usernameFocused}
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
                    error={!!(submitted && getUsernameError(username))}
                    underlineColor={submitted && getUsernameError(username) ? '#FF5555' : 'rgba(255, 255, 255, 0.3)'}
                    activeUnderlineColor={submitted && getUsernameError(username) ? '#FF5555' : '#FFFFFF'}
                    autoCapitalize="none"
                    left={null}
                    selectionColor="#FFFFFF"
                  />
                </Animated.View>
              </View>

              <View style={[styles.inputContainer, { marginTop: 10 }]}>
                {/* Animated Floating label for Date of Birth (always rendered, animates between states) */}
                <View style={styles.floatingLabelWrapper} pointerEvents="none">
                  {/* Large label (resting) */}
                  <Animated.Text
                    style={[
                      styles.floatingLabelLarge,
                      {
                        opacity: floatingLabelAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
                        transform: [
                          {
                            translateY: floatingLabelAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -18] }),
                          },
                        ],
                      },
                    ]}
                  >
                    Date of Birth
                  </Animated.Text>
                  {/* Small label (floating) */}
                  <Animated.Text
                    style={[
                      styles.floatingLabelSmall,
                      {
                        opacity: floatingLabelAnim,
                        transform: [
                          {
                            translateY: floatingLabelAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }),
                          },
                        ],
                      },
                    ]}
                  >
                    Date of Birth
                  </Animated.Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowDatePicker(true)}
                  onFocus={() => setDateFocused(true)}
                  onBlur={() => setDateFocused(false)}
                  style={[
                    styles.modernInput,
                    {flexDirection: 'row', alignItems: 'center', paddingLeft: 0, paddingBottom: 0, position: 'relative'},
                  ]}
                  activeOpacity={0.8}
                >
                  <Animated.Text
                    style={{
                      color: dateFocused || dateOfBirthFormatted ? '#fff' : 'rgba(255,255,255,0.7)',
                      fontSize: 16,
                      flex: 1,
                      opacity: inputValueAnim,
                      transform: [
                        {
                          translateY: inputValueAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [10, 0],
                          }),
                        },
                      ],
                    }}
                  >
                    {dateOfBirthFormatted || (!dateFocused ? 'Date of Birth' : '')}
                  </Animated.Text>
                  {dateOfBirthFormatted ? (
                    <TouchableOpacity
                      onPress={(e) => { e.stopPropagation && e.stopPropagation(); setDateOfBirth(''); setDateOfBirthFormatted(''); }}
                      style={{marginLeft: 8, marginRight: 4, padding: 4}}
                      hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
                    >
                      <Ionicons name="close-circle" size={20} color="#AAAAAA" />
                    </TouchableOpacity>
                  ) : null}
                </TouchableOpacity>
                <View style={{
                  height: 0.25,
                  backgroundColor: 'rgba(255, 255, 255, 0.3)',
                  marginHorizontal: 5,
                  marginTop: -20,
                  borderRadius: 1,
                  transitionProperty: 'background-color',
                  transitionDuration: '200ms',
                }} />
                {showDatePicker && (
                  <Modal
                    transparent={true}
                    animationType="slide"
                    visible={showDatePicker}
                  >
                    <View style={{flex:1, justifyContent:'flex-end', backgroundColor:'rgba(0,0,0,0.3)'}}>
                      <View style={{backgroundColor:'#222', borderTopLeftRadius:16, borderTopRightRadius:16, padding:16}}>
                        <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
                          <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                            <Text style={{color:'#AAA', fontSize:16}}>Cancel</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => { setShowDatePicker(false); if(dateObj) { setDateOfBirthFormatted(formatDate(dateObj)); setDateOfBirth(formatDate(dateObj)); } }}>
                            <Text style={{color:'#fff', fontWeight:'bold', fontSize:16}}>Done</Text>
                          </TouchableOpacity>
                        </View>
                        <DateTimePicker
                          value={dateObj}
                          mode="date"
                          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                          onChange={handleDateChangePicker}
                          maximumDate={new Date(new Date().getFullYear() - 13, new Date().getMonth(), new Date().getDate())}
                          minimumDate={new Date(1900, 0, 1)}
                          style={{backgroundColor:'#222'}}
                          {...(Platform.OS === 'ios' ? { textColor: '#fff' } : {})}
                        />
                      </View>
                    </View>
                  </Modal>
                )}
              </View>
            </View>

            {/* Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.nextButton, loading && styles.disabledButton]}
                onPress={handleNext}
                activeOpacity={0.8}
                disabled={loading}
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

          {/* Info Box - moved outside Animated.View so it does not move with keyboard */}
          <View style={{ width: '100%', alignItems: 'center', marginBottom: 0 }}>
            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={20} color="rgba(255, 255, 255, 0.7)" />
              <Text style={styles.infoText}>
                Your date of birth will not be visible to other users.
              </Text>
            </View>
          </View>
          
          {/* Footer buttons - locked at bottom */}
          {onShowLogin && (
            <View style={styles.loginFooterFixed} pointerEvents={loading ? "none" : "auto"}>
              <TouchableOpacity
                onPress={onShowLogin}
                activeOpacity={0.7}
                disabled={loading}
              >
                <Text style={styles.linkText}>
                  Already have an account? <Text style={styles.linkTextBold}>Sign In</Text>
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {/* Loader widget centered on page, above all content */}
  {(loading || spinnerOpacity > 0) && (
          <>
            <View style={styles.loadingBlocker} pointerEvents="auto" />
            <Animated.View style={[styles.loadingOverlay, { opacity: spinnerFadeAnim }]} pointerEvents="auto">
              <CustomSpinner size={48} />
              <Text style={styles.loadingText}>Checking username...</Text>
            </Animated.View>
          </>
        )}
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
    marginTop: 0,
  },
  errorContainer: {
    minHeight: 24,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  infoBoxWrapperFixed: {
    width: '100%',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
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
  disabledButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
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
  floatingLabelWrapper: {
    position: 'absolute',
    left: 5,
    width: '100%',
    height: 40,
    justifyContent: 'center',
  },
  floatingLabelLarge: {
    position: 'absolute',
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    top: 23
  },
  floatingLabelSmall: {
    position: 'absolute',
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    top: 0
  },
  modernInputError: {
    // Remove border styling, rely on underline color for error indication
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
