import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  AppState,
  AppStateStatus,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '@/firebaseConfig';
import { reload, signOut } from 'firebase/auth';
import CustomSpinner from '@/components/CustomSpinner';
import { SignupService } from '@/services/signupService';

interface EmailVerificationScreenProps {
  visible: boolean;
  userEmail: string;
  onVerificationComplete: () => void;
  onBackToSignUp: () => void;
}

export default function EmailVerificationScreen({
  visible,
  userEmail,
  onVerificationComplete,
  onBackToSignUp,
}: EmailVerificationScreenProps) {
  const { width, height } = Dimensions.get('window');
  const router = useRouter();
  
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isCheckingVerification, setIsCheckingVerification] = useState(false);
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  // Success animation state for resend button
  const [showResendSuccess, setShowResendSuccess] = useState(false);
  const spinnerFadeAnim = useRef(new Animated.Value(0)).current;
  const resendSuccessAnim = useRef(new Animated.Value(0)).current;

  // Check verification status when app comes to foreground
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && visible) {
        checkEmailVerification();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [visible]);

  // Cooldown timer for resend button
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  useEffect(() => {
    if (isChangingEmail) {
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
  }, [isChangingEmail, spinnerFadeAnim]);

  const checkEmailVerification = useCallback(async () => {
    if (!auth.currentUser) return;
    
    setIsCheckingVerification(true);
    try {
      await reload(auth.currentUser);
      if (auth.currentUser.emailVerified) {
        // Complete the signup process with stored data
        await SignupService.completePendingSignup();
        onVerificationComplete();
      }
    } catch (error) {
      console.error('Error checking email verification:', error);
    } finally {
      setIsCheckingVerification(false);
    }
  }, [onVerificationComplete]);

  const handleResendVerification = useCallback(async () => {
    if (!auth.currentUser || resendCooldown > 0) return;
    
    setIsResending(true);
    try {
      await SignupService.resendVerificationEmail();
      setResendCooldown(60); // 60 second cooldown

      // trigger a compact success animation: expanding green circle + check
      setShowResendSuccess(true);
      resendSuccessAnim.setValue(0);
      Animated.sequence([
        Animated.timing(resendSuccessAnim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: false,
        }),
        Animated.delay(900),
        Animated.timing(resendSuccessAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }),
      ]).start(() => {
        setShowResendSuccess(false);
      });
    } catch (error: any) {
      console.error('Error resending verification email:', error);
      Alert.alert(
        'Error',
        'Failed to send verification email. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsResending(false);
    }
  }, [resendCooldown, resendSuccessAnim]);

  const handleChangeEmail = useCallback(async () => {
    setIsChangingEmail(true);
    try {
      // This will clean up both AsyncStorage data and Firebase Auth account
      await SignupService.cancelPendingSignup();
      onBackToSignUp();
    } catch (error) {
      console.error('Error canceling signup:', error);
      onBackToSignUp();
    } finally {
      setIsChangingEmail(false);
    }
  }, [onBackToSignUp]);

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="mail" size={50} color="#FFFFFF" />
        </View>
        
        <Text style={styles.title}>Verify Your Email</Text>
        <Text style={styles.subtitle}>
          We've sent a verification email to{'\n'}
          <Text style={styles.emailText}>{userEmail}</Text>
        </Text>
        
        <Text style={styles.description}>
          Follow the instructions in the email to verify.
        </Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.primaryButton, isCheckingVerification && styles.disabledButton]}
            onPress={checkEmailVerification}
            disabled={isCheckingVerification}
            activeOpacity={0.8}
          >
            {isCheckingVerification ? (
              <CustomSpinner size={20} />
            ) : (
              <Ionicons name="checkmark-done-outline" size={20} color="#000000" />
            )}
            <Text style={styles.primaryButtonText}>
              {isCheckingVerification ? 'Checking...' : 'I\'ve Verified'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.secondaryButton,
              (isResending || resendCooldown > 0) && styles.disabledButton,
              showResendSuccess && { borderColor: '#22C55E' },
            ]}
            onPress={handleResendVerification}
            disabled={isResending || resendCooldown > 0}
            activeOpacity={0.8}
          >
            {isResending ? (
              <CustomSpinner size={16} />
            ) : showResendSuccess ? (
              <Animated.View style={styles.successCheckWrapper}>
                <Ionicons name="checkmark" size={18} color="#FFFFFF" />
              </Animated.View>
            ) : (
              <Ionicons name="send" size={16} color="#FFFFFF" />
            )}
            <Text style={styles.secondaryButtonText}>
              {isResending
                ? 'Sending...'
                : resendCooldown > 0
                ? `Resend in ${resendCooldown}s`
                : 'Resend Email'}
            </Text>
          </TouchableOpacity>

        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.changeEmailButton, isChangingEmail && styles.disabledButton]}
          onPress={handleChangeEmail}
          activeOpacity={0.8}
          disabled={isChangingEmail}
        >
          <Text style={styles.changeEmailText}>
            Wrong email address? <Text style={styles.changeEmailLink}>Change it</Text>
          </Text>
        </TouchableOpacity>
      </View>

      {/* Loading spinner overlay */}
      {isChangingEmail && (
        <>
          <View style={styles.loadingBlocker} pointerEvents="auto" />
          <Animated.View style={[styles.loadingOverlay, { opacity: spinnerFadeAnim }]} pointerEvents="auto">
            <CustomSpinner size={48} />
            <Text style={styles.loadingText}>Cleaning up...</Text>
          </Animated.View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingHorizontal: 24,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 24,
  },
  emailText: {
    fontWeight: '600',
    color: '#FFFFFF',
  },
  description: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
  },
  primaryButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 25,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    overflow: 'hidden',
    position: 'relative',
  },
  successCheckWrapper: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
    zIndex: 3,
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  tertiaryButton: {
    backgroundColor: 'transparent',
    borderRadius: 25,
    height: 48,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  tertiaryButtonText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '500',
  },
  disabledButton: {
    opacity: 0.6,
  },
  footer: {
    paddingBottom: 40,
    alignItems: 'center',
  },
  changeEmailButton: {
    padding: 16,
  },
  changeEmailText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    textAlign: 'center',
  },
  changeEmailLink: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  loadingOverlay: {
    position: 'absolute',
    top: '50%',
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
});
