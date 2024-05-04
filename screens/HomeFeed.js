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
import { ImageBackground } from 'react-native';
import { BottomButtons } from '../App';

import { 
  icon,
  bottomBarGradient, 
  milestonesIcon, 
  activityIcon, 
  homeFeedIcon, 
  exploreIcon,
  workoutsIcon, 
  profileIcon,
  postButtonIcon,
  exploreIconGradient,
  homeFeedIconGradient,
  workoutsIconGradient,
  profileIconGradient,
  barGradient,
  postImage,
} from '../assets/images';
import * as Font from 'expo-font';


export default function HomeFeed( {navigation} ) {
  const [searchText, setSearchText] = useState('');
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [selectedTab, setSelectedTab] = useState('HomeFeed');
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
      <Image source={postImage} style={{ position: 'absolute', top: 47, bottom: 0, left: 0, right: 0 }} />
      <View>
        {renderTopBar()}
      </View>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.postsContainer}>
      </ScrollView>
      <View>
        <BottomButtons />
      </View>
    </View>
  );

  function clearSearch() { // Clear search function, no button added for this yet
    setSearchText('');
  }
    
  function renderTopBar() {
    return (
      <View style={styles.topBar}>
        <Image source={barGradient} style={{ width: '100%', position: 'absolute', top: -285 }}/>
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
const styles = StyleSheet.create({
  postsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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