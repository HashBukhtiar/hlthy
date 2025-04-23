import React, { useState } from 'react';
import { 
  View, 
  StyleSheet, 
  Text, 
  Image, 
  KeyboardAvoidingView, 
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  TouchableOpacity,
  Modal,
  ActivityIndicator
} from 'react-native';
import { Button, TextInput } from 'react-native-paper';
import { collection, setDoc, doc, getDocs } from "firebase/firestore"; 
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { db, auth } from '../firebaseConfig';
import DateTimePicker from '@react-native-community/datetimepicker';

const SignUpScreen = ({ navigation }) => {
  const [userName, setUserName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateOfBirthFormatted, setDateOfBirthFormatted] = useState('');
  const [isUsernameValid, setIsUsernameValid] = useState(true);
  const [isUsernameAvailable, setIsUsernameAvailable] = useState(true);
  const [isEmailValid, setIsEmailValid] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Format date for display
  const formatDate = (date) => {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month < 10 ? '0' + month : month}/${day < 10 ? '0' + day : day}/${year}`;
  };

  // Check if the email is valid
  const isValidEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  // Check if username is valid
  const isValidUsername = (username) => {
    if (!username || typeof username === 'undefined') {
      return false;
    }
    const re = /^[a-zA-Z0-9_.]+$/;
    return re.test(username);
  };

  // Check if username is available (WIP)
  const isAvailableUsername = async (username) => {
    const querySnapshot = await getDocs(collection(db, "users"));
    for (const doc of querySnapshot.docs) {
      if (doc.data().username === username) {
        return false;
      }
    }
    return true;
  };

  // Date picker change handler
  const onChange = (event, selectedDate) => {
    const currentDate = selectedDate || date;
    setShowDatePicker(Platform.OS === 'ios');
    setDate(currentDate);
    setDateOfBirthFormatted(formatDate(currentDate));
  };

  const signUp = async () => {
    try {
      // Clear previous errors
      setErrorMessage("");
      
      // Validate form data
      if (!firstName.trim() || !lastName.trim()) {
        setErrorMessage("Please enter your name.");
        return;
      }
      
      if (!isValidUsername(userName)) {
        setErrorMessage("Please provide a valid username.");
        return;
      }
      
      if (!isValidEmail(emailAddress)) {
        setErrorMessage("Please provide a valid email.");
        return;
      }
      
      if (dateOfBirthFormatted === '') {
        setErrorMessage("Please select your date of birth.");
        return;
      }
      
      // Show loading indicator
      setLoading(true);
      
      // 1. Create the user account with Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        emailAddress, 
        password
      );
      
      const user = userCredential.user;
      
      // 2. Store additional user data in Firestore
      await setDoc(doc(db, "users", user.uid), {
        username: userName,
        first_name: firstName,
        last_name: lastName,
        email_address: emailAddress,
        date_of_birth: date,
        created_at: new Date()
      });
      
      console.log("User created successfully:", user.uid);
      
      // 3. Navigate to next screen
      navigation.reset({
        index: 0,
        routes: [{ 
          name: 'SelectArchetype', 
          params: { userId: user.uid }
        }],
      });
      
    } catch (error) {
      // Handle specific Firebase errors
      let errorMsg = "An error occurred during signup.";
      
      if (error.code === 'auth/email-already-in-use') {
        errorMsg = "This email is already in use.";
      } else if (error.code === 'auth/invalid-email') {
        errorMsg = "Please enter a valid email address.";
      } else if (error.code === 'auth/weak-password') {
        errorMsg = "Password should be at least 6 characters.";
      }
      
      console.error("Signup error:", error);
      setErrorMessage(errorMsg);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoContainer}>
            <Image
              style={styles.logo}
              source={require('../assets/iconDark.png')}
            />
          </View>
          
          <View style={styles.contentContainer}>
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#FFFFFF" />
              <Text style={styles.loadingText}>Creating your account...</Text>
            </View>
          )}
            <Text style={[styles.header, {fontWeight: 'bold'}]}>Create an Account</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <TextInput
                label="First Name"
                value={firstName}
                onChangeText={setFirstName}
                style={[styles.input, { flex: 1, marginRight: 10 }]}
                mode="outlined"
                theme={{ colors: { primary: 'white', text: 'white', underlineColor:'transparent', background: '#222222'}}}
                textColor='white'
              />
              <TextInput
                label="Last Name"
                value={lastName}
                onChangeText={setLastName}
                style={[styles.input, { flex: 1, marginLeft: 10 }]}
                mode="outlined"
                theme={{ colors: { primary: 'white', text: 'white', underlineColor:'transparent', background: '#222222'}}}
                textColor='white'
              />
            </View>
            <TextInput
              label="Username"
              value={userName}
              onChangeText={(text) => setUserName(text.toLowerCase())}
              onBlur={async () => {
                setIsUsernameValid(isValidUsername(userName));
                setIsUsernameAvailable(await isAvailableUsername(userName));
              }}
              style={[styles.input]}
              mode="outlined"
              theme={{ colors: { primary: 'white', text: 'white', underlineColor:'transparent', background: '#222222'}}}
              textColor='white'
              autoCapitalize='none'
              error={!isUsernameValid}
            />
            <TextInput
              label="Email Address"
              value={emailAddress}
              onChangeText={setEmailAddress}
              onBlur={() => setIsEmailValid(isValidEmail(emailAddress))}
              style={styles.input}
              mode="outlined"
              theme={{ colors: { primary: 'white', text: 'white', underlineColor:'transparent', background: '#222222'}}}
              autoCapitalize='none'
              textColor='white'
              error={!isEmailValid}
            />
            <TextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={styles.input}
              mode="outlined"
              theme={{ colors: { primary: 'white', text: 'white', underlineColor:'transparent', background: '#222222'}}}
              textColor='white'
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

            <Button 
              mode="contained" 
              onPress={signUp} 
              style={[styles.button, { backgroundColor: '#FFFFFF' }]} 
              labelStyle={{ color: '#000' }}>
              Sign Up
            </Button>
            <Text style={{ color: '#FF5555', textAlign: 'center', marginTop: 15, marginBottom: 20 }}>{errorMessage}</Text>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  logoContainer: {
    paddingTop: 20,
    alignItems: 'center',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    fontSize: 24,
    color: 'white',
    marginBottom: 20,
    textAlign: 'center',
    marginTop: 30
  },
  input: {
    marginBottom: 16,
    color: 'white',
    textColor: 'white',
  },
  button: {
    marginTop: 16,
  },
  logo: {
    width: 50,
    height: 50,
  },
  dobContainer: {
    borderWidth: 1,
    borderColor: 'white',
    borderRadius: 4,
    padding: 12,
    marginBottom: 16,
    backgroundColor: '#222222',
  },
  dobLabel: {
    color: '#AAAAAA',
    fontSize: 12,
    marginBottom: 4,
  },
  dobValue: {
    color: 'white',
    fontSize: 16,
  },
  pickerModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
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
  loadingOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: {
    color: 'white',
    marginTop: 10,
  }
});

export default SignUpScreen;