import { StatusBar } from 'expo-status-bar';
import { StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  Image, 
  TouchableOpacity, 
  TextInput } from 'react-native';
import globalStyles from '../styles/globalStyles';
import React, { useState, useEffect } from 'react';

import { 
  icon, 
  milestonesIcon, 
  activityIcon, 
  homeFeedIcon, 
  exploreIcon,
  workoutsIcon, 
  profileIcon,
  postButtonIcon,
} from '../assets/images';
import * as Font from 'expo-font';


export default function HomeFeed( {navigation} ) {
  const [searchText, setSearchText] = useState('');
  const [fontsLoaded, setFontsLoaded] = useState(false);
  useEffect(() => {
    async function loadFonts() {
      await Font.loadAsync({
        'comfortaa': require('../assets/Comfortaa-Bold.ttf'),
      });
      setFontsLoaded(true);
    }
    loadFonts();
  }, []);

  if (!fontsLoaded){
    return null;
  }
  return (
    <View style={globalStyles.container}>
      <View>
        {renderTopBar()}
      </View>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.postsContainer}>
        <Text style={{color:'white'}}>Posts will go here</Text>
      </ScrollView>
      <View>
        {renderBottomButtons()}
      </View>
    </View>
  );

  function clearSearch() { // Clear search function, no button added for this yet
    setSearchText('');
  }
    
  function renderTopBar() {
    return (
      <View style={styles.topBar}>
        <Image source={icon} style={{ width: 40, height: 40, borderRadius:5 }} />
        <Text style={[globalStyles.title, { fontFamily: 'comfortaa' }]}>hlthy</Text>
        <View>
          <TouchableOpacity activeOpacity={1} onPress={() => {navigation.navigate('Activity')}}>
            <Image source={activityIcon} style={{ width: 40, height: 40, borderRadius:5 }} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }
}

export function renderBottomButtons() {
  return (
    <View style={globalStyles.bottomButtonContainer}>
      <TouchableOpacity style={globalStyles.button} onPress={() => {console.log("HomeFeed pressed")}}>
        <Image source={homeFeedIcon} style={{ width: 40, height: 40, borderRadius:5 }} />
      </TouchableOpacity>
      <TouchableOpacity style={globalStyles.button} onPress={() => {console.log("Explore pressed")}}>
        <Image source={exploreIcon} style={{ width: 40, height: 40, borderRadius:5 }} />
      </TouchableOpacity>
        <TouchableOpacity style={globalStyles.button} onPress={() => {console.log("Post Button pressed")}}>
        <Image source={postButtonIcon} style={{ width: 40, height: 40, borderRadius:5 }} />
      </TouchableOpacity>
      <TouchableOpacity style={globalStyles.button} onPress={() => {console.log("Workouts pressed")}}>
        <Image source={workoutsIcon} style={{ width: 40, height: 40, borderRadius:5 }} />
      </TouchableOpacity>
      <TouchableOpacity style={globalStyles.button} onPress={() => {console.log("Profile pressed")}}>
        <Image source={profileIcon} style={{ width: 40, height: 40, borderRadius:5 }} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  postsContainer: {
    flex: 1,
    borderWidth: 1, 
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomColor: 'red',
    borderWidth: 1,
  },
  searchBar: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    paddingLeft: 10,
    borderRadius: 10,
    flex: 1,
    marginLeft: 5
  },
});