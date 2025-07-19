import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, KeyboardAvoidingView, ScrollView, StyleSheet, Dimensions, Keyboard, TouchableWithoutFeedback, Animated, Platform } from 'react-native';
import { TextInput } from 'react-native-paper';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface SignUpStep4Props {
  visible: boolean;
  onBackPress: () => void;
  onComplete: (data: { bio: string }) => void;
  onShowLogin?: () => void;
  loading?: boolean;
}

export default function SignUpStep4({ visible, onBackPress, onComplete, onShowLogin, loading = false }: SignUpStep4Props) {
  const { width } = Dimensions.get('window');
  const [bio, setBio] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [submitted, setSubmitted] = useState(false);
  const [bioFocused, setBioFocused] = useState<boolean>(false);

  // Animated padding for keyboard
  const contentPaddingAnim = useRef(new Animated.Value(80)).current;

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        Animated.timing(contentPaddingAnim, {
          toValue: 20,
          duration: 250,
          useNativeDriver: false,
        }).start();
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        Animated.timing(contentPaddingAnim, {
          toValue: 80,
          duration: 250,
          useNativeDriver: false,
        }).start();
      }
    );
    return () => {
      keyboardDidHideListener?.remove();
      keyboardDidShowListener?.remove();
    };
  }, [contentPaddingAnim]);

  // Shake animation for bio field
  const bioShakeAnim = useRef(new Animated.Value(0)).current;
  const triggerShake = useCallback(() => {
    bioShakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(bioShakeAnim, { toValue: 1, duration: 50, useNativeDriver: true }),
      Animated.timing(bioShakeAnim, { toValue: -1, duration: 50, useNativeDriver: true }),
      Animated.timing(bioShakeAnim, { toValue: 1, duration: 50, useNativeDriver: true }),
      Animated.timing(bioShakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [bioShakeAnim]);

  const validateBio = (bio: string): string | null => {
    if (!bio.trim()) return 'Please enter a bio.';
    if (bio.length < 10) return 'Bio must be at least 10 characters.';
    if (bio.length > 200) return 'Bio must be at most 200 characters.';
    return null;
  };

  useEffect(() => {
    if (!submitted) return;
    const bioErr = validateBio(bio);
    if (bioErr) {
      setErrorMessage(bioErr);
      return;
    }
    setErrorMessage('');
  }, [bio, submitted]);

  const handleComplete = useCallback(() => {
    Keyboard.dismiss();
    setSubmitted(true);
    const bioErr = validateBio(bio);
    if (bioErr) {
      setErrorMessage(bioErr);
      triggerShake();
      return;
    }
    setErrorMessage('');
    onComplete({ bio });
  }, [bio, onComplete, triggerShake]);

  const handleBackPress = useCallback(() => {
    Keyboard.dismiss();
    onBackPress();
  }, [onBackPress]);

  if (!visible) return null;

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={false}
        >
          {/* Back button */}
          <TouchableOpacity 
            style={styles.backButtonTop} 
            onPress={handleBackPress}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header} />

          {/* Content */}
          <Animated.View style={[styles.content, { paddingTop: contentPaddingAnim }]}> 
            <Text style={styles.title}>Tell us about yourself</Text>
            <Text style={styles.subtitle}>Write a short bio (10-200 characters)</Text>

            {/* Form */}
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Animated.View
                  style={{
                    transform: [
                      {
                        translateX:
                          submitted && errorMessage
                            ? bioShakeAnim.interpolate({ inputRange: [-1, 1], outputRange: [-5, 5] })
                            : 0,
                      },
                    ],
                  }}
                >
                  <TextInput
                    label="Bio"
                    value={bio}
                    onChangeText={setBio}
                    onFocus={() => setBioFocused(true)}
                    onBlur={() => setBioFocused(false)}
                    style={
                      [
                        (bio || bioFocused) ? styles.modernInput : styles.modernInputCompact,
                        submitted && errorMessage && styles.modernInputError,
                      ]
                    }
                    contentStyle={
                      (bio || bioFocused) ? styles.inputContentStyle : styles.inputContentStyleCompact
                    }
                    dense={!bio && !bioFocused}
                    mode="flat"
                    theme={{
                      colors: {
                        primary: '#FFFFFF',
                        background: 'transparent',
                        surface: 'transparent',
                        onSurfaceVariant: '#AAAAAA',
                        outline: 'transparent',
                        error: '#FF5555',
                      },
                    }}
                    textColor="#FFFFFF"
                    error={!!errorMessage}
                    underlineColor={errorMessage ? '#FF5555' : 'rgba(255, 255, 255, 0.3)'}
                    activeUnderlineColor={errorMessage ? '#FF5555' : '#FFFFFF'}
                    multiline
                    numberOfLines={4}
                    maxLength={200}
                    textContentType="none"
                    autoComplete="off"
                  />
                </Animated.View>
              </View>
              <View style={styles.errorContainer}>
                {!!errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
              </View>
            </View>

            {/* Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.completeButton, loading && styles.disabledButton]}
                onPress={handleComplete}
                activeOpacity={0.8}
                disabled={loading}
              >
                <Text style={styles.completeButtonText}>Finish</Text>
                <Ionicons name="checkmark" size={20} color="#000000" />
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
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
  modernInputError: {
    borderBottomColor: '#FF5555',
    borderBottomWidth: 2,
  },
  errorText: {
    color: '#FF5555',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 0,
  },
  errorContainer: {
    minHeight: 24,
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginTop: 0,
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
});
