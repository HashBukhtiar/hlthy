import React, { useState, useCallback } from 'react';
import { 
  View, 
  StyleSheet, 
  Text, 
  TouchableOpacity,
  Dimensions,
  TouchableWithoutFeedback,
  Keyboard,
  Modal,
  Platform,
  ScrollView,
  KeyboardAvoidingView
} from 'react-native';
import { useRouter } from 'expo-router';
import { TextInput } from 'react-native-paper';
import CustomSpinner from '@/components/CustomSpinner';
import { collection, setDoc, doc, getDocs, query, where, limit, serverTimestamp } from "firebase/firestore";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { db, auth } from '@/firebaseConfig';
import DateTimePicker from '@react-native-community/datetimepicker';

interface SignUpFormProps {
  visible: boolean;
  onBackPress: () => void;
  onShowLogin?: () => void;
}

export default function SignUpForm({ visible, onBackPress, onShowLogin }: SignUpFormProps) {
  const router = useRouter();
  
  const [userName, setUserName] = useState<string>('');
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [emailAddress, setEmailAddress] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [date, setDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [dateOfBirthFormatted, setDateOfBirthFormatted] = useState<string>('');
  const [isUsernameValid, setIsUsernameValid] = useState<boolean>(true);
  const [isUsernameAvailable, setIsUsernameAvailable] = useState<boolean>(true);
  const [isEmailValid, setIsEmailValid] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  
  // Focus states for modern input styling
  const [firstNameFocused, setFirstNameFocused] = useState<boolean>(false);
  const [lastNameFocused, setLastNameFocused] = useState<boolean>(false);
  const [usernameFocused, setUsernameFocused] = useState<boolean>(false);
  const [emailFocused, setEmailFocused] = useState<boolean>(false);
  const [passwordFocused, setPasswordFocused] = useState<boolean>(false);

  // Format date for display
  const formatDate = (date: Date): string => {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month < 10 ? '0' + month : month}/${day < 10 ? '0' + day : day}/${year}`;
  };

  // Check if the email is valid
  const isValidEmail = (email: string): boolean => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  // Check if username is valid
  const isValidUsername = (username: string): boolean => {
    if (!username || typeof username === 'undefined') {
      return false;
    }
    const re = /^[a-zA-Z0-9_.]+$/;
    return re.test(username);
  };

  // Check if username is available
  const isAvailableUsername = async (username: string): Promise<boolean> => {
    if (!username) return false;
    try {
      // Create a query against the collection.
      const usersRef = collection(db, "users");
      // Query for documents where the 'username' field matches
      const q = query(usersRef, where("username", "==", username), limit(1));
      
      const querySnapshot = await getDocs(q);
      
      // If querySnapshot is empty, the username is available
      return querySnapshot.empty; 
    } catch (error) {
      console.error("Error checking username availability:", error);
      // Assume unavailable or handle error appropriately
      return false; 
    }
  };

  // Date picker change handler
  const onChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || date;
    setShowDatePicker(Platform.OS === 'ios');
    setDate(currentDate);
    setDateOfBirthFormatted(formatDate(currentDate));
  };

  const handleBackToLanding = useCallback(() => {
    // Dismiss keyboard first
    Keyboard.dismiss();
    
    // Reset form state
    setErrorMessage('');
    setUserName('');
    setFirstName('');
    setLastName('');
    setEmailAddress('');
    setPassword('');
    setDate(new Date());
    setDateOfBirthFormatted('');
    setIsUsernameValid(true);
    setIsUsernameAvailable(true);
    setIsEmailValid(true);
    setFirstNameFocused(false);
    setLastNameFocused(false);
    setUsernameFocused(false);
    setEmailFocused(false);
    setPasswordFocused(false);
    
    onBackPress();
  }, [onBackPress]);

  const handleSignUp = async () => {
    try {
      // Dismiss keyboard first
      Keyboard.dismiss();
      
      // Clear previous errors
      setErrorMessage("");
      
      // Validate form data
      if (!firstName.trim()) {
        setErrorMessage("Please enter your first name.");
        return;
      }
      
      if (!lastName.trim()) {
        setErrorMessage("Please enter your last name.");
        return;
      }
      
      if (!isValidUsername(userName)) {
        setErrorMessage("Please enter a valid username.");
        return;
      }
      
      if (!isUsernameAvailable) {
        setErrorMessage("Username is already taken.");
        return;
      }
      
      if (!isValidEmail(emailAddress)) {
        setErrorMessage("Please provide a valid email address.");
        return;
      }
      
      if (!password || password.length < 6) {
        setErrorMessage("Password must be at least 6 characters.");
        return;
      }
      
      if (!dateOfBirthFormatted) {
        setErrorMessage("Please select your date of birth.");
        return;
      }
      
      // Show loading indicator
      setLoading(true);
      
      // 1) Create the user account
      const { user } = await createUserWithEmailAndPassword(
        auth,
        emailAddress,
        password
      );

      // 2) Set their Firebase Auth displayName
      const fullName = `${firstName.trim()} ${lastName.trim()}`;
      await updateProfile(user, { displayName: fullName });

      // 3) Write the complete profile doc
      await setDoc(doc(db, 'users', user.uid), {
        username:         userName,
        displayName:      fullName,
        email:            user.email,
        profileImageUrl:  '',             
        bio:              '',
        createdAt:        serverTimestamp(),
        archetype:        '',             
        stats: {
          followerCount:  0,
          followingCount: 0,
          postCount:      0
        },
        dateOfBirth:      date           
      });

      // 4) Navigate on success
      router.push({
        pathname: '/select-archetype',
        params: { userId: user.uid }
      });
      
    } catch (error: any) {
      console.error("Sign up error:", error);
      
      let errorMsg = "An error occurred. Please try again.";
      
      if (error.code === 'auth/email-already-in-use') {
        errorMsg = "This email is already registered. Try logging in instead.";
      } else if (error.code === 'auth/weak-password') {
        errorMsg = "Please choose a stronger password.";
      } else if (error.code === 'auth/invalid-email') {
        errorMsg = "Please enter a valid email address.";
      }
      
      setErrorMessage(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <View style={styles.slideView}>
      {/* Loading overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <CustomSpinner size={80} />
          <Text style={styles.loadingText}>Creating your account...</Text>
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
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.signUpFullContainer}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.signUpCenteredContent}>
              <View style={styles.signUpHeader}>
                <Text style={styles.signUpTitle}>Create Account</Text>
                <Text style={styles.signUpSubtitle}>Join the fitness community and start your journey</Text>
              </View>
            
              <View style={styles.formContainer}>
                {/* First and Last Name Row */}
                <View style={styles.nameRow}>
                  <TextInput
                    label="First Name"
                    value={firstName}
                    onChangeText={setFirstName}
                    onFocus={() => setFirstNameFocused(true)}
                    onBlur={() => setFirstNameFocused(false)}
                    style={[
                      (firstName || firstNameFocused) ? styles.modernInput : styles.modernInputCompact,
                      styles.nameInput
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
                        outline: 'transparent'
                      }
                    }}
                    textColor='#FFFFFF'
                    underlineColor="rgba(255, 255, 255, 0.3)"
                    activeUnderlineColor="#FFFFFF"
                  />
                  
                  <TextInput
                    label="Last Name"
                    value={lastName}
                    onChangeText={setLastName}
                    onFocus={() => setLastNameFocused(true)}
                    onBlur={() => setLastNameFocused(false)}
                    style={[
                      (lastName || lastNameFocused) ? styles.modernInput : styles.modernInputCompact,
                      styles.nameInput
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
                        outline: 'transparent'
                      }
                    }}
                    textColor='#FFFFFF'
                    underlineColor="rgba(255, 255, 255, 0.3)"
                    activeUnderlineColor="#FFFFFF"
                  />
                </View>

                <TextInput
                  label="Username"
                  value={userName}
                  onChangeText={(text) => setUserName(text.toLowerCase())}
                  onFocus={() => setUsernameFocused(true)}
                  onBlur={async () => {
                    setUsernameFocused(false);
                    setIsUsernameValid(isValidUsername(userName));
                    if (userName) {
                      setIsUsernameAvailable(await isAvailableUsername(userName));
                    }
                  }}
                  style={[
                    (userName || usernameFocused) ? styles.modernInput : styles.modernInputCompact,
                    (!isUsernameValid || !isUsernameAvailable) && styles.modernInputError
                  ]}
                  contentStyle={(userName || usernameFocused) ? styles.inputContentStyle : styles.inputContentStyleCompact}
                  dense={!userName && !usernameFocused}
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
                  textColor='#FFFFFF'
                  error={!isUsernameValid || !isUsernameAvailable}
                  underlineColor={(!isUsernameValid || !isUsernameAvailable) ? "#FF5555" : "rgba(255, 255, 255, 0.3)"}
                  activeUnderlineColor={(!isUsernameValid || !isUsernameAvailable) ? "#FF5555" : "#FFFFFF"}
                />
                
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

                {/* Date of Birth Picker */}
                <TouchableOpacity 
                  onPress={() => setShowDatePicker(true)}
                  style={styles.dobContainer}
                >
                  <Text style={styles.dobLabel}>Date of Birth</Text>
                  <Text style={styles.dobValue}>
                    {dateOfBirthFormatted || 'Select your date of birth'}
                  </Text>
                </TouchableOpacity>

                {showDatePicker && (
                  <Modal
                    transparent={true}
                    animationType="slide"
                    visible={showDatePicker}
                  >
                    <View style={styles.pickerModalContainer}>
                      <View style={styles.pickerContainer}>
                        <View style={styles.pickerHeader}>
                          <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                            <Text style={styles.pickerCancelButton}>Cancel</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => {
                            setShowDatePicker(false);
                            setDateOfBirthFormatted(formatDate(date));
                          }}>
                            <Text style={styles.pickerDoneButton}>Done</Text>
                          </TouchableOpacity>
                        </View>
                        <DateTimePicker
                          value={date}
                          mode="date"
                          display="spinner"
                          onChange={onChange}
                          style={styles.datePicker}
                          maximumDate={new Date()}
                          minimumDate={new Date(1900, 0, 1)}
                        />
                      </View>
                    </View>
                  </Modal>
                )}
                
                <TouchableOpacity
                  style={[
                    styles.modernSignUpButton,
                    loading && styles.modernSignUpButtonDisabled
                  ]}
                  onPress={handleSignUp}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modernSignUpButtonText}>
                    {loading ? 'Creating Account...' : 'Create Account'}
                  </Text>
                </TouchableOpacity>
                
                <View style={styles.errorContainer}>
                  <Text style={[styles.errorText, { opacity: errorMessage ? 1 : 0 }]}>
                    {errorMessage || ' '}
                  </Text>
                </View>
              </View>
            </View>
            
            {/* Footer buttons - locked at bottom */}
            <View style={styles.signUpFooterFixed}>
              <TouchableOpacity onPress={onShowLogin || (() => router.push('/landing'))} activeOpacity={0.7}>
                <Text style={styles.linkText}>Already have an account? <Text style={styles.linkTextBold}>Sign In</Text></Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
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
  signUpFullContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  signUpCenteredContent: {
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
  signUpHeader: {
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 40,
  },
  signUpTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  signUpSubtitle: {
    fontSize: 16,
    color: '#AAAAAA',
    textAlign: 'center',
    lineHeight: 22,
  },
  formContainer: {
    width: '100%',
    marginBottom: 30,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  nameInput: {
    flex: 1,
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
  dobContainer: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
    padding: 16,
    marginBottom: 16,
    marginTop: 10,
    marginHorizontal: 5,
    backgroundColor: 'transparent',
  },
  dobLabel: {
    color: '#AAAAAA',
    fontSize: 12,
    marginBottom: 4,
  },
  dobValue: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  pickerModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  pickerContainer: {
    backgroundColor: '#222222',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  pickerCancelButton: {
    color: '#FF6666',
    fontSize: 16,
  },
  pickerDoneButton: {
    color: '#66BB6A',
    fontSize: 16,
    fontWeight: 'bold',
  },
  datePicker: {
    backgroundColor: '#222222',
    height: 250,
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
  modernSignUpButton: {
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
  modernSignUpButtonDisabled: {
    backgroundColor: '#666666',
    opacity: 0.6,
  },
  modernSignUpButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  signUpFooterFixed: {
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
