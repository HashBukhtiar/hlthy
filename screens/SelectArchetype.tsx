import React, { useState } from 'react';
import { View, StyleSheet, Text, Image, TouchableOpacity } from 'react-native';
import { SelectCountry } from 'react-native-element-dropdown';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { collection, updateDoc, doc } from "firebase/firestore"; 
import { db } from '@/firebaseConfig';
import globalStyles from '@/styles/globalStyles';

// Type definitions
interface Archetype {
  label: string;
  value: string;
  image: any;
}

// Mock images - you'll need to add these to your assets folder
const archetypes: Archetype[] = [
  { label: '  Athlete', value: 'athlete', image: require('@/assets/images/athlete.png') },
  { label: '  Bodybuilder', value: 'bodybuilder', image: require('@/assets/images/bodybuilder.png') },
  { label: '  Crossfitter', value: 'crossfitter', image: require('@/assets/images/crossfitter.png') },
  { label: '  Generalist', value: 'generalist', image: require('@/assets/images/generalist.png') },
  { label: '  Powerlifter', value: 'powerlifter', image: require('@/assets/images/powerlifter.png') },
];

export default function SelectArchetype() {
  const router = useRouter();
  const params = useLocalSearchParams<{ userId: string }>();
  const userId = params.userId;
  
  const [value, setValue] = useState<string | null>(null);
  const [isFocus, setIsFocus] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const selectArchetype = async () => {
    if (value === null) {
      console.log("User continued without selecting archetype.");
      setErrorMessage("Please select an archetype.");
      return;
    }
  
    if (!userId) {
      console.error("No userId provided");
      setErrorMessage("Authentication error. Please try again.");
      return;
    }

    try {
      const userDoc = doc(db, "users", userId);
      await updateDoc(userDoc, {
        archetype: value,
      });
      console.log("User document updated, ID: ", userId, " Archetype: ", value);
      
      // Navigate directly to the tabs route instead of the root
      router.replace('/(tabs)/');
    } catch (e) {
      console.error("Error updating document: ", e);
      setErrorMessage("Failed to update profile. Please try again.");
    }
  };

  return (
    <View style={[globalStyles.container, styles.container]}>
      <View style={styles.logoContainer}>
        <Image
          style={styles.logo}
          source={require('@/assets/images/icon.png')}
        />
      </View>
      <View style={styles.contentContainer}>
        <Text style={[styles.header, { fontWeight: 'bold' }]}>Select an Archetype</Text>
        <SelectCountry
          style={[styles.dropdown, isFocus && { borderColor: 'white' }]}
          placeholderStyle={styles.placeholderStyle}
          selectedTextStyle={styles.selectedTextStyle}
          inputSearchStyle={styles.inputSearchStyle}
          iconStyle={styles.iconStyle}
          data={archetypes}
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
          activeColor="#404040"
        />
        <TouchableOpacity 
          onPress={selectArchetype} 
          style={styles.button}
        >
          <Text style={styles.buttonText}>Continue</Text>
        </TouchableOpacity>
        <Text style={styles.note}>
          Note: You can change your archetype at any time.
        </Text>
        <Text style={{ color: '#FF5555', textAlign: 'center', marginTop: 0 }}>{errorMessage}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 0,
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
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 4,
    alignItems: 'center',
  },
  buttonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
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
  inputSearchStyle: {
    color: 'white',
    height: 40,
  },
  iconStyle: {
    width: 20,
    height: 20,
  },
  imageStyle: {
    width: 24,
    height: 24,
  },
  itemContainerStyle: {
    backgroundColor: 'transparent',
  },
  containerStyle: {
    backgroundColor: '#292929',
    borderColor: 'transparent'
  },
});