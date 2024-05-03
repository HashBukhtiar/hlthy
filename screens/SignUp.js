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

  const onChange = (event, selectedDate) => {
    const currentDate = selectedDate || date;
    setDate(currentDate);
  };

  const signUp = async () => {
    try {
      const docRef = await addDoc(collection(db, "users"), {
        username: userName,
        first_name: firstName,
        last_name: lastName,
        email_address: emailAddress,

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
          style={[styles.input]}
          mode="outlined"
          theme={{ colors: { primary: 'white', text: 'white', underlineColor:'transparent', background: '#222222'}}}
          textColor='white'
        />
        <TextInput
          label="Email Address"
          value={emailAddress}
          onChangeText={setEmailAddress}
          style={[styles.input]}
          mode="outlined"
          theme={{ colors: { primary: 'white', text: 'white', underlineColor:'transparent', background: '#222222'}}}
          textColor='white'
        />
        <TextInput
          label="Date of Birth (MM/DD/YYYY)"
          value={dateOfBirth}
          onChangeText={setDateOfBirth}
          style={[styles.input]}
          mode="outlined"
          theme={{ colors: { primary: 'white', text: 'white', underlineColor:'transparent', background: '#222222'}}}
          textColor='white'
        />
        <Button 
          mode="contained" 
          onPress={signUp} 
          style={[styles.button, { backgroundColor: '#FFFFFF' }]} 
          labelStyle={{ color: '#000' }}>
          Sign Up
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // justifyContent: 'center',
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
  }
});

export default SignUpScreen;