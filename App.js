import React from 'react';
import { SafeAreaView, StyleSheet, View, TouchableOpacity, Image, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import HomeFeed from './screens/HomeFeed';
import Activity from './screens/Activity';
import Workouts from './screens/Workouts';
import SignUp from './screens/SignUp';
import SelectArchetype from './screens/SelectArchetype';
import { useNavigation } from '@react-navigation/native';
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
        <BottomButtons />
      </NavigationContainer>
    </SafeAreaView>
  );

  function BottomButtons() {  
    // If a screen has to have this hidden, then use the route of the screen to conditinoally return null, or render the bottom buttons
    const navigation = useNavigation();
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
  
}

const appStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'black',
  },
});