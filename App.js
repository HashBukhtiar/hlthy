import React, { useState } from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import HomeFeed from './screens/HomeFeed';
import Activity from './screens/Activity';
import { BottomButtons } from './components/BottomButtons';
import { Text, 
  ScrollView, 
  Image, 
  TouchableOpacity, 
  TextInput } from 'react-native';
import globalStyles from './styles/globalStyles';
import { bottomBarGradient, homeFeedIconGradient, homeFeedIcon, exploreIconGradient, exploreIcon, postButtonIcon, workoutsIconGradient, workoutsIcon, profileIconGradient, profileIcon } from './assets/images';

const Stack = createStackNavigator();

export default function App() {
  return (
    <SafeAreaView style={appStyles.safeArea}>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="HomeFeed">
          <Stack.Screen 
            name="HomeFeed"
            component={HomeFeed} 
            options={{headerShown: false}}
          />
          <Stack.Screen
            name="Activity"
            component={Activity}
            options={{headerShown: false}}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaView>
  );
}



const appStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'black',
  },
});
