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
import LoadingOverlay from '@/components/LoadingOverlay';
import { SignupService } from '@/services/signupService';

// Animated wrappers for touchable and text so we can animate colors
const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);
const AnimatedText = Animated.createAnimatedComponent(Text);

interface EmailVerificationScreenProps {
  visible: boolean;
  userEmail: string;
  onVerificationComplete: () => void;
  onBackToSignUp: () => void;
  emailSent?: boolean; // New prop to indicate when email was actually sent
  pendingTimestamp?: number;
}

export default function EmailVerificationScreen({
  visible,
  userEmail,
  onVerificationComplete,
  onBackToSignUp,
  emailSent = false,
  pendingTimestamp,
}: EmailVerificationScreenProps) {
  const { width, height } = Dimensions.get('window');
  const router = useRouter();
  
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isCheckingVerification, setIsCheckingVerification] = useState(false);
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [isVerificationFailed, setIsVerificationFailed] = useState(false);
  const [isAccountDeleted, setIsAccountDeleted] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);
  const [hasPendingSignup, setHasPendingSignup] = useState(false);
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
        // Check silently without showing failure animation
        checkEmailVerification(false);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [visible]);

  // Expire the flow using the local countdown only. When countdownSeconds hits 0
  // mark the verification as expired and show the expired UI. This avoids
  // relying on cloud checks for deletion while the user is on the device.
  useEffect(() => {
    if (!visible) return;
    if (countdownSeconds === null) return;
    if (isAccountDeleted) return;

    // Only mark expired when there was a pending signup for this device/session.
    if (countdownSeconds <= 0 && hasPendingSignup) {
      console.log('[EmailVerificationScreen] countdown reached 0 — marking account as expired locally');
      setIsAccountDeleted(true);
    }
  }, [visible, countdownSeconds, isAccountDeleted]);

  // Cooldown timer for resend button
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Start countdown when email is actually sent, not just when screen becomes visible
  useEffect(() => {
    if (emailSent && resendCooldown === 0) {
      setResendCooldown(60);
    }
  }, [emailSent]);

  // Countdown for verification expiry (5 minutes from pending signup timestamp)
  useEffect(() => {
    if (!visible || isAccountDeleted) {
      setCountdownSeconds(null);
      return;
    }

    let interval: ReturnType<typeof setInterval> | null = null;
    let mounted = true;

    const setupCountdown = async () => {
      try {
        const pending = await SignupService.getPendingSignupData();
        if (!pending || !mounted) {
          console.log('[EmailVerificationScreen] setupCountdown: no pending signup data');
          setHasPendingSignup(false);
          setCountdownSeconds(null);
          return;
        }

        // We have pending signup data for this device/session
        setHasPendingSignup(true);

        const expiryMs = pending.timestamp + 5 * 60 * 1000; // 5 minutes
        const now = Date.now();
        const initialRemaining = Math.max(0, Math.ceil((expiryMs - now) / 1000));

        // Diagnostic log to help trace why a flow might be immediately expired
        console.log('[EmailVerificationScreen] setupCountdown:', {
          pendingTimestamp: pending.timestamp,
          expiryMs,
          now,
          initialRemaining,
        });

        // If the initial remaining time is 0 but the pending record was created very
        // recently (within the last 10s), treat this as a likely race / tiny clock skew
        // and start the countdown at full 5 minutes so the user sees the expected UI.
        if (initialRemaining <= 0) {
          const ageMs = now - pending.timestamp;
          if (ageMs < 10 * 1000) {
            // Start fresh countdown for new signups
            setCountdownSeconds(5 * 60);
            // still install interval to tick down
            interval = setInterval(() => {
              if (!mounted) return;
              const remaining = Math.max(0, Math.ceil((expiryMs - Date.now()) / 1000));
              setCountdownSeconds(remaining);
              if (remaining <= 0 && interval) {
                clearInterval(interval);
                interval = null;
              }
            }, 1000);
            return;
          }

          // Otherwise treat as expired
          setCountdownSeconds(0);
          return;
        }

        // Normal startup path
        const tick = () => {
          const remaining = Math.max(0, Math.ceil((expiryMs - Date.now()) / 1000));
          if (!mounted) return;
          setCountdownSeconds(remaining);
          if (remaining <= 0 && interval) {
            clearInterval(interval);
            interval = null;
          }
        };

        tick();
        interval = setInterval(tick, 1000);
      } catch (e) {
        console.warn('[EmailVerificationScreen] setupCountdown error:', e);
        setCountdownSeconds(null);
      }
    };

    setupCountdown();

    return () => {
      mounted = false;
      if (interval) clearInterval(interval);
    };
  }, [visible, isAccountDeleted]);

  const formatCountdown = (seconds: number | null) => {
    if (seconds === null) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
  };

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

  const checkEmailVerification = useCallback(async (showAnimation: boolean = true) => {
    if (!auth.currentUser) {
      console.log('[EmailVerificationScreen] checkEmailVerification: no auth.currentUser yet — waiting for auth state to hydrate');
      // If there's no pending signup, don't proceed
      const hasPending = await SignupService.hasPendingSignup();
      console.log('[EmailVerificationScreen] checkEmailVerification: hasPendingSignup=', hasPending);
      if (!hasPending) return;
      // We don't call the cloud deletion check here; rely on the local countdown instead.
      return;
    }
    
    setIsCheckingVerification(true);
    try {
  console.log('[EmailVerificationScreen] checkEmailVerification: auth.currentUser uid=', auth.currentUser?.uid);
  // Do not call the cloud deletion checker here; rely on local countdown expiry.
  await reload(auth.currentUser);
      if (auth.currentUser.emailVerified) {
        // Complete the signup process with stored data
        await SignupService.completePendingSignup();
        onVerificationComplete();
        return;
      }

      // If we reach here, verification check did not find a verified email.
      // Only show failure animation if this was a user-initiated check
      if (!showAnimation) {
        setIsCheckingVerification(false);
        return;
      }

      // Trigger a failure feedback animation (red button, X slides in from bottom,
      // check slides out to top and later slides back in from top).
      setIsVerificationFailed(true);
      // show feedback state
      // reset animation values
      verifyFailAnim.setValue(0);
      verifyXIconYAnim.setValue(60);
      verifyCheckIconYAnim.setValue(0);
      verifyOutlineOpacityAnim.setValue(0);

      // Phase 1: Check slides up/out, X slides in from bottom, synchronized like resend button
      // Set starting positions for smooth entrance animations
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
    } catch (error: any) {
      console.error('Error checking email verification:', error);
      
      // Check if this error indicates account was deleted
      if (error?.code === 'auth/user-not-found' || 
          error?.code === 'auth/user-disabled' ||
          error?.code === 'auth/invalid-user-token') {
        setIsAccountDeleted(true);
        setIsCheckingVerification(false);
        return;
      }
      
      // On other errors, only show failure feedback if this was user-initiated
      if (!showAnimation) {
        setIsCheckingVerification(false);
        return;
      }
      
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
      console.log('[EmailVerificationScreen] handleResendVerification: auth.currentUser uid=', auth.currentUser?.uid);
      const hasPending = await SignupService.hasPendingSignup();
      console.log('[EmailVerificationScreen] handleResendVerification: hasPendingSignup=', hasPending);
  // We no longer call the cloud deletion checker here; resend attempts will
  // surface auth errors if the account was removed.

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
      
      // Check if this error indicates account was deleted
      if (error?.code === 'auth/user-not-found' || 
          error?.code === 'auth/user-disabled' ||
          error?.code === 'auth/invalid-user-token') {
        setIsAccountDeleted(true);
        setIsResending(false);
        return;
      }
      
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

  const handleStartOver = useCallback(async () => {
    // When the flow has expired, explicitly cancel the pending signup and
    // remove the unverified Firebase Auth account (if present) before
    // navigating back to the sign up screen.
    setIsChangingEmail(true);
    try {
      await SignupService.cancelPendingSignup();
    } catch (error) {
      console.error('[EmailVerificationScreen] handleStartOver error:', error);
      // proceed back to sign up regardless of cleanup result
    } finally {
      setIsChangingEmail(false);
      onBackToSignUp();
    }
  }, [onBackToSignUp]);

  if (!visible) return null;

  // Show account deleted message
  if (isAccountDeleted) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.emailIconContainer}>
            <Ionicons name="hourglass-outline" size={50} color="#FF6B6B" />
          </View>
          
          <Text style={styles.title}>Verification Expired</Text>
          <Text style={styles.subtitle}>
            Please start the signup process again.{'\n'}
          </Text>
          
          <Text style={styles.description}>
            For security, accounts must be verified within 5 minutes of registration.
          </Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleStartOver}
              activeOpacity={0.8}
            >
              <View style={styles.primaryIconContainer}>
                <Ionicons name="refresh" size={20} color="#000000" />
              </View>
              <Text style={styles.primaryButtonText}>
                Start Over
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

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
          Open the link to verify your email.
        </Text>

        <View style={styles.buttonContainer}>
          <AnimatedTouchableOpacity
            style={[
              styles.primaryButton,
              isCheckingVerification && styles.disabledButton,
              { backgroundColor: animatedBackgroundColor },
            ]}
            onPress={() => checkEmailVerification(true)}
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
                    inputRange: [-60, -40, -20, 0, 20, 40],
                    outputRange: [0, 0.5, 0.8, 1, 0.8, 0],
                    extrapolate: 'clamp',
                  }),
                }}
              >
                <Ionicons name="checkmark-done-outline" size={20} color="#000000" />
              </Animated.View>

              {/* X icon (slides in from bottom on failure) */}
              <Animated.View
                style={{
                  position: 'absolute',
                  transform: [{ translateY: verifyXIconYAnim }],
                  opacity: verifyXIconYAnim.interpolate({
                    inputRange: [-20, 0, 20, 40, 60],
                    outputRange: [0, 1, 0.8, 0.5, 0],
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
              {'I\'ve Verified'}
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
        {countdownSeconds !== null && hasPendingSignup && (
          <Text style={styles.countdownText}>
            Link expires in {formatCountdown(countdownSeconds)}
          </Text>
        )}
      </View>

      {/* Loading spinner overlay */}
      <LoadingOverlay visible={isChangingEmail} message="Cleaning up..." />
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
    marginBottom: 0,
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
  countdownText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    marginTop: 8,
  },
});
