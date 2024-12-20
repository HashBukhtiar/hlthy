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
  exploreIcon,
} from '../assets/images';

export default function HomeFeed({ navigation }) {
  return (
    <View style={globalStyles.container}>
      <View>
        {renderTopBar()}
      </View>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.postsContainer}>
        <Text style={{ color: 'white' }}>Posts will go here</Text>
      </ScrollView>
    </View>
  );
    
  function renderTopBar() {
    return (
      <View style={styles.topBar}>
        <Image source={icon} style={styles.icon} />
        <Text style={globalStyles.title}>hlthy</Text>
        <View style={styles.buttonContainer}>
          {/* Explore Button */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Explore')}
            style={styles.button}
          >
            <Image source={exploreIcon} style={styles.buttonIcon} />
          </TouchableOpacity>
          
          {/* Pulse Button */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Pulse')}
            style={styles.button}
          >
            <Image source={activityIcon} style={styles.buttonIcon} />
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
    alignItems: 'center',
    borderBottomColor: 'red',
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: 'black',
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 5,
  },
  buttonContainer: {
    flexDirection: 'row',
  },
  button: {
    marginLeft: 15,
  },
  buttonIcon: {
    width: 40,
    height: 40,
    borderRadius: 5,
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