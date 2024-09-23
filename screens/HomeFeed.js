import { StatusBar } from 'expo-status-bar';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  Image, 
  TouchableOpacity
  } from 'react-native';
import globalStyles from '../styles/globalStyles';
import React from 'react';
import { 
  icon, 
  activityIcon, 
} from '../assets/images';

export default function HomeFeed( {navigation} ) {
  return (
    <View style={globalStyles.container}>
      <View>
        {renderTopBar()}
      </View>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.postsContainer}>
        <Text style={{color:'white'}}>Posts will go here</Text>
      </ScrollView>
    </View>
  );
    
  function renderTopBar() {
    return (
      <View style={styles.topBar}>
        <Image source={icon} style={{ width: 40, height: 40, borderRadius:5 }} />
        <Text style={globalStyles.title}>hlthy</Text>
        <View>
          <TouchableOpacity activeOpacity={1} onPress={() => {navigation.navigate('Pulse')}}>
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