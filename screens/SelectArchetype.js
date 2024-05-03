import React, { useState } from 'react';
import { View, StyleSheet, Text, Image } from 'react-native';
import { SelectCountry } from 'react-native-element-dropdown';
import { Button } from 'react-native-paper';
import { collection, addDoc } from "firebase/firestore"; 
import { db } from '../firebaseConfig';

// documentation: https://github.com/hoaphantn7604/react-native-element-dropdown

const archetypes = [
    { label: '  Athlete', value: 'athlete', image: require('../assets/athleteIcon.png') },
    { label: '  Bodybuilder', value: 'bodybuilder', image: require('../assets/bodybuilderIcon.png') },
    { label: '  Crossfitter', value: 'crossfitter', image: require('../assets/crossfitterIcon.png') },
    { label: '  Generalist', value: 'generalist', image: require('../assets/generalistIcon.png') },
    { label: '  Powerlifter', value: 'powerlifter', image: require('../assets/powerlifterIcon.png') },
];

const SelectArchetypeScreen = ({ navigation }) => {
  const [value, setValue] = useState(null);
  const [isFocus, setIsFocus] = useState(false);

  const selectArchetype = async () => {
    try {
      const docRef = await addDoc(collection(db, "users"), {
        archetype: value,
      });
      console.log("Document written with ID: ", docRef.id);
      navigation.reset({
        index: 0,
        routes: [{ name: 'HomeFeed' }],
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
        <Text style={[styles.header, {fontWeight: 'bold'}]}>Select an Archetype</Text>
        <SelectCountry
          style={[styles.dropdown, isFocus && { borderColor: 'white' }]}
          placeholderStyle={styles.placeholderStyle}
          selectedTextStyle={styles.selectedTextStyle}
          imageStype={styles.imageStyle}
          inputSearchStyle={styles.inputSearchStyle}
          iconStyle={styles.iconStyle}
          data={archetypes}
        //   search
          maxHeight={200}
          labelField="label"
          valueField="value"
          imageField="image"
          placeholder={!isFocus ? 'Select archetype' : '...'}
          searchPlaceholder="Search..."
          value={value}
          onFocus={() => setIsFocus(true)}
          onBlur={() => setIsFocus(false)}
          onChange={item => {
            setValue(item.value);
            setIsFocus(false);
          }}
          containerStyle={styles.containerStyle}
          itemContainerStyle={styles.itemContainerStyle}
          activeColor = '#404040'
        />
        <Button 
          mode="contained" 
          onPress={selectArchetype} 
          style={[styles.button, { backgroundColor: '#FFFFFF' }]} 
          labelStyle={{ color: '#000' }}>
          Continue
        </Button>
        <Text style={styles.note}>
            Note: You can change your archetype at any time.
        </Text>
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
    marginTop: 95
  },
  button: {
    marginTop: 20,
  },
  logo: {
    width: 50,
    height: 50,
    alignSelf: 'center',
  },
  dropdown: {
    height: 50,
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    backgroundColor: '#292929',
  },
  note: {
    color: 'grey',
    marginTop: 20,
    marginBottom: 20,
    textAlign: 'center',
  },
    placeholderStyle: {
        color: 'grey',
    },
    selectedTextStyle: {
        color: '#BBBBBB',
    },
    itemContainerStyle: {
        backgroundColor: 'transparent',
    },
    containerStyle: {
        backgroundColor: '#292929',
        borderColor: 'transparent'
    },
});

export default SelectArchetypeScreen;