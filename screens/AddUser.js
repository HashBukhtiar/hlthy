import React, { useState } from 'react';
import { View, StyleSheet, Text, Image } from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import { Button, TextInput } from 'react-native-paper';
import { collection, addDoc } from "firebase/firestore"; 
import { db } from '../firebaseConfig';
import AntDesign from '@expo/vector-icons/AntDesign';

const data = [
  { label: 'Item 1', value: '1' },
  { label: 'Item 2', value: '2' },
  { label: 'Item 3', value: '3' },
  { label: 'Item 4', value: '4' },
  { label: 'Item 5', value: '5' },
  { label: 'Item 6', value: '6' },
  { label: 'Item 7', value: '7' },
  { label: 'Item 8', value: '8' },
];

const AddUserScreen = ({ navigation }) => {
  const [userName, setUserName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [date, setDate] = useState(new Date());
  const [show, setShow] = useState(true);
  const [value, setValue] = useState(null);
  const [isFocus, setIsFocus] = useState(false);

  const onChange = (event, selectedDate) => {
    const currentDate = selectedDate || date;
    setDate(currentDate);
  };

  const renderLabel = () => {
    if (value || isFocus) {
      return (
        <Text style={[styles.label, isFocus && { color: 'blue' }]}>
          Dropdown label
        </Text>
      );
    }
    return null;
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
        <Text style={[styles.header, {fontWeight: 'bold'}]}>Create an Account</Text>
        <TextInput
          label="Email Address"
          value={userName}
          onChangeText={setUserName}
          style={[styles.input]}
          mode="outlined"
          theme={{ colors: { primary: 'white', text: 'white', underlineColor:'transparent', background: '#222222'}}}
        />
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
        <TextInput
          label="Date of Birth (MM/DD/YYYY)"
          value={userName}
          onChangeText={setUserName}
          style={[styles.input]}
          mode="outlined"
          theme={{ colors: { primary: 'white', text: 'white', underlineColor:'transparent', background: '#222222'}}}
        />
        {renderLabel()}
        <Dropdown
          style={[styles.dropdown, isFocus && { borderColor: 'white' }]}
          placeholderStyle={styles.placeholderStyle}
          selectedTextStyle={styles.selectedTextStyle}
          inputSearchStyle={styles.inputSearchStyle}
          iconStyle={styles.iconStyle}
          data={data}
          search
          maxHeight={300}
          labelField="label"
          valueField="value"
          placeholder={!isFocus ? 'Select archetype' : '...'}
          searchPlaceholder="Search..."
          value={value}
          onFocus={() => setIsFocus(true)}
          onBlur={() => setIsFocus(false)}
          onChange={item => {
            setValue(item.value);
            setIsFocus(false);
          }}
          renderLeftIcon={() => (
            <AntDesign
              style={styles.icon}
              color={isFocus ? 'white' : 'grey'}
              name="Safety"
              size={20}
            />
          )}
        />
        <Button 
          mode="contained" 
          onPress={addUser} 
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
    width: 50,
    height: 50,
    alignSelf: 'center',
  },
  dropdown: {
    height: 50,
    borderColor: 'gray',
    borderWidth: 0.5,
    borderRadius: 8,
    paddingHorizontal: 14,
    backgroundColor: '#222222',
  },
});

export default AddUserScreen;