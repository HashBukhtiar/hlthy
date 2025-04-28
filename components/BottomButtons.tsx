import React from 'react';
import { View, TouchableOpacity, Image, Text, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import globalStyles from '@/styles/globalStyles';
import { 
  homeIcon, 
  workoutsIcon, 
  profileIcon,
  AIIcon,
} from '@/assets/images';

export default function BottomButtons() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <View style={[globalStyles.bottomButtonContainer, {backgroundColor: 'black'}]}>
      <TouchableOpacity 
        style={globalStyles.button} 
        onPress={() => {
          console.log("HomeFeed pressed"); 
          router.push('/');
        }}
      >
        <Image source={homeIcon} style={styles.buttonIcon} />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={globalStyles.button} 
        onPress={() => {
          console.log("AI pressed");
          router.push('/ai');
        }}
      >
        <Image source={AIIcon} style={styles.buttonIcon} />
      </TouchableOpacity>
      
      <TouchableOpacity 
        onPress={() => {
          console.log("POST pressed");
          router.push('/post');
        }}
        style={globalStyles.postButton}
      >
        <Text style={styles.plusText}>+</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={globalStyles.button} 
        onPress={() => {
          console.log("Workouts pressed");
          router.push('/workouts');
        }}
      >
        <Image source={workoutsIcon} style={styles.buttonIcon} />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={globalStyles.button} 
        onPress={() => {
          console.log("Profile pressed");
          router.push('/profile');
        }}
      >
        <Image source={profileIcon} style={styles.buttonIcon} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  buttonIcon: {
    width: 40, 
    height: 40, 
    borderRadius: 5
  },
  plusText: {
    color: 'white', 
    fontSize: 40
  }
});