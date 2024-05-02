import React, { useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Button, TextInput } from 'react-native-paper';
import { collection, addDoc } from "firebase/firestore"; 
import { db } from '../firebaseConfig';

const AddUserScreen = ({ navigation }) => {
  const [userName, setUserName] = useState('');
  const [fullName, setFullName] = useState('');

  const addUser = async () => {
    try {
      const docRef = await addDoc(collection(db, "users"), {
        username: userName,
        full_name: fullName,
      });
      console.log("Document written with ID: ", docRef.id);
      navigation.navigate('HomeFeed');
    } catch (e) {
      console.error("Error adding document: ", e);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.header, {fontWeight: 'bold'}]}>Add User to Database</Text>
      <TextInput
        label="Username"
        value={userName}
        onChangeText={setUserName}
        style={[styles.input]}
        mode="outlined"
        theme={{ colors: { primary: 'white', text: 'white', underlineColor:'transparent', background: '#222222'}}}
      />
      <TextInput
        label="Full Name"
        value={fullName}
        onChangeText={setFullName}
        style={[styles.input]}
        mode="outlined"
        theme={{ colors: { primary: 'white', text: 'white', underlineColor:'transparent', background: '#222222'}}}
      />
      <Button 
        mode="contained" 
        onPress={addUser} 
        style={[styles.button, { backgroundColor: '#FFFFFF' }]} 
        labelStyle={{ color: '#000' }}>
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