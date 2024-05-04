import React, { useState } from 'react';
import { View, StyleSheet, Text, Image } from 'react-native';
import { Button, TextInput } from 'react-native-paper';
import { collection, addDoc } from "firebase/firestore"; 
import { db } from '../firebaseConfig';

const SignUpScreen = ({ navigation }) => {
  const [userName, setUserName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [isUsernameValid, setIsUsernameValid] = useState(true);
  const [isEmailValid, setIsEmailValid] = useState(true);
  const [isDOBValid, setIsDOBValid] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Check if the email is valid
  const isValidEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  // Check if the DOB is valid
  const isValidDOB = (dob) => {
    const re = /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/(19|20)\d{2}$/;
    return re.test(dob);
  };

  // Check if username is taken
  const isValidUsername = (username) => {
    // WIP
    return true;
  };
  
  const signUp = async () => {
    // Check if info is valid. If not, set error message and return null.
    if (!isValidEmail(emailAddress) || !isValidDOB(dateOfBirth) || !isValidUsername(username)) {
      console.log("User signed up, but has invalid info.");
      if (!isValidUsername) {
        setErrorMessage("That username is taken. Please try another one.");
      } else if (!isValidEmail(emailAddress)) {
        setErrorMessage("Please provide a valid email.");
      } else if (!isValidDOB(dateOfBirth)) {
        setErrorMessage("Please provide a valid date of birth.");
      }
      return;
    }

    try {
      const docRef = await addDoc(collection(db, "users"), {
        username: userName,
        first_name: firstName,
        last_name: lastName,
        email_address: emailAddress,
        date_of_birth: dateOfBirth,
      });
      console.log("Document written with ID: ", docRef.id);
      navigation.reset({
        index: 0,
        routes: [{ name: 'SelectArchetype' }],
      });
    } catch (e) {
      console.error("Error adding document: ", e);
    }
  };
  
  return (
    <View style={styles.container}>
    <View style={styles.container}>
    <Image
    style={styles.logo}
    source={require('../assets/iconDark.png')}
    />
    </View>
    <View style={styles.contentContainer}>
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
      onChangeText={setUserName}
      onBlur={() => setIsUsernameValid(isValidUsername(userName))}
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
      label="Date of Birth (MM/DD/YYYY)"
      value={dateOfBirth}
      onChangeText={setDateOfBirth}
      onBlur={() => setIsDOBValid(isValidDOB(dateOfBirth))}
      style={[styles.input]}
      mode="outlined"
      theme={{ colors: { primary: 'white', text: 'white', underlineColor:'transparent', background: '#222222'}}}
      textColor='white'
      autoCapitalize='none'
      error={!isDOBValid}
    />
    <Button 
      mode="contained" 
      onPress={signUp} 
      style={[styles.button, { backgroundColor: '#FFFFFF' }]} 
      labelStyle={{ color: '#000' }}>
      Sign Up
    </Button>
    <Text style={{ color: '#FF5555', textAlign: 'center', marginTop: 15 }}>{errorMessage}</Text>
    </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 0,
    backgroundColor: '#000000',
  },
  logoContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 3,
    padding: 16
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
    alignSelf: 'center',
  },

});

export default SignUpScreen;