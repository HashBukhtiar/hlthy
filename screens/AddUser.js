import React, { useState } from 'react';
import { View, StyleSheet, Text, Image } from 'react-native';
import { Button, TextInput } from 'react-native-paper';
import { collection, addDoc } from "firebase/firestore"; 
import { db } from '../firebaseConfig';
import DateTimePicker from '@react-native-community/datetimepicker';

const AddUserScreen = ({ navigation }) => {
  const [userName, setUserName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [date, setDate] = useState(new Date());
  const [show, setShow] = useState(true);

  const onChange = (event, selectedDate) => {
    const currentDate = selectedDate || date;
    // setShow(Platform.OS === 'ios');
    setDate(currentDate);
  };

  const addUser = async () => {
    try {
      const docRef = await addDoc(collection(db, "users"), {
        username: userName,
        first_name: firstName,
        last_name: lastName,
      });
      console.log("Document written with ID: ", docRef.id);
      navigation.navigate('HomeFeed');
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
        <Text style={[styles.header, {fontWeight: 'bold'}]}>Sign Up</Text>
        <TextInput
          label="Username"
          value={userName}
          onChangeText={setUserName}
          style={[styles.input]}
          mode="outlined"
          theme={{ colors: { primary: 'white', text: 'white', underlineColor:'transparent', background: '#222222'}}}
        />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <TextInput
            label="First Name"
            value={firstName}
            onChangeText={setFirstName}
            style={[styles.input, { flex: 1, marginRight: 10 }]}
            mode="outlined"
            theme={{ colors: { primary: 'white', text: 'white', underlineColor:'transparent', background: '#222222'}}}
          />
          <TextInput
            label="Last Name"
            value={lastName}
            onChangeText={setLastName}
            style={[styles.input, { flex: 1, marginLeft: 10 }]}
            mode="outlined"
            theme={{ colors: { primary: 'white', text: 'white', underlineColor:'transparent', background: '#222222'}}}
          />
        </View>
        <Button 
          mode="contained" 
          onPress={addUser} 
          style={[styles.button, { backgroundColor: '#FFFFFF' }]} 
          labelStyle={{ color: '#000' }}>
          Add User
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
    marginTop: 60
  },
  input: {
    marginBottom: 16,
    color: 'white'
  },
  button: {
    marginTop: 16,
  },
  logo: {
    width: 100,
    height: 100,
    alignSelf: 'center',
  },
});

export default AddUserScreen;