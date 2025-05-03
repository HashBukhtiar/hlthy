import React from 'react';
import { View, TouchableOpacity, Image, Text, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import globalStyles from '@/styles/globalStyles';
import {
//   homeIcon,
//   aiIcon,
  workoutsIcon,
//   profileIcon,
} from '@/assets/images';

export default function BottomButtons() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  return (
    <View 
      style={[
        globalStyles.bottomButtonContainer, 
        { 
          backgroundColor: 'black',
          paddingBottom: Math.max(insets.bottom, 10),
          height: globalStyles.bottomButtonContainer.height + insets.bottom
        }
      ]}
    >
      <TouchableOpacity 
        style={globalStyles.button} 
        onPress={() => {
          console.log("HomeFeed pressed"); 
          router.push('/');
        }}
      >
        <Ionicons name="home" size={28} color="white" />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={globalStyles.button} 
        onPress={() => {
          console.log("AI pressed");
          router.push('/ai');
        }}
      >
        <Ionicons name="chatbubbles" size={28} color="white" />
      </TouchableOpacity>
      
      <TouchableOpacity 
        onPress={() => {
          console.log("POST menu pressed");
          router.push('/post');
        }}
        style={globalStyles.postButton}
      >
        {/* <Ionicons name="add-circle" size={50} color="#ff2d55" /> */}
        <Ionicons name="add-circle" size={40} color="white" />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={globalStyles.button} 
        onPress={() => {
          console.log("Workouts pressed");
          router.push('/workouts');
        }}
      >
        {/* make workout icon colour white */}
        {/* <Image source={workoutsIcon} style={{ width: 28, height: 28, tintColor: 'white' }} /> */}
        <Ionicons name="flame" size={28} color="white" />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={globalStyles.button} 
        onPress={() => {
          console.log("Profile pressed");
          router.push('/profile');
        }}
      >
        <Ionicons name="person" size={28} color="white" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  plusText: {
    color: 'white', 
    fontSize: 35
  }
});