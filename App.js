import React from 'react';
import { SafeAreaView, StyleSheet, View, TouchableOpacity, Image, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import HomeFeed from './screens/HomeFeed';
import Pulse from './screens/Pulse';
import Explore from './screens/Explore';
import Post from './screens/Post';
import Workouts from './screens/Workouts';
import SignUp from './screens/SignUp';
import SelectArchetype from './screens/SelectArchetype';
import CreateWorkout from './screens/CreateWorkout';
import ViewWorkout from './screens/ViewWorkout';
import AI from './screens/AI';
import WorkoutPlan from './screens/WorkoutPlan';
import DietPlan from './screens/DietPlan';
import Profile from './screens/Profile';
import Settings from './screens/Settings';
import ViewPost from './screens/ViewPost';
import { useNavigation } from '@react-navigation/native';
import { 
  homeIcon, 
  workoutsIcon, 
  profileIcon,
  AIIcon,
} from './assets/images';
import globalStyles from './styles/globalStyles';

const Stack = createStackNavigator();

export default function App() {
  return (
    <SafeAreaView style={appStyles.safeArea}>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="HomeFeed"> 
        {/* <Stack.Navigator initialRouteName="SignUp"> TEMPORARY BACKDOOR PASS */}
          <Stack.Screen name="SignUp" options={{headerShown: false, animationEnabled: false}}>
            {props => <SignUp {...props} />}
          </Stack.Screen>
          <Stack.Screen name="SelectArchetype" options={{headerShown: false, animationEnabled: false}}>
            {props => <SelectArchetype {...props} />}
          </Stack.Screen>
          <Stack.Screen name="HomeFeed" options={{headerShown: false, animationEnabled: false}}>
            {props => <><HomeFeed {...props} /><BottomButtons /></>}
          </Stack.Screen>
          <Stack.Screen name="Pulse" options={{headerShown: false}}>
            {props => <Pulse {...props} />}
          </Stack.Screen>
          <Stack.Screen name="Explore" options={{headerShown: false, animationEnabled: false}}>
            {props => <><Explore {...props} /><BottomButtons /></>}
          </Stack.Screen>
          <Stack.Screen name="Post" options={{headerShown: false, animationEnabled: false}}>
            {props => <><Post {...props} /><BottomButtons /></>}
          </Stack.Screen>
          <Stack.Screen name="AI" options={{headerShown: false, animationEnabled: false}}>
            {props => <><AI {...props} /><BottomButtons /></>}
          </Stack.Screen>
          <Stack.Screen name="WorkoutPlan" options={{headerShown: false, animationEnabled: false}}>
            {props => <><WorkoutPlan {...props} /><BottomButtons /></>}
          </Stack.Screen>
          <Stack.Screen name="DietPlan" options={{headerShown: false, animationEnabled: false}}>
            {props => <><DietPlan {...props} /><BottomButtons /></>}
          </Stack.Screen>
          <Stack.Screen name="Workouts" options={{headerShown: false, animationEnabled: false}}>
            {props => <><Workouts {...props} /><BottomButtons /></>}
          </Stack.Screen>
          <Stack.Screen name="CreateWorkout" options={{headerShown: false}}>
            {props => <><CreateWorkout {...props} /><BottomButtons /></>}
          </Stack.Screen>
          <Stack.Screen name="ViewWorkout" options={{headerShown: false}}>
            {props => <><ViewWorkout {...props} /><BottomButtons /></>}
          </Stack.Screen>
          <Stack.Screen name="Profile" options={{headerShown: false, animationEnabled: false}}>
            {props => <><Profile {...props} /><BottomButtons /></>}
          </Stack.Screen>
          <Stack.Screen name="Settings" options={{ headerShown: false }}>
            {props => <Settings {...props} />}
          </Stack.Screen>
          <Stack.Screen name="ViewPost" options={{ headerShown: false }}>
            {props => <ViewPost {...props} />}
          </Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaView>
  );

  function BottomButtons() {  
    const navigation = useNavigation();
  
    return (
      <View style={[globalStyles.bottomButtonContainer, {backgroundColor: 'black'}]}>
        <TouchableOpacity style={globalStyles.button} onPress={() => {
            console.log("HomeFeed pressed"); 
            navigation.navigate('HomeFeed')
          }}>
          <Image source={homeIcon} style={{ width: 40, height: 40, borderRadius:5 }} />
        </TouchableOpacity>
        {/* EXPLORE BUTTON TEMPORARILY REMOVED
        <TouchableOpacity style={globalStyles.button} onPress={() => {
          console.log("Explore pressed")
          navigation.navigate('Explore')
          }}>
          <Image source={exploreIcon} style={{ width: 40, height: 40, borderRadius:5 }} />
        </TouchableOpacity>
        */}
        <TouchableOpacity style={globalStyles.button} onPress={() => {
          console.log("AI pressed")
          navigation.navigate('AI')
          }}>
          <Image source={AIIcon} style={{ width: 40, height: 40, borderRadius:5 }} />
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => {
            console.log("POST pressed")
            navigation.navigate('Post')
          }}
          style={globalStyles.postButton}>
            <Text style={{color: 'white', fontSize:40}}>+</Text>
        </TouchableOpacity>
        <TouchableOpacity style={globalStyles.button} onPress={() => {
          console.log("Workouts pressed");
          navigation.navigate('Workouts')
          }}>
          <Image source={workoutsIcon} style={{ width: 40, height: 40, borderRadius:5 }} />
        </TouchableOpacity>
        <TouchableOpacity style={globalStyles.button} onPress={() => {
          console.log("Profile pressed");
          navigation.navigate('Profile')
        }}>
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