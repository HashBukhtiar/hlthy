import React from 'react';
import { ScrollView, View, Text, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const ViewWorkout = () => {
  const navigation = useNavigation();

  // Mock API result
  const workoutData = {
    title: "Impossible Leg Day",
    creatorName: "John Doe",
    workoutLength: "2 segments • 1h 30min",
    segments: [
      {
        name: "Warm Up",
        length: "30 mins",
        workouts: [
          { name: "Bulgarian Split Squats", reps: "3x12" },
          { name: "Deadlift", reps: "3x5" },
          { name: "Leg Press", reps: "3x10" },
        ],
      },
      {
        name: "Main Workout",
        length: "1h",
        workouts: [
          { name: "Squats", reps: "2x10" },
          { name: "Lunges", reps: "2x10" },
          { name: "Calf Raises", reps: "2x15" },
          { name: "Leg Extensions", reps: "2x12"},
          { name: "Leg Curls", reps: "2x12"}
        ],
      },
    ],
    description: "This is a killer leg day workout that will leave you sore for days. Make sure to stretch and warm up properly before starting this workout."
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: 'black' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 70, paddingLeft: 25, marginTop: -40, justifyContent: 'space-between', paddingRight: 25 }}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={{ color: 'white', fontSize: 30, marginLeft: -100, fontWeight: 'bold' }}>View Workout</Text>
        <TouchableOpacity>
        <View style={{ backgroundColor: '#303030', borderRadius: 15, width: 30, height: 30, justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name="ellipsis-horizontal" size={20} color="white" />
        </View>
        </TouchableOpacity>
      </View>
      <Image
        source={{ uri: 'https://thecamerastore.com/cdn/shop/articles/GINAYEOLANDSCAPE-1_800x.jpg?v=1687296669' }}
        style={{ width: '50%', aspectRatio: 1, borderRadius: 15, alignSelf: 'center', marginTop: 50 }}
      />
      <Text style={{ color: '#ffffff', fontSize: 28, fontWeight: 'bold', alignSelf: 'center', marginTop: 20 }}>{workoutData.title}</Text>
      <Text style={{ color: '#b7b7b7', fontSize: 20, alignSelf: 'center', marginTop: 5 }}>{workoutData.creatorName}</Text>
      <Text style={{ color: '#666666', fontSize: 14, alignSelf: 'center', marginTop: 7 }}>{workoutData.workoutLength}</Text>


      {workoutData.segments.map((segment, segmentIndex) => (
        <View key={segmentIndex} style={{ marginTop: segmentIndex === 0 ? 30 : 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 30 }}>
            <Text style={{ color: '#ffffff', fontSize: 22, fontWeight: 'bold' }}>{segment.name}</Text>
            {/* <Text style={{ color: '#ffffff', fontSize: 22, fontWeight: 'bold' }}>Segment { segmentIndex + 1 }</Text> This is for naming the segments according to their order, i.e. Segment 1, Segment 2, etc. */}
            <View style={{ alignSelf: 'flex-start', marginTop: 10 }}>
              <Text style={{ color: '#666666', fontSize: 14 }}>{segment.workouts.length} exercises • {segment.length}</Text>
            </View>
          </View>
          <View style={{ backgroundColor: '#303030', borderRadius: 30, marginTop: 14, margin: 20, padding: 20 }}>
            {segment.workouts.map((workout, index) => (
              <View key={index}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: index === segment.workouts.length - 1 ? -2 : 8, marginTop: index === 0 ? -2 : 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ 
                      width: 25, 
                      height: 25, 
                      borderRadius: 12, 
                      backgroundColor: '#909090', 
                      justifyContent: 'center', 
                      alignItems: 'center', 
                      marginLeft: -5,
                      shadowColor: "#000",
                      shadowOffset: {
                          width: 0,
                          height: 2,
                      },
                      shadowOpacity: 0.25,
                      shadowRadius: 4,
                      // elevation: 1,
                    }}>
                      <Text style={{ fontSize: 15, color: 'black', fontWeight: 'bold' }}>{index + 1}</Text>
                    </View>
                    <Text style={{ color: '#f3f3f3', fontWeight: 'bold', fontSize: 18, marginLeft: 10 }}>{workout.name}</Text>
                    <Text style={{ color: '#b7b7b7', fontWeight: 'bold', fontSize: 13, marginLeft: 10 }}>({workout.reps})</Text>
                  </View>
                  <TouchableOpacity>
                    <Ionicons name="ellipsis-horizontal" size={18} color="white" />
                  </TouchableOpacity>
                </View>
                {index < segment.workouts.length - 1 && <View style={{ height: 1, backgroundColor: '#707070', marginVertical: 5 }} />}
              </View>
            ))}
          </View>
        </View>
      ))}

      <Text style={{ color: '#c0c0c0', fontSize: 18, fontWeight: 'bold', marginTop: 10, marginLeft: 30}}>Description</Text>
      <View style={{ backgroundColor: '#202020', borderRadius: 30, marginTop: 14, margin: 20, padding: 20 }}>
        <Text style={{ color: '#b7b7b7', fontSize: 16 }}>{workoutData.description}</Text>
      </View>
    </ScrollView>
  );
}

export default ViewWorkout;