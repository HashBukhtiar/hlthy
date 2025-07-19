import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Dimensions, Animated, Keyboard, ScrollView, TouchableWithoutFeedback, Image } from 'react-native';
import { CustomSelector, SelectorItem } from '@/components/CustomSelector';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { updateDoc, doc, setDoc } from "firebase/firestore";
import { db } from '@/firebaseConfig';
import { getAuth, updateProfile } from 'firebase/auth';
import CustomSpinner from '@/components/CustomSpinner';

// Archetype options
const archetypes: SelectorItem[] = [
  { label: 'Athlete', value: 'athlete', image: require('@/assets/images/athlete.png'), description: 'Focused on athletic performance and competition' },
  { label: 'Bodybuilder', value: 'bodybuilder', image: require('@/assets/images/bodybuilder.png'), description: 'Building muscle mass and definition' },
  { label: 'Crossfitter', value: 'crossfitter', image: require('@/assets/images/crossfitter.png'), description: 'Functional fitness and varied workouts' },
  { label: 'Generalist', value: 'generalist', image: require('@/assets/images/generalist.png'), description: 'Well-rounded fitness approach' },
  { label: 'Powerlifter', value: 'powerlifter', image: require('@/assets/images/powerlifter.png'), description: 'Maximum strength in core lifts' },
];

export default function SelectArchetype() {
  const router = useRouter();
  const params = useLocalSearchParams<{ userId: string }>();
  const userId = params.userId;
  const auth = getAuth();
  const user = auth.currentUser;

  const [value, setValue] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [modalVisible, setModalVisible] = useState<boolean>(false);

  // Sliding animation for form
  const contentTranslateY = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        Animated.timing(contentTranslateY, {
          toValue: -60,
          duration: 250,
          useNativeDriver: true,
        }).start();
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        Animated.timing(contentTranslateY, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }).start();
      }
    );
    return () => {
      keyboardDidHideListener?.remove();
      keyboardDidShowListener?.remove();
    };
  }, [contentTranslateY]);

  const handleSelect = async () => {
    setSubmitted(true);
    Keyboard.dismiss();
    setErrorMessage('');
    if (!value) {
      setErrorMessage('Please select an archetype.');
      return;
    }
    setLoading(true);
    try {
      let uid = userId || (user ? user.uid : null);
      if (!uid) throw new Error('No userId available');
      if (user) {
        await updateProfile(user, { displayName: value });
      }
      await setDoc(doc(db, 'users', uid), { archetype: value }, { merge: true });
      setLoading(false);
      router.replace('/(tabs)');
    } catch (e: any) {
      setLoading(false);
      setErrorMessage(e.message || 'Failed to save archetype.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingOverlay}>
        <CustomSpinner size={80} />
        <Text style={styles.loadingText}>Saving archetype...</Text>
      </View>
    );
  }

  return (
    <View style={styles.slideView}>
      <TouchableOpacity style={styles.backButtonTop} onPress={() => router.back()} activeOpacity={0.7}>
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" scrollEnabled={false}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <Animated.View style={[styles.loginFullContainer, { transform: [{ translateY: contentTranslateY }] }]}> 
            <View style={styles.loginCenteredContent}>
              <View style={styles.loginHeader}>
                <Image style={styles.logo} source={require('@/assets/images/icon.png')} />
                <Text style={styles.loginTitle}>Welcome to hlthy</Text>
                <Text style={styles.loginSubtitle}>Choose your fitness archetype to get personalized recommendations</Text>
              </View>
              <View style={styles.formContainer}>
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
                        <Image 
                          source={archetypes.find(a => a.value === value)?.image} 
                          style={styles.previewIcon}
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
                <TouchableOpacity
                  style={[styles.modernLoginButton, value && styles.modernLoginButtonActive]}
                  onPress={handleSelect}
                  disabled={!value}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modernLoginButtonText}>Continue</Text>
                </TouchableOpacity>
                <View style={styles.errorContainer}>
                  <Text style={[styles.errorText, { opacity: errorMessage ? 1 : 0 }]}>{errorMessage || ' '}</Text>
                </View>
              </View>
            </View>
          </Animated.View>
        </TouchableWithoutFeedback>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  slideView: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: Dimensions.get('window').width,
  },
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  headerSection: {
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 30,
  },
  logoContainer: {
    marginBottom: 16,
  },
  logo: {
    width: 120,
    height: 40,
    resizeMode: 'contain',
  },
  loginTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  loginSubtitle: {
    fontSize: 16,
    color: '#AAAAAA',
    textAlign: 'center',
    lineHeight: 22,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 30,
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  selectorWrapper: {
    marginBottom: 30,
  },
  previewContainer: {
    marginTop: 20,
    marginBottom: 40,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 10,
    textAlign: 'center',
  },
  previewCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  previewIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  previewName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  previewDescription: {
    fontSize: 14,
    color: '#CCC',
    marginTop: 4,
  },
  footerSection: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 30,
  },
  modernLoginButton: {
    backgroundColor: '#333',
    borderRadius: 25,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    opacity: 0.5,
  },
  modernLoginButtonActive: {
    backgroundColor: '#FF2D55',
    opacity: 1,
  },
  modernLoginButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  note: {
    color: '#AAAAAA',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
  },
  errorText: {
    color: '#FF5555',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14,
  },
  loadingOverlay: {
    position: 'absolute',
    top: -200,
    left: -200,
    right: -200,
    bottom: -200,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 24,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  scrollContent: {
    flexGrow: 1,
  },
  backButtonTop: {
    position: 'absolute',
    top: 40,
    left: 16,
    zIndex: 100,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
  },
  loginFullContainer: {
    flex: 1,
    backgroundColor: '#121212',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 32,
    paddingBottom: 48,
    paddingHorizontal: 24,
    marginTop: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  loginCenteredContent: {
    flex: 1,
    justifyContent: 'center',
  },
  loginHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  formContainer: {
    flex: 1,
  },
  errorContainer: {
    marginTop: 12,
    marginBottom: 8,
    alignItems: 'center',
  },
});
