import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import AuthBackground from '@/components/AuthBackground';
import ForgotPasswordForm from '@/components/ForgotPasswordForm';

export default function ForgotPasswordScreen() {
  const router = useRouter();

  const handleBackToLogin = () => {
    router.back();
  };

  return (
    <AuthBackground>
      <SafeAreaView style={styles.safeArea}>
        <ForgotPasswordForm 
          visible={true}
          onBackPress={handleBackToLogin}
          onBackToLogin={handleBackToLogin}
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
