import React from 'react';
import { ScrollView, Text, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// Small presentational helpers so the long legal copy stays readable.
const Section = ({ children }: { children: React.ReactNode }) => (
  <Text style={styles.sectionTitle}>{children}</Text>
);
const SubTitle = ({ children }: { children: React.ReactNode }) => (
  <Text style={styles.subTitle}>{children}</Text>
);
const Para = ({ children }: { children: React.ReactNode }) => (
  <Text style={styles.text}>{children}</Text>
);
const Bullet = ({ children }: { children: React.ReactNode }) => (
  <View style={styles.bulletRow}>
    <Text style={styles.bulletDot}>{'•'}</Text>
    <Text style={styles.bulletText}>{children}</Text>
  </View>
);

export default function PrivacyPolicy() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={[styles.content, { paddingBottom: 32 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        <Text style={styles.effectiveDate}>Effective date: June 22, 2026</Text>

        <Section>1. Who we are</Section>
        <Para>
          hlthy ("we", "our", or "us") is a fitness and social media application operated by an
          individual developer based in Ontario, Canada. We are the data controller responsible for
          your personal information.
        </Para>
        <Para><Text style={styles.bold}>Email:</Text> support@hlthy.ca</Para>
        <Para><Text style={styles.bold}>Website:</Text> https://hlthy.ca</Para>

        <Section>2. What this policy covers</Section>
        <Para>
          This Privacy Policy explains what personal information we collect when you use the hlthy
          mobile application (iOS and Android) and website at hlthy.ca, why we collect it, who we
          share it with, and your rights over it.
        </Para>

        <Section>3. Information we collect</Section>
        <SubTitle>3.1 Information you provide directly</SubTitle>
        <Bullet>
          <Text style={styles.bold}>Account information</Text> — your name, username, email address,
          date of birth (for age verification), profile photo, and password (stored as a secure hash;
          we never see your plain-text password)
        </Bullet>
        <Bullet>
          <Text style={styles.bold}>Profile information</Text> — fitness archetype, bio, and any other
          details you add to your profile
        </Bullet>
        <Bullet>
          <Text style={styles.bold}>Content you post</Text> — workout posts, milestone records
          (personal records, weight goals), photos, captions, comments, and replies
        </Bullet>
        <Bullet>
          <Text style={styles.bold}>Messages</Text> — direct messages you send to other users
        </Bullet>
        <Bullet>
          <Text style={styles.bold}>AI coaching conversations</Text> — messages you send to the hlthy
          AI coaching feature
        </Bullet>

        <SubTitle>3.2 Information collected automatically</SubTitle>
        <Bullet>
          <Text style={styles.bold}>Usage data</Text> — features you use, screens you visit, actions
          you take (likes, follows, posts), and timestamps
        </Bullet>
        <Bullet>
          <Text style={styles.bold}>Device information</Text> — device type, operating system and
          version, app version, and device identifiers (such as an installation ID)
        </Bullet>
        <Bullet>
          <Text style={styles.bold}>Crash and performance data</Text> — error logs and app performance
          metrics
        </Bullet>
        <Bullet>
          <Text style={styles.bold}>Push notification tokens</Text> — a device token used to deliver
          push notifications to you
        </Bullet>

        <SubTitle>3.3 Information we do not collect</SubTitle>
        <Para>
          We do not collect your precise GPS location. We do not access your contacts. We do not
          collect payment information (hlthy is currently free). We do not serve advertising and do
          not share data with advertising networks.
        </Para>

        <Section>4. How we use your information</Section>
        <Para>We process your information for the following purposes (with the legal basis under PIPEDA / GDPR):</Para>
        <Bullet>
          <Text style={styles.bold}>Creating and managing your account</Text> — performance of contract
        </Bullet>
        <Bullet>
          <Text style={styles.bold}>Displaying your content</Text> to you and other users according to
          your visibility settings — performance of contract
        </Bullet>
        <Bullet>
          <Text style={styles.bold}>Operating the social feed, notifications, and direct messaging</Text>{' '}
          — performance of contract
        </Bullet>
        <Bullet>
          <Text style={styles.bold}>Powering the AI coaching feature</Text> — performance of contract /
          legitimate interest
        </Bullet>
        <Bullet>
          <Text style={styles.bold}>Detecting and preventing abuse, spam, and policy violations</Text>{' '}
          — legitimate interest
        </Bullet>
        <Bullet>
          <Text style={styles.bold}>Improving app performance and fixing bugs</Text> (via crash logs and
          analytics) — legitimate interest
        </Bullet>
        <Bullet>
          <Text style={styles.bold}>Complying with legal obligations</Text> — legal obligation
        </Bullet>
        <Bullet>
          <Text style={styles.bold}>Sending push notifications you have opted into</Text> — consent
        </Bullet>
        <Para>
          We do not use your information for automated decision-making that produces legal or
          similarly significant effects, other than the content moderation measures described in
          Section 7.
        </Para>

        <Section>5. AI coaching and Google Gemini</Section>
        <Para>
          The hlthy AI coaching feature is powered by Google Gemini, a third-party AI service operated
          by Google LLC. When you send a message to the AI coach:
        </Para>
        <Bullet>Your message text is transmitted to Google's servers for processing.</Bullet>
        <Bullet>
          Google processes this data in accordance with its own privacy policy and data processing
          terms. You can review Google's AI terms at https://ai.google.dev/terms.
        </Bullet>
        <Bullet>
          We do not send your name, email address, or account identifiers to Google alongside your
          message. Messages are sent with a session-scoped identifier only.
        </Bullet>
        <Bullet>
          Google may retain conversation data in accordance with its own retention policies. We
          encourage you to avoid sharing sensitive personal information (such as medical details or
          financial information) in AI coaching conversations.
        </Bullet>
        <Para>
          By using the AI coaching feature, you acknowledge that your messages will be processed by
          Google Gemini.
        </Para>

        <Section>6. International data transfers</Section>
        <Para>
          hlthy is operated from Canada. However, some of the services we use process data outside
          Canada:
        </Para>
        <Bullet>
          <Text style={styles.bold}>Firebase (Google LLC)</Text> — authentication, database, storage,
          and analytics are hosted in Google's cloud infrastructure, including servers in the United
          States. Your AI coaching conversations are processed on servers in us-central1 (Iowa, USA).
        </Bullet>
        <Bullet>
          <Text style={styles.bold}>Sentry</Text> — crash reports and error logs are processed by
          Functional Software Inc. (Sentry), based in the United States.
        </Bullet>
        <Bullet>
          <Text style={styles.bold}>Google Gemini</Text> — AI coaching messages are processed by Google
          LLC in the United States.
        </Bullet>
        <Para>
          These transfers are made under appropriate safeguards. Firebase and Sentry are covered by
          Google's and Sentry's respective data processing agreements and standard contractual clauses
          where applicable. By using hlthy, you consent to these transfers.
        </Para>

        <Section>7. Content moderation</Section>
        <Para>hlthy is a social platform. To protect our community:</Para>
        <Bullet>All posts and content are subject to our Community Guidelines and Terms of Service.</Bullet>
        <Bullet>Users can report content or other users at any time using the in-app report function.</Bullet>
        <Bullet>
          We review reports and take action (including content removal and account suspension)
          typically within 24 hours.
        </Bullet>
        <Bullet>Users can block other users at any time from within the app.</Bullet>
        <Para>
          We may use automated tools to detect content that violates our policies. Final moderation
          decisions are made by a human reviewer.
        </Para>

        <Section>8. Data sharing</Section>
        <Para>
          We do not sell your personal information. We share your data only in the following
          circumstances:
        </Para>
        <Bullet>
          <Text style={styles.bold}>With other hlthy users</Text> — content you post publicly is visible
          to all users. Content set to "followers only" is visible only to your approved followers.
          Your username and profile are always publicly visible.
        </Bullet>
        <Bullet>
          <Text style={styles.bold}>With service providers</Text> — Firebase (Google), Sentry, and
          Google Gemini as described above. These providers are contractually bound to process data
          only as instructed by us.
        </Bullet>
        <Bullet>
          <Text style={styles.bold}>For legal compliance</Text> — if required by law, a court order, or
          a regulatory authority, we may disclose information about you. We will notify you where
          legally permitted to do so.
        </Bullet>
        <Bullet>
          <Text style={styles.bold}>In a business transfer</Text> — if hlthy is acquired or its assets
          are transferred, user data may be part of the transaction. We will notify you before this
          occurs and you will have the right to delete your account.
        </Bullet>

        <Section>9. Data retention</Section>
        <Bullet>
          <Text style={styles.bold}>Account and profile information</Text> — until you delete your
          account
        </Bullet>
        <Bullet>
          <Text style={styles.bold}>Posts, workouts, milestones</Text> — until you delete them, or until
          your account is deleted
        </Bullet>
        <Bullet>
          <Text style={styles.bold}>Direct messages</Text> — until you or the other party deletes them,
          or until your account is deleted
        </Bullet>
        <Bullet>
          <Text style={styles.bold}>AI coaching conversations</Text> — session-only on our servers;
          subject to Google's retention policies on their side
        </Bullet>
        <Bullet>
          <Text style={styles.bold}>Crash logs and analytics</Text> — 90 days
        </Bullet>
        <Bullet>
          <Text style={styles.bold}>Push notification tokens</Text> — until you revoke notification
          permissions or delete your account
        </Bullet>
        <Para>
          When you delete your account, we delete your personal data within 30 days, except where we
          are required by law to retain it.
        </Para>

        <Section>10. Your rights</Section>
        <Para>
          Depending on where you live, you have the following rights over your personal data:
        </Para>
        <SubTitle>All users</SubTitle>
        <Bullet>
          <Text style={styles.bold}>Access</Text> — request a copy of the personal data we hold about
          you
        </Bullet>
        <Bullet>
          <Text style={styles.bold}>Correction</Text> — correct inaccurate information in your account
          at any time via Settings
        </Bullet>
        <Bullet>
          <Text style={styles.bold}>Deletion</Text> — delete your account and personal data via Settings
          {' > '}Delete Account, or by emailing us at support@hlthy.ca
        </Bullet>
        <SubTitle>If you are in the European Economic Area or United Kingdom (GDPR / UK GDPR)</SubTitle>
        <Bullet>
          <Text style={styles.bold}>Portability</Text> — receive your data in a structured,
          machine-readable format
        </Bullet>
        <Bullet>
          <Text style={styles.bold}>Objection</Text> — object to processing based on legitimate
          interests
        </Bullet>
        <Bullet>
          <Text style={styles.bold}>Restriction</Text> — ask us to restrict processing while a complaint
          is resolved
        </Bullet>
        <Bullet>
          <Text style={styles.bold}>Withdraw consent</Text> — where processing is based on consent (e.g.
          push notifications), withdraw it at any time
        </Bullet>
        <SubTitle>If you are a California resident (CCPA/CPRA)</SubTitle>
        <Bullet>
          <Text style={styles.bold}>Know</Text> — know what categories of personal information we
          collect and how it is used
        </Bullet>
        <Bullet>
          <Text style={styles.bold}>Delete</Text> — request deletion of your personal information
        </Bullet>
        <Bullet>
          <Text style={styles.bold}>Non-discrimination</Text> — we will not discriminate against you for
          exercising your privacy rights
        </Bullet>
        <Para>
          To exercise any of these rights, contact us at support@hlthy.ca. We will respond within
          30 days. We may ask you to verify your identity before processing your request.
        </Para>

        <Section>11. Children's privacy</Section>
        <Para>
          hlthy is intended for users aged 16 and over. We do not knowingly collect personal
          information from anyone under 16. An age gate is enforced at signup. If we become aware that
          a user under 16 has created an account, we will delete the account and associated data
          promptly. If you believe a minor has registered, please contact us at support@hlthy.ca.
        </Para>

        <Section>12. Security</Section>
        <Para>We implement industry-standard security measures including:</Para>
        <Bullet>
          Encryption in transit (TLS) for all data transmitted between the app and our servers
        </Bullet>
        <Bullet>
          Firebase Authentication for secure credential management (we never store plain-text
          passwords)
        </Bullet>
        <Bullet>Firebase Security Rules to restrict data access to authorised users only</Bullet>
        <Bullet>Role-based access controls for administrative functions</Bullet>
        <Para>
          No system is completely secure. In the event of a data breach that affects your rights and
          freedoms, we will notify you and the appropriate regulatory authority as required by law.
        </Para>

        <Section>13. Changes to this policy</Section>
        <Para>
          We may update this Privacy Policy from time to time. When we make material changes, we will
          notify you in-app and update the effective date at the top of this document. Continued use
          of hlthy after the effective date constitutes acceptance of the updated policy.
        </Para>

        <Section>14. Contact us</Section>
        <Para>
          If you have questions about this Privacy Policy or wish to exercise your rights, contact us
          at:
        </Para>
        <Para><Text style={styles.bold}>Email:</Text> support@hlthy.ca</Para>
        <Para><Text style={styles.bold}>Website:</Text> https://hlthy.ca</Para>
        <Para>
          If you are in the EEA and are not satisfied with our response, you have the right to lodge a
          complaint with your local data protection authority.
        </Para>

        <Text style={styles.lastUpdated}>Last updated: June 22, 2026</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  headerRight: {
    width: 36,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
  },
  effectiveDate: {
    color: '#8E8E93',
    fontSize: 13,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  sectionTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 8,
  },
  subTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 14,
    marginBottom: 6,
  },
  text: {
    color: '#8E8E93',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 4,
  },
  bold: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 6,
    paddingRight: 4,
  },
  bulletDot: {
    color: '#8E8E93',
    fontSize: 15,
    lineHeight: 22,
    width: 18,
  },
  bulletText: {
    color: '#8E8E93',
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
  },
  lastUpdated: {
    color: '#3A3A3C',
    fontSize: 13,
    marginTop: 40,
    textAlign: 'center',
  },
});
