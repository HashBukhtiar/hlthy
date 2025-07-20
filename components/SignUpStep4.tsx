import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, KeyboardAvoidingView, ScrollView, StyleSheet, Dimensions, Keyboard, TouchableWithoutFeedback, Animated, Platform } from 'react-native';
import { TextInput } from 'react-native-paper';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { CustomSelector, SelectorItem } from '@/components/CustomSelector';
import { Image } from 'react-native';
import { auth, db } from '@/firebaseConfig';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useRouter } from 'expo-router';

interface SignUpStep4Props {
  visible: boolean;
  onBackPress: () => void;
  onComplete: (data: { archetype: string }) => void;
  onShowLogin?: () => void;
  loading?: boolean;
}

export default function SignUpStep4({ visible, onBackPress, onComplete, onShowLogin, loading = false }: SignUpStep4Props) {
  const { width } = Dimensions.get('window');
  const router = useRouter();

  // Archetype options
  const archetypes: SelectorItem[] = [
    { label: 'Athlete', value: 'athlete', image: require('@/assets/images/athlete.png'), description: 'Focused on athletic performance and competition' },
    { label: 'Bodybuilder', value: 'bodybuilder', image: require('@/assets/images/bodybuilder.png'), description: 'Building muscle mass and definition' },
    { label: 'Crossfitter', value: 'crossfitter', image: require('@/assets/images/crossfitter.png'), description: 'Functional fitness and varied workouts' },
    { label: 'Generalist', value: 'generalist', image: require('@/assets/images/generalist.png'), description: 'Well-rounded fitness approach' },
    { label: 'Powerlifter', value: 'powerlifter', image: require('@/assets/images/powerlifter.png'), description: 'Maximum strength in core lifts' },
  ];

  const [archetype, setArchetype] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const handleComplete = useCallback(async () => {
    setSubmitted(true);
    if (!archetype) {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 1, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -1, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 1, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
      return;
    }
    try {
      const signupData = await onComplete({ archetype });
      console.log('[SignUpStep4] Received signup data:', signupData);
      if (!signupData) return;
      const { email, password, firstName, lastName, username, dateOfBirth } = signupData;
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log('[SignUpStep4] Firebase Auth user created:', user.uid);
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email,
        firstName,
        lastName,
        username,
        dateOfBirth,
        archetype,
        createdAt: new Date().toISOString(),
      });
      console.log('[SignUpStep4] Firestore user profile created for:', user.uid);
      router.replace('/profile');
    } catch (error) {
      console.error('[SignUpStep4] Signup error:', error);
    }
  }, [archetype, onComplete, shakeAnim, router]);

  const handleBackPress = useCallback(() => {
    onBackPress();
  }, [onBackPress]);

  if (!visible) return null;

  return (
    <View style={[styles.container, { paddingHorizontal: 20 }]}>
      <TouchableOpacity 
        style={styles.backButtonTop} 
        onPress={handleBackPress}
        activeOpacity={0.7}
      >
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity>
      <View style={styles.header} />
      <Animated.View style={[styles.content, { paddingTop: !archetype ? Math.round(width * 0.375) : Math.round(width * 0.11) }]}> 
        <Text style={styles.title}>Your Fitness Identity</Text>
        <Text style={styles.subtitle}>Personalize your hlthy experience to your fitness journey</Text>
        <View style={styles.form}>
          <View style={styles.inputContainer}>
          <Animated.View style={{
            transform: [
              { translateX: shakeAnim.interpolate({ inputRange: [-1, 1], outputRange: [-8, 8] }) }
            ]
          }}>
            <CustomSelector
              items={archetypes}
              value={archetype}
              onSelect={setArchetype}
              placeholder="Choose your archetype"
              title="Archetype"
              icon="aperture-outline"
              modalVisible={modalVisible}
              setModalVisible={setModalVisible}
              variant="fullWidth"
            />
          </Animated.View>
          </View>
        </View>

        {/* Selected Archetype Preview */}
        {archetype && (
        <View style={styles.previewContainer}>
            <Text style={styles.previewTitle}>Selected Archetype</Text>
            <View style={styles.previewCardCleaned}>
            <Image 
                source={archetypes.find(a => a.value === archetype)?.image} 
                style={styles.previewIconCleaned}
            />
            <View style={styles.previewTextBlock}>
                <Text style={styles.previewNameCleaned}>
                {archetypes.find(a => a.value === archetype)?.label}
                </Text>
                <Text style={styles.previewDescriptionCleaned}>
                {archetypes.find(a => a.value === archetype)?.description}
                </Text>
            </View>
            </View>
        </View>
        )}
        
        {/* Action Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.completeButton, !archetype && styles.disabledButton]}
            onPress={handleComplete}
            activeOpacity={0.8}
          >
            <Text style={styles.completeButtonText}>Create Account</Text>
          </TouchableOpacity>
        </View>

      </Animated.View>

      <View style={{ width: '100%', alignItems: 'center', marginBottom: 20 }}>
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color="rgba(255, 255, 255, 0.7)" />
          <Text style={styles.infoText}>
            You can change your archetype later in your profile settings.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
  },
  backButtonTop: {
    position: 'absolute',
    top: 20,
    left: 20,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 30,
  },
  form: {
    marginBottom: 10,
  },
  inputContainer: {
    marginBottom: 10,
  },
  modernInput: {
    marginBottom: 10,
    backgroundColor: 'transparent',
    marginHorizontal: 5,
    paddingHorizontal: 0,
    height: 100,
    textAlignVertical: 'top',
  },
  modernInputCompact: {
    marginTop: 20,
    marginBottom: 10,
    backgroundColor: 'transparent',
    marginHorizontal: 5,
    paddingHorizontal: 0,
    height: 60,
    textAlignVertical: 'top',
  },
  inputContentStyle: {
    // nothing right now.
  },
  inputContentStyleCompact: {
    // nothing right now.
  },
  buttonContainer: {
    gap: 15,
  },
  completeButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    height: 50,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
  },
  disabledButton: {
    opacity: 0.7,
  },
  completeButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  previewContainer: {
    marginTop: 0,
    marginBottom: 20,
    padding: 15,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  previewCardCleaned: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    gap: 16,
  },
  previewIconCleaned: {
    width: 48,
    height: 48,
    borderRadius: 0,
    marginRight: 0,
  },
  previewTextBlock: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 4,
  },
  previewNameCleaned: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  previewDescriptionCleaned: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    marginTop: 10,
    width: '100%',
    maxWidth: 600,
  },
  infoText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginLeft: 10,
    flex: 1,
    textAlign: 'left',
  },
});
