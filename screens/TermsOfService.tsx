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

export default function TermsOfService() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={[styles.content, { paddingBottom: 32 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        <Text style={styles.effectiveDate}>Effective date: June 22, 2026</Text>
        <Para>
          Please read these Terms of Service ("Terms") carefully before using the hlthy mobile
          application or website. By creating an account or using hlthy, you agree to be bound by
          these Terms.
        </Para>

        <Section>1. Who we are</Section>
        <Para>
          hlthy ("we", "our", "us", or "hlthy") is a fitness and social media application operated by
          an individual developer based in Ontario, Canada.
        </Para>
        <Para><Text style={styles.bold}>Email:</Text> support@hlthy.ca</Para>
        <Para><Text style={styles.bold}>Website:</Text> https://hlthy.ca</Para>

        <Section>2. Eligibility</Section>
        <Para>
          You must be at least 16 years old to use hlthy. By creating an account, you confirm that you
          are 16 or older. If we discover that a user is under 16, we will terminate their account
          immediately.
        </Para>

        <Section>3. Your account</Section>
        <Bullet>You are responsible for maintaining the confidentiality of your login credentials.</Bullet>
        <Bullet>You are responsible for all activity that occurs under your account.</Bullet>
        <Bullet>
          You must provide accurate information when creating your account and keep it up to date.
        </Bullet>
        <Bullet>
          You may not create more than one account, impersonate another person, or use a username that
          is misleading, offensive, or infringes another person's rights.
        </Bullet>
        <Bullet>You may not transfer your account to another person.</Bullet>

        <Section>4. User-generated content</Section>
        <SubTitle>4.1 Your content</SubTitle>
        <Para>
          hlthy allows you to post workouts, personal records (milestones), photos, comments, and
          direct messages ("User Content"). You retain ownership of content you create.
        </Para>
        <Para>
          By posting User Content on hlthy, you grant us a non-exclusive, royalty-free, worldwide
          licence to store, display, reproduce, and distribute your content solely for the purpose of
          operating and improving hlthy. This licence ends when you delete the content or close your
          account.
        </Para>
        <SubTitle>4.2 What you may not post</SubTitle>
        <Para>You agree not to post content that:</Para>
        <Bullet>Is false, misleading, or impersonates another person</Bullet>
        <Bullet>Is sexually explicit, pornographic, or contains nudity</Bullet>
        <Bullet>Depicts or promotes violence, self-harm, eating disorders, or dangerous behaviour</Bullet>
        <Bullet>Harasses, threatens, bullies, or intimidates other users</Bullet>
        <Bullet>
          Contains hate speech targeting a person or group based on race, ethnicity, religion, gender,
          sexual orientation, disability, or nationality
        </Bullet>
        <Bullet>
          Infringes the intellectual property rights of any third party (including copyrighted images
          or music)
        </Bullet>
        <Bullet>Promotes or facilitates illegal activity</Bullet>
        <Bullet>Contains spam, phishing links, or malicious software</Bullet>
        <Bullet>
          Violates the privacy of another person (including sharing someone's personal information
          without their consent)
        </Bullet>
        <Para>
          We reserve the right to remove any content that violates these Terms, and to suspend or
          terminate accounts that repeatedly violate them.
        </Para>
        <SubTitle>4.3 Reporting and moderation</SubTitle>
        <Para>
          If you see content that violates these Terms, use the in-app report function. We review
          reports and aim to respond within 24 hours. You can also block any user at any time.
        </Para>

        <Section>5. AI coaching</Section>
        <Para>hlthy includes an AI coaching feature powered by Google Gemini. By using this feature:</Para>
        <Bullet>
          You acknowledge that your messages are processed by Google's AI systems. Do not share
          sensitive personal, medical, or financial information in AI conversations.
        </Bullet>
        <Bullet>
          The AI coach provides general fitness guidance only. It is not a substitute for advice from a
          qualified medical or fitness professional. Always consult a professional before starting a
          new exercise programme, especially if you have a medical condition or injury.
        </Bullet>
        <Bullet>
          We are not liable for any injury, harm, or loss resulting from following AI-generated advice.
        </Bullet>
        <Bullet>
          We do not guarantee the accuracy, completeness, or fitness for purpose of any AI-generated
          response.
        </Bullet>

        <Section>6. Intellectual property</Section>
        <Para>
          All content, features, design, and code that is part of hlthy (excluding User Content) is
          owned by us or our licensors and is protected by applicable intellectual property laws. You
          may not copy, reproduce, distribute, or create derivative works from any part of hlthy
          without our express written permission.
        </Para>
        <Para>
          The hlthy name and logo are our trademarks. You may not use them without our prior written
          consent.
        </Para>

        <Section>7. Prohibited conduct</Section>
        <Para>In addition to the content restrictions in Section 4, you agree not to:</Para>
        <Bullet>Use hlthy for any illegal purpose or in violation of any applicable law</Bullet>
        <Bullet>Attempt to gain unauthorised access to any part of hlthy or its underlying systems</Bullet>
        <Bullet>
          Use automated tools (bots, scrapers, crawlers) to access or collect data from hlthy without
          our consent
        </Bullet>
        <Bullet>Interfere with or disrupt the integrity or performance of hlthy or its servers</Bullet>
        <Bullet>Reverse-engineer, decompile, or disassemble any part of hlthy</Bullet>
        <Bullet>Use hlthy to send unsolicited commercial messages (spam)</Bullet>
        <Bullet>Collect or store personal information about other users without their consent</Bullet>

        <Section>8. Privacy</Section>
        <Para>
          Your use of hlthy is also governed by our Privacy Policy, which is incorporated into these
          Terms by reference. Please read it carefully to understand how we collect, use, and protect
          your personal information.
        </Para>

        <Section>9. Third-party services</Section>
        <Para>
          hlthy integrates with third-party services including Firebase (Google LLC), Sentry, and
          Google Gemini. Your use of these features is also subject to those third parties' own terms
          and privacy policies. We are not responsible for the practices of third-party services.
        </Para>

        <Section>10. Account deletion</Section>
        <Para>
          You may delete your account at any time via Settings {'>'} Delete Account. Account deletion is
          permanent and irreversible. Your content will be removed from public view immediately and
          deleted from our systems within 30 days. You can also request deletion by emailing
          support@hlthy.ca.
        </Para>
        <Para>
          You may also request deletion of your account online at: [YOUR DELETION URL — e.g.
          hlthy.ca/delete-account]
        </Para>

        <Section>11. Termination by us</Section>
        <Para>We may suspend or terminate your account, with or without notice, if:</Para>
        <Bullet>You violate these Terms</Bullet>
        <Bullet>You engage in behaviour that harms other users or the hlthy community</Bullet>
        <Bullet>We are required to do so by law</Bullet>
        <Bullet>We decide to discontinue hlthy</Bullet>
        <Para>
          If we terminate your account without cause, we will give you reasonable notice where
          possible.
        </Para>

        <Section>12. Disclaimers</Section>
        <Para>
          hlthy is provided "as is" and "as available" without warranties of any kind, express or
          implied. We do not warrant that:
        </Para>
        <Bullet>hlthy will be uninterrupted, error-free, or free from viruses or other harmful components</Bullet>
        <Bullet>Any content on hlthy is accurate, complete, or reliable</Bullet>
        <Bullet>hlthy will meet your specific requirements</Bullet>
        <Para>
          Fitness content on hlthy — whether posted by users or generated by the AI coach — is for
          informational purposes only. <Text style={styles.bold}>Always consult a qualified medical or
          fitness professional before starting or changing an exercise programme.</Text>
        </Para>

        <Section>13. Limitation of liability</Section>
        <Para>
          To the maximum extent permitted by applicable law, we shall not be liable for any indirect,
          incidental, special, consequential, or punitive damages arising out of or related to your use
          of hlthy, including but not limited to loss of data, loss of profits, personal injury, or
          property damage.
        </Para>
        <Para>
          Our total liability to you for any claim arising out of these Terms or your use of hlthy
          shall not exceed CAD $100.
        </Para>
        <Para>
          Nothing in these Terms limits our liability for death or personal injury caused by our
          negligence, fraud, or any liability that cannot be excluded or limited under applicable law.
        </Para>

        <Section>14. Indemnification</Section>
        <Para>
          You agree to indemnify and hold us harmless from any claims, losses, damages, liabilities,
          costs, and expenses (including reasonable legal fees) arising from your use of hlthy, your
          User Content, or your violation of these Terms.
        </Para>

        <Section>15. Governing law and disputes</Section>
        <Para>
          These Terms are governed by the laws of the Province of Ontario and the federal laws of
          Canada applicable therein, without regard to conflict of law principles.
        </Para>
        <Para>
          Any dispute arising from these Terms or your use of hlthy that cannot be resolved informally
          shall be subject to the exclusive jurisdiction of the courts of Ontario, Canada.
        </Para>
        <Para>
          If you are a consumer resident in the EEA or UK, you may also have rights under mandatory
          local consumer protection laws that these Terms do not override.
        </Para>

        <Section>16. Changes to these Terms</Section>
        <Para>
          We may update these Terms from time to time. When we make material changes, we will notify
          you in-app and update the effective date at the top of this document. Your continued use of
          hlthy after the effective date constitutes your acceptance of the updated Terms. If you do
          not agree to the updated Terms, you must stop using hlthy and delete your account.
        </Para>

        <Section>17. Contact us</Section>
        <Para>If you have questions about these Terms, contact us at:</Para>
        <Para><Text style={styles.bold}>Email:</Text> support@hlthy.ca</Para>
        <Para><Text style={styles.bold}>Website:</Text> https://hlthy.ca</Para>

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
    marginBottom: 12,
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
