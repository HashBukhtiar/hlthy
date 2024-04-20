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
import { icon, milestonesIcon } from '../assets/images';

export default function HomeFeed() {
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
        <TouchableOpacity onPress={() => {console.log("Milestones pressed")}}>
          <Image source={milestonesIcon} style={{ width: 40, height: 40, borderRadius:5 }} />
        </TouchableOpacity>
        <View style={styles.postButtonView}>
          <TouchableOpacity onPress={() => {console.log("POST pressed")}}>
            <Text style={{color: 'black', padding:4}}>+ POST</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
    
  function renderBottomButtons() {
    return (
      <View style={styles.bottomButtonContainer}>
        <TouchableOpacity style={styles.button} onPress={() => {console.log("HomeFeed pressed")}}>
          <Text style={styles.buttonText}>HomeFeed</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => {console.log("Workouts pressed")}}>
          <Text style={styles.buttonText}>Workouts</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => {console.log("Profile pressed")}}>
          <Text style={styles.buttonText}>Profile</Text>
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
    marginBottom: 10,
  },
  button: {
    borderWidth: 1,
    borderColor: 'white',
    padding: 10,
    borderRadius: 5,
  },
  buttonText: {
    color: 'white',
  },
  topBar: {
    flexDirection: 'row',
    marginBottom: 5
  },
  searchBar: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    paddingLeft: 10,
    borderRadius: 10,
    flex: 1,
    marginRight: 5,
    marginLeft: 5
  },
  postButtonView: {
    alignItems: 'center', 
    borderWidth: 2, 
    borderRadius: 5, 
    borderColor: 'pink',
    backgroundColor: 'pink', 
    padding: 5, 
    marginLeft:5
  }
});