import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, KeyboardAvoidingView, ScrollView, StyleSheet, Dimensions, Keyboard, TouchableWithoutFeedback, Animated, Platform, Alert } from 'react-native';
import { TextInput } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { CustomSelector, SelectorItem } from '@/components/CustomSelector';
import CustomSpinner from '@/components/CustomSpinner';
import { Image } from 'react-native';
import { useRouter } from 'expo-router';
import { SignupService } from '@/services/signupService';

interface SignUpStep4Props {
  visible: boolean;
  onBackPress: () => void;
  onComplete: (data: { archetype: string }) => any;
  onShowLogin?: () => void;
  onEmailVerificationRequired?: (email: string) => void;
}

export default function SignUpStep4({ visible, onBackPress, onComplete, onShowLogin, onEmailVerificationRequired }: SignUpStep4Props) {
  const { width, height } = Dimensions.get('window');
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
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const spinnerFadeAnim = useRef(new Animated.Value(0)).current;
  const errorFadeAnim = useRef(new Animated.Value(0)).current;
  const errorSlideAnim = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    if (loading) {
      Animated.timing(spinnerFadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(spinnerFadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [loading, spinnerFadeAnim]);

  useEffect(() => {
    if (errorMessage) {
      // Slide in and fade in
      Animated.parallel([
        Animated.timing(errorFadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(errorSlideAnim, {
          toValue: 0,
          tension: 80,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Slide out and fade out
      Animated.parallel([
        Animated.timing(errorFadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(errorSlideAnim, {
          toValue: -20,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [errorMessage, errorFadeAnim, errorSlideAnim]);

  const handleComplete = useCallback(async () => {
    setSubmitted(true);
    setErrorMessage(null); // Clear any previous errors
    
    if (!archetype) {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 1, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -1, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 1, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
      return;
    }
    setLoading(true);
    try {
      const signupData = onComplete({ archetype });
      console.log('[SignUpStep4] Received signup data:', signupData);
      if (!signupData || typeof signupData !== 'object') {
        setLoading(false);
        return;
      }
      const { email, password, firstName, lastName, username, dateOfBirth } = signupData;
      
      // Initiate pending signup (creates temp account and sends verification email)
      await SignupService.initiatePendingSignup({
        email,
        password,
        firstName,
        lastName,
        username,
        dateOfBirth,
        archetype,
      });
      
      console.log('[SignUpStep4] Pending signup initiated, verification email sent to:', email);
      
      // Redirect to email verification screen
      if (onEmailVerificationRequired) {
        onEmailVerificationRequired(email);
      }
    } catch (error: any) {
      console.log('[SignUpStep4] Signup error handled:', error.code || 'unknown');
      
      // Handle specific error codes
      if (error.code === 'auth/email-already-in-use') {
        setErrorMessage('This email is already registered. Please use a different email or try logging in.');
      } else if (error.code === 'auth/username-already-in-use') {
        setErrorMessage('This username is already taken. Please choose a different username.');
      } else if (error.code === 'auth/invalid-email') {
        setErrorMessage('Invalid email address. Please check and try again.');
      } else if (error.code === 'auth/weak-password') {
        setErrorMessage('Password is too weak. Please choose a stronger password.');
      } else if (error.message) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('An unexpected error occurred. Please try again.');
      }
      
      // Shake animation for error
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 1, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -1, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 1, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    }
    setLoading(false);
  }, [archetype, onComplete, shakeAnim, onEmailVerificationRequired]);

  const handleBackPress = useCallback(() => {
    onBackPress();
  }, [onBackPress]);

  // Height-dependent padding function
  const getInitialContentPadding = (hasArchetype: boolean) => {
    if (hasArchetype) {
      // Coefficients for when archetype is selected (preview showing)
      let a = -0.1301;
      let b = 0.06477;
      let h = -834.2;
      let k = 0.1300;
      return height * (a / (1 + Math.exp(b * (height + h))) + k);
    } else {
      // Coefficients for when archetype is not selected
      let a = -0.1100;
      let b = 0.0647;
      let h = -835.73;
      let k = 0.2100;
      return height * (a / (1 + Math.exp(b * (height + h))) + k);
    }
  };

  if (!visible) return null;

  return (
    <View style={[styles.container, { paddingHorizontal: 20 }]}> 
      <TouchableOpacity 
        style={styles.backButtonTop} 
        onPress={handleBackPress}
        activeOpacity={0.7}
        disabled={loading} // Disable back button when loading
      >
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity>
      <View style={styles.header} />
      <Animated.View style={[styles.content, { paddingTop: getInitialContentPadding(!!archetype) }]}> 
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
        
        {/* Error Message */}
        {errorMessage && (
          <Animated.View style={[
            styles.errorContainer, 
            { 
              opacity: errorFadeAnim,
              transform: [{ translateY: errorSlideAnim }]
            }
          ]}>
            <Ionicons name="warning" size={20} color="#FF6B6B" />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </Animated.View>
        )}
        
        {/* Action Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.completeButton, (!archetype || loading) && styles.disabledButton]}
            onPress={handleComplete}
            activeOpacity={0.8}
            disabled={loading}
          >
            <Text style={styles.completeButtonText}>Create Account</Text>
          </TouchableOpacity>
        </View>
        {/* Loader overlay (fade-in/fade-out) */}
        {loading && (
          <>
            <View style={styles.loadingBlocker} pointerEvents="auto" />
            <Animated.View style={[styles.loadingOverlay, { opacity: spinnerFadeAnim }]} pointerEvents="auto">
              <CustomSpinner size={48} />
              <Text style={styles.loadingText}>Creating account...</Text>
            </Animated.View>
          </>
        )}
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
  loadingOverlay: {
    position: 'absolute',
    top: '60%',
    left: '50%',
    width: 180,
    height: 180,
    marginLeft: -90,
    marginTop: -90,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 24,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  loadingBlocker: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 999,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
    marginBottom: 15,
    gap: 10,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 14,
    flex: 1,
    fontWeight: '500',
  },
});
