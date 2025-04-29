import React from 'react';
import { View, Text, Button, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

export default function DietPlan() {
  const navigation = useNavigation();
  
  const handleFileUpload = () => { /* Implement file picker logic */ };
  const handleUseExisting = () => { /* Show list of uploaded plans */ };

  return (
    <View style={{ flex: 1, backgroundColor: 'black', padding: 20 }}>
      {/* Header with back button */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 40, marginBottom: 20 }}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={{ color: 'white', fontSize: 24, marginLeft: 20 }}>Diet Plan</Text>
      </View>

      <Text style={{ color: 'white', marginBottom: 20 }}>Upload or use an uploaded plan</Text>
      
      <View style={{ gap: 10 }}>
        <Button 
          title="Upload From Files" 
          onPress={handleFileUpload}
          color="#404040" 
        />
        <Button 
          title="Use Uploaded Plans" 
          onPress={handleUseExisting}
          color="#404040"
        />
      </View>
    </View>
  );
}