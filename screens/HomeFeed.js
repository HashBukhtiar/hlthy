import { StatusBar } from 'expo-status-bar';
import { StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  Image, 
  TouchableOpacity, 
  TextInput } from 'react-native';
import globalStyles from '../styles/globalStyles';
import React, { useState } from 'react';
import { 
  icon, 
  milestonesIcon, 
  activityIcon, 
  homeIcon, 
  exploreIcon,
  workoutsIcon, 
  profileIcon,
} from '../assets/images';

export default function HomeFeed( {navigation} ) {
  const [searchText, setSearchText] = useState('');
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
        {/*
        <TextInput
          style={styles.searchBar}
          placeholder="Search"
          placeholderTextColor={"white"}
          color={"white"}
          value={searchText}
          onChangeText={setSearchText}
        />
        {/*<TouchableOpacity onPress={clearSearch}>
          <Text style={{color: 'white'}}>X</Text>
        </TouchableOpacity>*/}
        <Text style={globalStyles.title}>hlthy</Text>
        <View>
          <TouchableOpacity onPress={() => {navigation.navigate('Activity')}}>
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
        <Image source={homeIcon} style={{ width: 40, height: 40, borderRadius:5 }} />
      </TouchableOpacity>
      <TouchableOpacity style={globalStyles.button} onPress={() => {console.log("Explore pressed")}}>
        <Image source={exploreIcon} style={{ width: 40, height: 40, borderRadius:5 }} />
      </TouchableOpacity>
      <TouchableOpacity 
        onPress={() => {console.log("POST pressed")}}
        style={globalStyles.postButton}>
          <Text style={{color: 'white', fontSize:40}}>+</Text>
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