import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '@/firebaseConfig';
import { reload, signOut } from 'firebase/auth';
import { useAuth } from '@/context/AuthContext';
import CustomSpinner from '@/components/CustomSpinner';
import AuthBackground from '@/components/AuthBackground';
import { SignupService } from '@/services/signupService';

interface EmailVerificationGuardProps {
  children: React.ReactNode;
}

export default function EmailVerificationGuard({ children }: EmailVerificationGuardProps) {
  const { currentUser, userProfile, loading: authLoading, isFromSignup, setIsFromSignup } = useAuth();
  const router = useRouter();
  const [isCheckingVerification, setIsCheckingVerification] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  console.log('[EmailVerificationGuard] Render - authLoading:', authLoading, 'currentUser:', currentUser?.uid || 'null', 'isFromSignup:', isFromSignup);

  // Handle navigation when user is not authenticated
  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.replace('/landing');
    }
  }, [authLoading, currentUser, router]);

  // Cooldown timer for resend button
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const checkEmailVerification = async () => {
    if (!currentUser) return;
    
    setIsCheckingVerification(true);
    try {
      await reload(currentUser);
      if (currentUser.emailVerified) {
        // Check if there's a pending signup to complete
        const hasPending = await SignupService.hasPendingSignup();
        if (hasPending) {
          await SignupService.completePendingSignup();
        }
        // Email is now verified, clear the signup flag
        setIsFromSignup(false);
        // Email is now verified, the AuthContext will update automatically
        return;
      }
    } catch (error) {
      console.error('Error checking email verification:', error);
      // Silently handle network errors in the guard - don't interrupt the flow
    } finally {
      setIsCheckingVerification(false);
    }
  };

  const handleResendVerification = async () => {
    if (!currentUser || resendCooldown > 0) return;
    
    setIsResending(true);
    try {
      await SignupService.resendVerificationEmail();
      setResendCooldown(60); // 60 second cooldown
      Alert.alert(
        'Verification Email Sent',
        'A new verification email has been sent to your inbox.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('Error resending verification email:', error);
      
      // Handle network errors specifically
      if (error?.code === 'auth/network-request-failed') {
        Alert.alert(
          'No Internet Connection',
          'Please check your internet connection and try again.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Error',
          'Failed to send verification email. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setIsResending(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out? You\'ll need to verify your email when you sign back in.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsFromSignup(false); // Clear signup flag on sign out
              await signOut(auth);
              router.replace('/landing');
            } catch (error) {
              console.error('Error signing out:', error);
            }
          },
        },
      ]
    );
  };

  // Show loading while checking auth state
  if (authLoading) {
    console.log('[EmailVerificationGuard] Showing loading screen - authLoading is true');
    return (
      <AuthBackground>
        <View style={styles.loadingContainer}>
          <CustomSpinner size={48} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </AuthBackground>
    );
  }

  // If user is not logged in, show loading while navigation happens
  if (!currentUser) {
    console.log('[EmailVerificationGuard] No currentUser, showing loading while redirecting');
    return (
      <AuthBackground>
        <View style={styles.loadingContainer}>
          <CustomSpinner size={48} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </AuthBackground>
    );
  }

  // If email is verified, show the protected content
  if (currentUser.emailVerified || userProfile?.emailVerified) {
    console.log('[EmailVerificationGuard] Email verified, showing children');
    return <>{children}</>;
  }

  // If user came from login (not signup), skip verification check and show protected content
  if (!isFromSignup) {
    console.log('[EmailVerificationGuard] Not from signup, showing children');
    return <>{children}</>;
  }

  // Show email verification screen only for users coming from signup
  return (
    <AuthBackground>
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="mail" size={80} color="#FFFFFF" />
          </View>
          
          <Text style={styles.title}>Verify Your Email</Text>
          <Text style={styles.subtitle}>
            We've sent a verification email to{'\n'}
            <Text style={styles.emailText}>{currentUser.email}</Text>
          </Text>
          
          <Text style={styles.description}>
            Please check your inbox and click the verification link to continue. 
            If you don't see the email, check your spam folder.
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
                <Ionicons name="refresh" size={20} color="#000000" />
              )}
              <Text style={styles.primaryButtonText}>
                {isCheckingVerification ? 'Checking...' : 'I\'ve Verified'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryButton, (isResending || resendCooldown > 0) && styles.disabledButton]}
              onPress={handleResendVerification}
              disabled={isResending || resendCooldown > 0}
              activeOpacity={0.8}
            >
              {isResending ? (
                <CustomSpinner size={16} />
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
            style={styles.signOutButton}
            onPress={handleSignOut}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out" size={16} color="rgba(255, 255, 255, 0.7)" />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>
    </AuthBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 16,
    fontSize: 16,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
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
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  disabledButton: {
    opacity: 0.6,
  },
  footer: {
    paddingBottom: 40,
    alignItems: 'center',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
  },
  signOutText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '500',
  },
});
