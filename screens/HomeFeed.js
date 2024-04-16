import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import globalStyles from '../styles/globalStyles';

export default function HomeFeed() {
    return (
      <View style={styles.container}>
      <Text style={globalStyles.title}>hlthy</Text>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.postsContainer}>
        <Text style={{color:'white'}}>Posts will go here</Text>
      </ScrollView>
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={() => {console.log("HomeFeed pressed")}}>
          <Text style={styles.buttonText}>HomeFeed</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => {console.log("Milestones pressed")}}>
          <Text style={styles.buttonText}>Milestones</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => {console.log("Search pressed")}}>
          <Text style={styles.buttonText}>Search</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => {console.log("Workouts pressed")}}>
          <Text style={styles.buttonText}>Workouts</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => {console.log("Profile pressed")}}>
          <Text style={styles.buttonText}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
    );
  }
  
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'space-between',  // Add this line
  },
  postsContainer: {
    flex: 1,
    borderWidth: 1, 
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContainer: {
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
});