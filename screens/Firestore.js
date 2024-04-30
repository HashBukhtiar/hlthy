import React, { useState } from 'react';
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
    <>
      <TextInput
        label="First Name"
        value={firstName}
        onChangeText={setFirstName}
      />
      <TextInput
        label="Last Name"
        value={lastName}
        onChangeText={setLastName}
      />
      <Button onPress={addUser}>
        Add User
      </Button>
    </>
  );
};

export default AddUserScreen;