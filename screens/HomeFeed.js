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
    <View style={styles.container}>
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
        <View style={styles.postButtonView}>
          <TouchableOpacity onPress={() => {navigation.navigate('Activity')}}>
            <Image source={activityIcon} style={{ width: 40, height: 40, borderRadius:5 }} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }
    
  function renderBottomButtons() {
    return (
      <View style={styles.bottomButtonContainer}>
        <TouchableOpacity style={styles.button} onPress={() => {console.log("HomeFeed pressed")}}>
          <Image source={homeIcon} style={{ width: 40, height: 40, borderRadius:5 }} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => {console.log("Explore pressed")}}>
          <Image source={exploreIcon} style={{ width: 40, height: 40, borderRadius:5 }} />
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => {console.log("POST pressed")}}
          style={styles.postButton}>
            <Text style={{color: 'white', fontSize:40}}>+</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => {console.log("Workouts pressed")}}>
          <Image source={workoutsIcon} style={{ width: 40, height: 40, borderRadius:5 }} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => {console.log("Profile pressed")}}>
          <Image source={profileIcon} style={{ width: 40, height: 40, borderRadius:5 }} />
        </TouchableOpacity>
      </View>
    );
  }

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'space-between',
  },
  postsContainer: {
    flex: 1,
    borderWidth: 1, 
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 5,
    marginTop: 5
  },
  button: {
    padding: 10,
    borderRadius: 5,
  },
  buttonText: {
    color: 'white',
  },
  topBar: {
    flexDirection: 'row',
    marginBottom: 5,
    justifyContent: 'space-between',
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
  postButton: {
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    backgroundColor: 'pink', 
    justifyContent: 'center', 
    alignItems: 'center',
    paddingBottom: 5,
    marginTop: 5
  }
});