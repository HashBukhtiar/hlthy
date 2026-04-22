import React from 'react';
import { ScrollView, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TermsOfService() {
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.lastUpdated}>Last updated: April 22, 2025</Text>
        
        <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
        <Text style={styles.text}>
          By accessing and using Hlthy, you accept and agree to be bound by the terms 
          and provision of this agreement.
        </Text>

        <Text style={styles.sectionTitle}>2. Description of Service</Text>
        <Text style={styles.text}>
          Hlthy is a social fitness application that allows users to track workouts, 
          share achievements, and connect with other fitness enthusiasts.
        </Text>

        <Text style={styles.sectionTitle}>3. User Responsibilities</Text>
        <Text style={styles.text}>
          You are responsible for maintaining the confidentiality of your account and 
          password, and for all activities that occur under your account.
        </Text>

        <Text style={styles.sectionTitle}>4. Content Guidelines</Text>
        <Text style={styles.text}>
          Users must not post content that is harmful, offensive, or violates the rights 
          of others. We reserve the right to remove inappropriate content.
        </Text>

        <Text style={styles.sectionTitle}>5. Privacy</Text>
        <Text style={styles.text}>
          Your privacy is important to us. Please review our Privacy Policy to understand 
          how we collect and use your information.
        </Text>

        <Text style={styles.sectionTitle}>6. Limitation of Liability</Text>
        <Text style={styles.text}>
          The service is provided "as is" without warranties of any kind. We shall not 
          be liable for any damages arising from your use of the service.
        </Text>

        <Text style={styles.sectionTitle}>7. Termination</Text>
        <Text style={styles.text}>
          We may terminate or suspend your account immediately, without prior notice, 
          for conduct that we believe violates these Terms of Service.
        </Text>

        <Text style={styles.sectionTitle}>8. Changes to Terms</Text>
        <Text style={styles.text}>
          We reserve the right to modify these terms at any time. Changes will be 
          effective immediately upon posting.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  lastUpdated: {
    color: '#666',
    fontSize: 13,
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 10,
  },
  text: {
    color: '#DDD',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
});