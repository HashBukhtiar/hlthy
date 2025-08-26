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
  Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '@/firebaseConfig';
import { reload, signOut } from 'firebase/auth';
import CustomSpinner from '@/components/CustomSpinner';
import { SignupService } from '@/services/signupService';

// Animated wrappers for touchable and text so we can animate colors
const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);
const AnimatedText = Animated.createAnimatedComponent(Text);

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
  const [isVerificationFailed, setIsVerificationFailed] = useState(false);
  // Success animation state for resend button
  const [showResendSuccess, setShowResendSuccess] = useState(false);
  const spinnerFadeAnim = useRef(new Animated.Value(0)).current;
  const spinnerScaleAnim = useRef(new Animated.Value(0.8)).current;
  const resendSuccessAnim = useRef(new Animated.Value(0)).current;
  // Icon transition animations
  const sendIconYAnim = useRef(new Animated.Value(0)).current;
  const checkIconYAnim = useRef(new Animated.Value(-30)).current;
  const outlineOpacityAnim = useRef(new Animated.Value(0)).current;
  // Verification failure animations (primary button)
  const verifyXIconYAnim = useRef(new Animated.Value(60)).current; // starts off-screen below
  const verifyCheckIconYAnim = useRef(new Animated.Value(0)).current; // center
  const verifyOutlineOpacityAnim = useRef(new Animated.Value(0)).current;
  const verifyFailAnim = useRef(new Animated.Value(0)).current;

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

  // Start with a 60s countdown when the screen is shown
  useEffect(() => {
    if (visible && resendCooldown === 0) {
      setResendCooldown(60);
    }
  }, [visible]);

  useEffect(() => {
    if (isChangingEmail) {
      Animated.parallel([
        Animated.timing(spinnerFadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(spinnerScaleAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
          easing: Easing.out(Easing.back(1.1)),
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(spinnerFadeAnim, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.cubic),
        }),
        Animated.timing(spinnerScaleAnim, {
          toValue: 0.8,
          duration: 350,
          useNativeDriver: true,
          easing: Easing.in(Easing.back(1.5)),
        }),
      ]).start();
    }
  }, [isChangingEmail, spinnerFadeAnim, spinnerScaleAnim]);

  // Interpolated colors for the primary button background and text
  const animatedBackgroundColor = verifyFailAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#FFFFFF', '#DC2626'],
  });

  const animatedPrimaryTextColor = verifyFailAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#000000', '#FFFFFF'],
  });

  const checkEmailVerification = useCallback(async () => {
    if (!auth.currentUser) return;
    
    setIsCheckingVerification(true);
    try {
      await reload(auth.currentUser);
      if (auth.currentUser.emailVerified) {
        // Complete the signup process with stored data
        await SignupService.completePendingSignup();
        onVerificationComplete();
        return;
      }

      // If we reach here, verification check did not find a verified email.
      // Trigger a failure feedback animation (red button, X slides in from bottom,
      // check slides out to top and later slides back in from top).
      setIsVerificationFailed(true);
      // show feedback state
      // reset animation values
      verifyFailAnim.setValue(0);
      verifyXIconYAnim.setValue(60);
      verifyCheckIconYAnim.setValue(0);
      verifyOutlineOpacityAnim.setValue(0);

      // animate: check slides up/out, X slides in from bottom, outline fades in
  // set starting positions so entrance animations are visible
  verifyCheckIconYAnim.setValue(0);
  verifyXIconYAnim.setValue(60);
  verifyOutlineOpacityAnim.setValue(0);

  Animated.parallel([
        Animated.timing(verifyCheckIconYAnim, {
          toValue: -35,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(verifyXIconYAnim, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(verifyOutlineOpacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(verifyFailAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: false,
        }),
      ]).start();

      // After a short hold, animate X out and bring the check back from the top
      setTimeout(() => {
        // position check above before sliding down
        verifyCheckIconYAnim.setValue(-60);

        Animated.sequence([
          // nudge X down off-screen quickly
          Animated.timing(verifyXIconYAnim, {
            toValue: 60,
            duration: 180,
            useNativeDriver: true,
          }),
          // then slide check down from top while fading outline
          Animated.parallel([
            Animated.timing(verifyCheckIconYAnim, {
              toValue: 0,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(verifyOutlineOpacityAnim, {
              toValue: 0,
              duration: 250,
              useNativeDriver: true,
            }),
            Animated.timing(verifyFailAnim, {
              toValue: 0,
              duration: 300,
              useNativeDriver: false,
            }),
          ]),
        ]).start(() => {
          // reset failure state after animation finishes
          setIsVerificationFailed(false);
        });
      }, 1400);
    } catch (error) {
      console.error('Error checking email verification:', error);
      // On error, show the same failure feedback so users get visual response
      setIsVerificationFailed(true);
      verifyFailAnim.setValue(0);
      verifyXIconYAnim.setValue(60);
      verifyCheckIconYAnim.setValue(0);
      verifyOutlineOpacityAnim.setValue(0);

      Animated.parallel([
        Animated.timing(verifyCheckIconYAnim, {
          toValue: -35,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(verifyXIconYAnim, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(verifyOutlineOpacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(verifyFailAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: false,
        }),
      ]).start();

      setTimeout(() => {
        verifyCheckIconYAnim.setValue(-60);
        Animated.sequence([
          Animated.timing(verifyXIconYAnim, {
            toValue: 60,
            duration: 180,
            useNativeDriver: true,
          }),
          Animated.parallel([
            Animated.timing(verifyCheckIconYAnim, {
              toValue: 0,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(verifyOutlineOpacityAnim, {
              toValue: 0,
              duration: 250,
              useNativeDriver: true,
            }),
            Animated.timing(verifyFailAnim, {
              toValue: 0,
              duration: 300,
              useNativeDriver: false,
            }),
          ]),
        ]).start(() => setIsVerificationFailed(false));
      }, 1400);
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

      // trigger success animation with smooth icon transitions
      setShowResendSuccess(true);
      resendSuccessAnim.setValue(0);
      
      // Phase 1: Send icon slides down, check icon slides down from top
  // ensure icons start off-screen where appropriate so the entrance animates
  checkIconYAnim.setValue(-60);
  sendIconYAnim.setValue(0);
  outlineOpacityAnim.setValue(0);

  Animated.parallel([
        // Send icon slides down
        Animated.timing(sendIconYAnim, {
          toValue: 35,
          duration: 350,
          useNativeDriver: true,
        }),
        // Check icon slides down from top to center
        Animated.timing(checkIconYAnim, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }),
        // Outline fades in
        Animated.timing(outlineOpacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        // Success animation (for any other effects)
        Animated.timing(resendSuccessAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: false,
        }),
      ]).start();

      // After delay, animate everything back with send icon coming from below
      setTimeout(() => {
        // Smoothly move send icon further down then bring it up (avoids an instant jump)
        Animated.sequence([
          // Nudge send icon further down off-screen quickly
          Animated.timing(sendIconYAnim, {
            toValue: 60,
            duration: 180,
            useNativeDriver: true,
          }),
          // Then animate check icon out while send slides up into place
          Animated.parallel([
            // Check icon slides up and out
            Animated.timing(checkIconYAnim, {
              toValue: -35,
              duration: 350,
              useNativeDriver: true,
            }),
            // Send icon slides up from bottom to center
            Animated.timing(sendIconYAnim, {
              toValue: 0,
              duration: 400,
              useNativeDriver: true,
            }),
            // Outline fades out
            Animated.timing(outlineOpacityAnim, {
              toValue: 0,
              duration: 250,
              useNativeDriver: true,
            }),
            // Success animation out
            Animated.timing(resendSuccessAnim, {
              toValue: 0,
              duration: 300,
              useNativeDriver: false,
            }),
          ]),
        ]).start(() => {
          setShowResendSuccess(false);
        });
      }, 1400); // Hold the success state for 1.4 seconds
      
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
  }, [resendCooldown, resendSuccessAnim, sendIconYAnim, checkIconYAnim, outlineOpacityAnim]);

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
        <View style={styles.emailIconContainer}>
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
          <AnimatedTouchableOpacity
            style={[
              styles.primaryButton,
              isCheckingVerification && styles.disabledButton,
              { backgroundColor: animatedBackgroundColor },
            ]}
            onPress={checkEmailVerification}
            disabled={isCheckingVerification}
            activeOpacity={0.8}
          >
            {/* Red outline when verification fails */}
            <Animated.View
              style={[
                styles.verifyOutline,
                { opacity: verifyOutlineOpacityAnim },
              ]}
              pointerEvents="none"
            />

            <View style={styles.primaryIconContainer}>
              {/* Check icon (slides out to top when fail, slides back in from top) */}
              <Animated.View
                style={{
                  transform: [{ translateY: verifyCheckIconYAnim }],
                  opacity: verifyCheckIconYAnim.interpolate({
                    inputRange: [-60, -30, -5, 0, 5, 30],
                    outputRange: [0, 0, 0.8, 1, 0.8, 0],
                    extrapolate: 'clamp',
                  }),
                }}
              >
                <Ionicons name="checkmark-done-outline" size={20} color={isVerificationFailed ? '#FFFFFF' : '#000000'} />
              </Animated.View>

              {/* X icon (slides in from bottom on failure) */}
              <Animated.View
                style={{
                  position: 'absolute',
                  transform: [{ translateY: verifyXIconYAnim }],
                  opacity: verifyXIconYAnim.interpolate({
                    inputRange: [-5, 0, 5, 30, 60],
                    outputRange: [0, 1, 0.8, 0, 0],
                    extrapolate: 'clamp',
                  }),
                }}
              >
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </Animated.View>
            </View>

            <AnimatedText style={[
              styles.primaryButtonText,
              { color: animatedPrimaryTextColor },
            ]}>
              {isCheckingVerification ? 'Checking...' : 'I\'ve Verified'}
            </AnimatedText>
          </AnimatedTouchableOpacity>

          <TouchableOpacity
            style={[
              styles.secondaryButton,
              (isResending || resendCooldown > 0) && styles.disabledButton,
            ]}
            onPress={handleResendVerification}
            disabled={isResending || resendCooldown > 0}
            activeOpacity={0.8}
          >
            {/* Animated green outline */}
            <Animated.View
              style={[
                styles.successOutline,
                {
                  opacity: outlineOpacityAnim,
                }
              ]}
              pointerEvents="none"
            />
            
            {/* Icon container with transitions */}
            <View style={styles.buttonIconContainer}>
              {isResending ? (
                <CustomSpinner size={16} />
              ) : (
                <>
                  {/* Send icon - slides down and back up */}
                  <Animated.View
                    style={[
                      styles.iconWrapper,
                      {
                        transform: [{ translateY: sendIconYAnim }],
                        opacity: sendIconYAnim.interpolate({
                          inputRange: [-10, 0, 10, 40],
                          outputRange: [0, 1, 0.8, 0],
                          extrapolate: 'clamp',
                        }),
                      }
                    ]}
                  >
                    <Ionicons name="send" size={16} color="#FFFFFF" />
                  </Animated.View>
                  
                  {/* Check icon - slides in from top */}
                  <Animated.View
                    style={[
                      styles.iconWrapper,
                      {
                        transform: [{ translateY: checkIconYAnim }],
                        opacity: checkIconYAnim.interpolate({
                          inputRange: [-40, -10, 0, 10],
                          outputRange: [0, 0, 1, 0],
                          extrapolate: 'clamp',
                        }),
                      }
                    ]}
                  >
                    <Ionicons name="checkmark" size={18} color="#22C55E" />
                  </Animated.View>
                </>
              )}
            </View>
            
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
          <Animated.View 
            style={[styles.loadingBlocker, { opacity: spinnerFadeAnim }]} 
            pointerEvents="auto" 
          />
          <Animated.View style={[
            styles.loadingOverlay, 
            { 
              opacity: spinnerFadeAnim,
              transform: [{ scale: spinnerScaleAnim }]
            }
          ]} pointerEvents="auto">
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
  emailIconContainer: {
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
  iconContainer: {
    position: 'relative',
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
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
  overflow: 'visible',
    position: 'relative',
  },
  primaryButtonFail: {
    backgroundColor: '#DC2626', // red
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
  successOutline: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#22C55E',
    zIndex: 1,
  },
  verifyOutline: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#991B1B',
    zIndex: 1,
  },
  buttonIconContainer: {
    position: 'relative',
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrapper: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    width: 20,
    height: 20,
  },
  primaryIconContainer: {
    width: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  overflow: 'visible',
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
  primaryButtonTextFail: {
    color: '#FFFFFF',
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
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 999,
  },
});
