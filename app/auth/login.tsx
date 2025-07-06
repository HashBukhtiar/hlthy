import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import AuthBackground from '@/components/AuthBackground';
import LoginForm from '@/components/LoginForm';

export default function LoginScreen() {
  const router = useRouter();

  const handleBackToLanding = () => {
    router.back();
  };

  const handleForgotPassword = () => {
    router.push('/auth/forgot-password');
  };

  return (
    <AuthBackground>
      <SafeAreaView style={styles.safeArea}>
        <LoginForm 
          visible={true}
          onBackPress={handleBackToLanding}
          onForgotPasswordPress={handleForgotPassword}
        />
      </SafeAreaView>
    </AuthBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
});
