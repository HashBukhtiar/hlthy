import React from 'react';
import { View, Text, Button, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import globalStyles from '@/styles/globalStyles';

export default function DietPlan() {
  const navigation = useNavigation();
  
  const handleFileUpload = () => { 
    /* Implement file picker logic */ 
    console.log('File upload pressed');
  };
  
  const handleUseExisting = () => { 
    /* Show list of uploaded plans */ 
    console.log('Use existing plans pressed');
  };

  return (
    <View style={[globalStyles.container, styles.container]}>
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Diet Plan</Text>
      </View>

      <Text style={styles.subtitle}>Upload or use an uploaded plan</Text>
      
      <View style={styles.buttonContainer}>
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

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
  headerTitle: {
    color: 'white',
    fontSize: 24,
    marginLeft: 20,
  },
  subtitle: {
    color: 'white',
    marginBottom: 20,
  },
  buttonContainer: {
    gap: 10,
  },
});