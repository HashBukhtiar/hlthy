import React, { useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Button, TextInput } from 'react-native-paper';
import { collection, addDoc } from "firebase/firestore"; 
import { db } from '../firebaseConfig';

const AddUserScreen = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const addUser = async () => {
    try {
      const docRef = await addDoc(collection(db, "users"), {
        first: firstName,
        last: lastName,
      });
      console.log("Document written with ID: ", docRef.id);
    } catch (e) {
      console.error("Error adding document: ", e);
    }
  };

  return (
    <View style={styles.container}>
    <Text style={[styles.header, {fontWeight: 'bold'}]}>Add Item to Database</Text>
      <TextInput
        label="First Name"
        value={firstName}
        onChangeText={setFirstName}
        style={styles.input}
        mode="outlined"
        theme={{ colors: { primary: 'white', underlineColor:'transparent', background: '#222222'}}}
      />
      <TextInput
        label="Last Name"
        value={lastName}
        onChangeText={setLastName}
        style={styles.input}
        mode="outlined"
        theme={{ colors: { primary: 'white', underlineColor:'transparent', background: '#222222'}}}
      />
      <Button mode="contained" onPress={addUser} style={[styles.button, { backgroundColor: '#FFFFFF' }]} labelStyle={{ color: '#000' }}>
        Add User
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#000',
  },
  header: {
    fontSize: 24,
    color: 'white',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    marginBottom: 16,
    color: 'white'
  },
  button: {
    marginTop: 16,
  },
});

export default AddUserScreen;