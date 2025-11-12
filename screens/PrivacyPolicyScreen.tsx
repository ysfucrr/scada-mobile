import { StatusBar } from 'expo-status-bar';
import {
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { useTheme as usePaperTheme } from 'react-native-paper';
import { useTheme as useAppTheme } from '../context/ThemeContext';

export default function PrivacyPolicyScreen() {
  const paperTheme = usePaperTheme();
  const { isDarkMode } = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={true}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: paperTheme.colors.onSurface }]}>
            Privacy Policy
          </Text>
          <Text style={[styles.lastUpdated, { color: paperTheme.colors.onSurfaceVariant }]}>
            Last Updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: paperTheme.colors.onSurface }]}>
            1. Introduction
          </Text>
          <Text style={[styles.sectionText, { color: paperTheme.colors.onSurfaceVariant }]}>
            SCADA Mobile ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application (the "App"). Please read this Privacy Policy carefully. If you do not agree with the terms of this Privacy Policy, please do not access the App.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: paperTheme.colors.onSurface }]}>
            2. Information We Collect
          </Text>
          <Text style={[styles.sectionText, { color: paperTheme.colors.onSurfaceVariant }]}>
            We do not collect personal information directly. The app only stores server connection details and credentials provided by the user to connect to their own SCADA system.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: paperTheme.colors.onSurface }]}>
            3. How We Use Your Information
          </Text>
          <Text style={[styles.sectionText, { color: paperTheme.colors.onSurfaceVariant }]}>
            The server connection details and credentials you provide are stored locally on your device and are used solely to establish and maintain connection to your SCADA system. This information is not transmitted to third parties or used for any other purpose.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: paperTheme.colors.onSurface }]}>
            4. Data Storage and Security
          </Text>
          <Text style={[styles.sectionText, { color: paperTheme.colors.onSurfaceVariant }]}>
            We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your information, we cannot guarantee absolute security.
          </Text>
          <Text style={[styles.sectionText, { color: paperTheme.colors.onSurfaceVariant, marginTop: 12 }]}>
            Your data is stored on secure servers and is encrypted in transit using industry-standard encryption protocols (HTTPS/WSS).
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: paperTheme.colors.onSurface }]}>
            5. Data Sharing and Disclosure
          </Text>
          <Text style={[styles.sectionText, { color: paperTheme.colors.onSurfaceVariant }]}>
            We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:
          </Text>
          <Text style={[styles.bulletPoint, { color: paperTheme.colors.onSurfaceVariant }]}>
            • With your explicit consent
          </Text>
          <Text style={[styles.bulletPoint, { color: paperTheme.colors.onSurfaceVariant }]}>
            • To comply with legal obligations or respond to legal requests
          </Text>
          <Text style={[styles.bulletPoint, { color: paperTheme.colors.onSurfaceVariant }]}>
            • To protect our rights, property, or safety, or that of our users
          </Text>
          <Text style={[styles.bulletPoint, { color: paperTheme.colors.onSurfaceVariant }]}>
            • With service providers who assist us in operating the App (under strict confidentiality agreements)
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: paperTheme.colors.onSurface }]}>
            6. Your Rights and Choices
          </Text>
          <Text style={[styles.sectionText, { color: paperTheme.colors.onSurfaceVariant }]}>
            You have certain rights regarding your personal information, including:
          </Text>
          <Text style={[styles.bulletPoint, { color: paperTheme.colors.onSurfaceVariant }]}>
            • Access: You can request access to your personal information
          </Text>
          <Text style={[styles.bulletPoint, { color: paperTheme.colors.onSurfaceVariant }]}>
            • Correction: You can update or correct your information through the App settings
          </Text>
          <Text style={[styles.bulletPoint, { color: paperTheme.colors.onSurfaceVariant }]}>
            • Deletion: You can request deletion of your account and associated data
          </Text>
          <Text style={[styles.bulletPoint, { color: paperTheme.colors.onSurfaceVariant }]}>
            • Opt-out: You can opt-out of certain data collection features
          </Text>
          <Text style={[styles.sectionText, { color: paperTheme.colors.onSurfaceVariant, marginTop: 12 }]}>
            To exercise these rights, please contact us using the information provided in the "Contact Us" section below.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: paperTheme.colors.onSurface }]}>
            7. Data Retention
          </Text>
          <Text style={[styles.sectionText, { color: paperTheme.colors.onSurfaceVariant }]}>
            We retain your personal information for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law. When you delete your account, we will delete or anonymize your personal information, except where we are required to retain it for legal purposes.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: paperTheme.colors.onSurface }]}>
            8. Children's Privacy
          </Text>
          <Text style={[styles.sectionText, { color: paperTheme.colors.onSurfaceVariant }]}>
            The App is not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: paperTheme.colors.onSurface }]}>
            9. Changes to This Privacy Policy
          </Text>
          <Text style={[styles.sectionText, { color: paperTheme.colors.onSurfaceVariant }]}>
            We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date. You are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy are effective when they are posted on this page.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: paperTheme.colors.onSurface }]}>
            10. International Data Transfers
          </Text>
          <Text style={[styles.sectionText, { color: paperTheme.colors.onSurfaceVariant }]}>
            Your information may be transferred to and processed in countries other than your country of residence. These countries may have data protection laws that differ from those in your country. By using the App, you consent to the transfer of your information to these countries.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: paperTheme.colors.onSurface }]}>
            11. Third-Party Services
          </Text>
          <Text style={[styles.sectionText, { color: paperTheme.colors.onSurfaceVariant }]}>
            The App does not integrate with third-party analytics or tracking tools.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: paperTheme.colors.onSurface }]}>
            12. Contact Us
          </Text>
          <Text style={[styles.sectionText, { color: paperTheme.colors.onSurfaceVariant }]}>
            If you have any questions or concerns about this Privacy Policy or our data practices, please contact us at:
          </Text>
          <Text style={[styles.contactInfo, { color: paperTheme.colors.onSurface }]}>
            Email: support@claudra.com
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: paperTheme.colors.onSurfaceVariant }]}>
            By using SCADA Mobile, you acknowledge that you have read, understood, and agree to the terms of this Privacy Policy.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 32,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
  },
  lastUpdated: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 8,
  },
  bulletPoint: {
    fontSize: 15,
    lineHeight: 24,
    marginLeft: 16,
    marginBottom: 6,
  },
  contactInfo: {
    fontSize: 15,
    lineHeight: 24,
    marginTop: 8,
    fontWeight: '500',
  },
  footer: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  footerText: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});

