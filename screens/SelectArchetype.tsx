import React, { useState } from 'react';
import { View, StyleSheet, Text, Image, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { collection, updateDoc, doc } from "firebase/firestore"; 
import { db } from '@/firebaseConfig';
import globalStyles from '@/styles/globalStyles';
import { CustomSelector, SelectorItem } from '@/components/CustomSelector';
import { Ionicons } from '@expo/vector-icons';

// Transform archetype data to match SelectorItem interface
const archetypes: SelectorItem[] = [
  { 
    label: 'Athlete', 
    value: 'athlete', 
    icon: 'flash',
    description: 'Focused on athletic performance and competition'
  },
  { 
    label: 'Bodybuilder', 
    value: 'bodybuilder', 
    icon: 'fitness',
    description: 'Building muscle mass and definition'
  },
  { 
    label: 'Crossfitter', 
    value: 'crossfitter', 
    icon: 'barbell',
    description: 'Functional fitness and varied workouts'
  },
  { 
    label: 'Generalist', 
    value: 'generalist', 
    icon: 'people',
    description: 'Well-rounded fitness approach'
  },
  { 
    label: 'Powerlifter', 
    value: 'powerlifter', 
    icon: 'triangle',
    description: 'Maximum strength in core lifts'
  },
];

export default function SelectArchetype() {
  const router = useRouter();
  const params = useLocalSearchParams<{ userId: string }>();
  const userId = params.userId;
  
  const [value, setValue] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const selectArchetype = async () => {
    if (value === null) {
      console.log("User continued without selecting archetype.");
      setErrorMessage("Please select an archetype.");
      return;
    }
  
    if (!userId) {
      console.error("No userId provided");
      setErrorMessage("Authentication error. Please try again.");
      return;
    }

    try {
      const userDoc = doc(db, "users", userId);
      await updateDoc(userDoc, {
        archetype: value,
      });
      console.log("User document updated, ID: ", userId, " Archetype: ", value);
      
      // Navigate directly to the tabs route instead of the root
      router.replace('/(tabs)' as any);
    } catch (e) {
      console.error("Error updating document: ", e);
      setErrorMessage("Failed to update profile. Please try again.");
    }
  };

  return (
    <View style={[globalStyles.container, styles.container]}>
      {/* Header Section */}
      <View style={styles.headerSection}>
        <View style={styles.logoContainer}>
          <Image
            style={styles.logo}
            source={require('@/assets/images/icon.png')}
          />
        </View>
        <Text style={styles.title}>Welcome to hlthy</Text>
        <Text style={styles.subtitle}>Choose your fitness archetype to get personalized recommendations</Text>
      </View>

      {/* Content Section */}
      <View style={styles.contentContainer}>
        <Text style={styles.sectionTitle}>Select Your Archetype</Text>
        
        <View style={styles.selectorWrapper}>
          <CustomSelector
            items={archetypes}
            value={value}
            onSelect={setValue}
            placeholder="Choose your archetype"
            title="Archetype"
            icon="body"
            modalVisible={modalVisible}
            setModalVisible={setModalVisible}
            variant="fullWidth"
          />
        </View>
        
        {/* Selected Archetype Preview */}
        {value && (
          <View style={styles.previewContainer}>
            <Text style={styles.previewTitle}>Selected Archetype</Text>
            <View style={styles.previewCard}>
              <View style={styles.previewHeader}>
                <Ionicons 
                  name={archetypes.find(a => a.value === value)?.icon as any} 
                  size={24} 
                  color="#FF2D55" 
                />
                <Text style={styles.previewName}>
                  {archetypes.find(a => a.value === value)?.label}
                </Text>
              </View>
              <Text style={styles.previewDescription}>
                {archetypes.find(a => a.value === value)?.description}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Footer Section */}
      <View style={styles.footerSection}>
        <TouchableOpacity 
          onPress={selectArchetype} 
          style={[styles.continueButton, value && styles.continueButtonActive]}
          disabled={!value}
        >
          <Text style={[styles.continueButtonText, value && styles.continueButtonTextActive]}>
            Continue
          </Text>
        </TouchableOpacity>
        
        <Text style={styles.note}>
          Don't worry — you can always change your archetype later
        </Text>
        
        {errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  headerSection: {
    flex: 0.8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  logoContainer: {
    marginBottom: 20,
  },
  logo: {
    width: 56,
    height: 56,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
    marginHorizontal: 20,
  },
  contentContainer: {
    flex: 2.2,
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 32,
    textAlign: 'center',
  },
  selectorWrapper: {
    marginBottom: 32,
  },
  previewContainer: {
    marginTop: 24,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  previewCard: {
    backgroundColor: 'rgba(255, 45, 85, 0.1)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 45, 85, 0.3)',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  previewName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginLeft: 12,
  },
  previewDescription: {
    fontSize: 14,
    color: '#CCC',
    lineHeight: 20,
  },
  footerSection: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  continueButton: {
    backgroundColor: '#333',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    opacity: 0.5,
  },
  continueButtonActive: {
    backgroundColor: '#FF2D55',
    opacity: 1,
  },
  continueButtonText: {
    color: '#999',
    fontWeight: '600',
    fontSize: 16,
  },
  continueButtonTextActive: {
    color: '#FFF',
  },
  note: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
  },
  errorText: {
    color: '#FF2D55',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
});