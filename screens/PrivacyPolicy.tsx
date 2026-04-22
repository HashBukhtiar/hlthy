import React from 'react';
import { ScrollView, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PrivacyPolicy() {
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.lastUpdated}>Last updated: April 22, 2025</Text>
        
        <Text style={styles.sectionTitle}>1. Information We Collect</Text>
        <Text style={styles.text}>
          We collect information you provide directly to us, such as when you create an account, 
          update your profile, post content, or communicate with other users.
        </Text>

        <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
        <Text style={styles.text}>
          We use the information we collect to provide, maintain, and improve our services, 
          including processing transactions, sending communications, and personalizing content.
        </Text>

        <Text style={styles.sectionTitle}>3. Information Sharing</Text>
        <Text style={styles.text}>
          We do not sell, trade, or otherwise transfer your personal information to third parties 
          without your consent, except as described in this policy.
        </Text>

        <Text style={styles.sectionTitle}>4. Data Security</Text>
        <Text style={styles.text}>
          We implement appropriate security measures to protect your personal information against 
          unauthorized access, alteration, disclosure, or destruction.
        </Text>

        <Text style={styles.sectionTitle}>5. Your Rights</Text>
        <Text style={styles.text}>
          You have the right to access, update, or delete your personal information. You can 
          manage your privacy settings within the app.
        </Text>

        <Text style={styles.sectionTitle}>6. Changes to This Policy</Text>
        <Text style={styles.text}>
          We may update this privacy policy from time to time. We will notify you of any 
          changes by posting the new policy on this page.
        </Text>

        <Text style={styles.sectionTitle}>7. Contact Us</Text>
        <Text style={styles.text}>
          If you have any questions about this privacy policy, please contact us through 
          the app's support section.
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