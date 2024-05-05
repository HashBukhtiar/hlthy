import React from 'react';
import { SafeAreaView, StyleSheet, View, TouchableOpacity, Image, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import HomeFeed from './screens/HomeFeed';
import Activity from './screens/Activity';
import SignUp from './screens/SignUp';
import SelectArchetype from './screens/SelectArchetype';
import Workouts from './screens/Workouts';
import { 
  homeIcon, 
  exploreIcon,
  workoutsIcon, 
  profileIcon,
} from './assets/images';
import globalStyles from './styles/globalStyles';

const Stack = createStackNavigator();

export default function App() {
  return (
    <SafeAreaView style={appStyles.safeArea}>
      <NavigationContainer>
        <MainComponent />
      </NavigationContainer>
    </SafeAreaView>
  );  
}

function MainComponent() {
  function BottomButtons({ route }) {  
    if (route.name === 'SignUp' || route.name === 'SelectArchetype') {
      return null;
    }

    return (
      <View style={globalStyles.bottomButtonContainer}>
        <TouchableOpacity style={globalStyles.button} onPress={() => {
            console.log("HomeFeed pressed"); 
            navigation.navigate('HomeFeed')
          }}>
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
        <TouchableOpacity style={globalStyles.button} onPress={() => {
          console.log("Workouts pressed");
          navigation.navigate('Workouts')
          }}>
          <Image source={workoutsIcon} style={{ width: 40, height: 40, borderRadius:5 }} />
        </TouchableOpacity>
        <TouchableOpacity style={globalStyles.button} onPress={() => {console.log("Profile pressed")}}>
          <Image source={profileIcon} style={{ width: 40, height: 40, borderRadius:5 }} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
  <Stack.Navigator initialRouteName="SignUp">
    <Stack.Screen name="SignUp" component={SignUp} options={{headerShown: false}} />
    <Stack.Screen name="SelectArchetype" component={SelectArchetype} options={{headerShown: false}} />
    <Stack.Screen name="HomeFeed" options={{headerShown: false}}>
      {props => <HomeFeed {...props} BottomButtons={BottomButtons} />}
    </Stack.Screen>
    <Stack.Screen name="Activity" options={{headerShown: false}}>
      {props => <Activity {...props} BottomButtons={BottomButtons} />}
    </Stack.Screen>
    <Stack.Screen name="Workouts" options={{headerShown: false, animationEnabled: false}}>
      {props => <Workouts {...props} BottomButtons={BottomButtons} />}
    </Stack.Screen>
  </Stack.Navigator>
);
}

const appStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'black',
  },
});