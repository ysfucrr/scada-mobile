import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import {
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { Card, useTheme as usePaperTheme } from 'react-native-paper';
import GradientCard from '../components/GradientCard';
import { useTheme as useAppTheme } from '../context/ThemeContext';

export default function PrivacyPolicyScreen() {
  const paperTheme = usePaperTheme();
  const { isDarkMode } = useAppTheme();

  const gradientColors = isDarkMode ? ['#263238', '#37474F'] as const : ['#1E88E5', '#42A5F5'] as const;

  return (
    <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={true}
      >
        {/* Modern Header with Gradient */}
        <GradientCard
          colors={gradientColors}
          style={styles.headerCard}
          mode="elevated"
        >
          <View style={styles.headerContent}>
            <View style={styles.headerIconContainer}>
              <MaterialCommunityIcons
                name="shield-check"
                size={48}
                color="white"
              />
            </View>
            <Text style={styles.title}>
              Privacy Policy
            </Text>
            <View style={styles.lastUpdatedContainer}>
              <MaterialCommunityIcons
                name="calendar-clock"
                size={16}
                color="rgba(255, 255, 255, 0.9)"
              />
              <Text style={styles.lastUpdated}>
                Last Updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </Text>
            </View>
          </View>
        </GradientCard>

        {/* Section 1 */}
        <Card style={[styles.sectionCard, { backgroundColor: paperTheme.colors.surface }]} mode="elevated">
          <Card.Content>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconContainer, { backgroundColor: `${paperTheme.colors.primary}15` }]}>
                <MaterialCommunityIcons
                  name="information"
                  size={24}
                  color={paperTheme.colors.primary}
                />
              </View>
              <Text style={[styles.sectionTitle, { color: paperTheme.colors.onSurface }]}>
                1. Introduction
              </Text>
            </View>
            <Text style={[styles.sectionText, { color: paperTheme.colors.onSurfaceVariant }]}>
              SCADA Mobile ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application (the "App"). Please read this Privacy Policy carefully. If you do not agree with the terms of this Privacy Policy, please do not access the App.
            </Text>
          </Card.Content>
        </Card>

        {/* Section 2 */}
        <Card style={[styles.sectionCard, { backgroundColor: paperTheme.colors.surface }]} mode="elevated">
          <Card.Content>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconContainer, { backgroundColor: '#4CAF5015' }]}>
                <MaterialCommunityIcons
                  name="database"
                  size={24}
                  color="#4CAF50"
                />
              </View>
              <Text style={[styles.sectionTitle, { color: paperTheme.colors.onSurface }]}>
                2. Information We Collect
              </Text>
            </View>
            <Text style={[styles.sectionText, { color: paperTheme.colors.onSurfaceVariant }]}>
              We do not collect personal information directly. The app only stores server connection details and credentials provided by the user to connect to their own SCADA system.
            </Text>
          </Card.Content>
        </Card>

        {/* Section 3 */}
        <Card style={[styles.sectionCard, { backgroundColor: paperTheme.colors.surface }]} mode="elevated">
          <Card.Content>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconContainer, { backgroundColor: '#FF980015' }]}>
                <MaterialCommunityIcons
                  name="cog"
                  size={24}
                  color="#FF9800"
                />
              </View>
              <Text style={[styles.sectionTitle, { color: paperTheme.colors.onSurface }]}>
                3. How We Use Your Information
              </Text>
            </View>
            <Text style={[styles.sectionText, { color: paperTheme.colors.onSurfaceVariant }]}>
              The server connection details and credentials you provide are stored locally on your device and are used solely to establish and maintain connection to your SCADA system. This information is not transmitted to third parties or used for any other purpose.
            </Text>
          </Card.Content>
        </Card>

        {/* Section 4 */}
        <Card style={[styles.sectionCard, { backgroundColor: paperTheme.colors.surface }]} mode="elevated">
          <Card.Content>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconContainer, { backgroundColor: '#9C27B015' }]}>
                <MaterialCommunityIcons
                  name="lock"
                  size={24}
                  color="#9C27B0"
                />
              </View>
              <Text style={[styles.sectionTitle, { color: paperTheme.colors.onSurface }]}>
                4. Data Storage and Security
              </Text>
            </View>
            <Text style={[styles.sectionText, { color: paperTheme.colors.onSurfaceVariant }]}>
              We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your information, we cannot guarantee absolute security.
            </Text>
            <View style={styles.highlightBox}>
              <MaterialCommunityIcons
                name="shield-lock"
                size={20}
                color={paperTheme.colors.primary}
                style={styles.highlightIcon}
              />
              <Text style={[styles.highlightText, { color: paperTheme.colors.onSurface }]}>
                Your data is stored on secure servers and is encrypted in transit using industry-standard encryption protocols (HTTPS/WSS).
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* Section 5 */}
        <Card style={[styles.sectionCard, { backgroundColor: paperTheme.colors.surface }]} mode="elevated">
          <Card.Content>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconContainer, { backgroundColor: '#00BCD415' }]}>
                <MaterialCommunityIcons
                  name="share-variant"
                  size={24}
                  color="#00BCD4"
                />
              </View>
              <Text style={[styles.sectionTitle, { color: paperTheme.colors.onSurface }]}>
                5. Data Sharing and Disclosure
              </Text>
            </View>
            <Text style={[styles.sectionText, { color: paperTheme.colors.onSurfaceVariant }]}>
              We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:
            </Text>
            <View style={styles.bulletList}>
              <View style={styles.bulletItem}>
                <MaterialCommunityIcons name="check-circle" size={18} color={paperTheme.colors.primary} />
                <Text style={[styles.bulletPoint, { color: paperTheme.colors.onSurfaceVariant }]}>
                  With your explicit consent
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <MaterialCommunityIcons name="check-circle" size={18} color={paperTheme.colors.primary} />
                <Text style={[styles.bulletPoint, { color: paperTheme.colors.onSurfaceVariant }]}>
                  To comply with legal obligations or respond to legal requests
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <MaterialCommunityIcons name="check-circle" size={18} color={paperTheme.colors.primary} />
                <Text style={[styles.bulletPoint, { color: paperTheme.colors.onSurfaceVariant }]}>
                  To protect our rights, property, or safety, or that of our users
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <MaterialCommunityIcons name="check-circle" size={18} color={paperTheme.colors.primary} />
                <Text style={[styles.bulletPoint, { color: paperTheme.colors.onSurfaceVariant }]}>
                  With service providers who assist us in operating the App (under strict confidentiality agreements)
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Section 6 */}
        <Card style={[styles.sectionCard, { backgroundColor: paperTheme.colors.surface }]} mode="elevated">
          <Card.Content>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconContainer, { backgroundColor: '#3F51B515' }]}>
                <MaterialCommunityIcons
                  name="account-check"
                  size={24}
                  color="#3F51B5"
                />
              </View>
              <Text style={[styles.sectionTitle, { color: paperTheme.colors.onSurface }]}>
                6. Your Rights and Choices
              </Text>
            </View>
            <Text style={[styles.sectionText, { color: paperTheme.colors.onSurfaceVariant }]}>
              You have certain rights regarding your personal information, including:
            </Text>
            <View style={styles.bulletList}>
              <View style={styles.bulletItem}>
                <MaterialCommunityIcons name="eye" size={18} color={paperTheme.colors.primary} />
                <View style={styles.bulletTextContainer}>
                  <Text style={[styles.bulletLabel, { color: paperTheme.colors.onSurface }]}>Access:</Text>
                  <Text style={[styles.bulletPoint, { color: paperTheme.colors.onSurfaceVariant }]}>
                    You can request access to your personal information
                  </Text>
                </View>
              </View>
              <View style={styles.bulletItem}>
                <MaterialCommunityIcons name="pencil" size={18} color={paperTheme.colors.primary} />
                <View style={styles.bulletTextContainer}>
                  <Text style={[styles.bulletLabel, { color: paperTheme.colors.onSurface }]}>Correction:</Text>
                  <Text style={[styles.bulletPoint, { color: paperTheme.colors.onSurfaceVariant }]}>
                    You can update or correct your information through the App settings
                  </Text>
                </View>
              </View>
              <View style={styles.bulletItem}>
                <MaterialCommunityIcons name="delete" size={18} color={paperTheme.colors.primary} />
                <View style={styles.bulletTextContainer}>
                  <Text style={[styles.bulletLabel, { color: paperTheme.colors.onSurface }]}>Deletion:</Text>
                  <Text style={[styles.bulletPoint, { color: paperTheme.colors.onSurfaceVariant }]}>
                    You can request deletion of your account and associated data
                  </Text>
                </View>
              </View>
              <View style={styles.bulletItem}>
                <MaterialCommunityIcons name="cancel" size={18} color={paperTheme.colors.primary} />
                <View style={styles.bulletTextContainer}>
                  <Text style={[styles.bulletLabel, { color: paperTheme.colors.onSurface }]}>Opt-out:</Text>
                  <Text style={[styles.bulletPoint, { color: paperTheme.colors.onSurfaceVariant }]}>
                    You can opt-out of certain data collection features
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.highlightBox}>
              <MaterialCommunityIcons
                name="email"
                size={20}
                color={paperTheme.colors.primary}
                style={styles.highlightIcon}
              />
              <Text style={[styles.highlightText, { color: paperTheme.colors.onSurface }]}>
                To exercise these rights, please contact us using the information provided in the "Contact Us" section below.
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* Section 7 */}
        <Card style={[styles.sectionCard, { backgroundColor: paperTheme.colors.surface }]} mode="elevated">
          <Card.Content>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconContainer, { backgroundColor: '#607D8B15' }]}>
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={24}
                  color="#607D8B"
                />
              </View>
              <Text style={[styles.sectionTitle, { color: paperTheme.colors.onSurface }]}>
                7. Data Retention
              </Text>
            </View>
            <Text style={[styles.sectionText, { color: paperTheme.colors.onSurfaceVariant }]}>
              We retain your personal information for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law. When you delete your account, we will delete or anonymize your personal information, except where we are required to retain it for legal purposes.
            </Text>
          </Card.Content>
        </Card>

        {/* Section 8 */}
        <Card style={[styles.sectionCard, { backgroundColor: paperTheme.colors.surface }]} mode="elevated">
          <Card.Content>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconContainer, { backgroundColor: '#F4433615' }]}>
                <MaterialCommunityIcons
                  name="baby-face-outline"
                  size={24}
                  color="#F44336"
                />
              </View>
              <Text style={[styles.sectionTitle, { color: paperTheme.colors.onSurface }]}>
                8. Children's Privacy
              </Text>
            </View>
            <Text style={[styles.sectionText, { color: paperTheme.colors.onSurfaceVariant }]}>
              The App is not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately.
            </Text>
          </Card.Content>
        </Card>

        {/* Section 9 */}
        <Card style={[styles.sectionCard, { backgroundColor: paperTheme.colors.surface }]} mode="elevated">
          <Card.Content>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconContainer, { backgroundColor: '#00968815' }]}>
                <MaterialCommunityIcons
                  name="update"
                  size={24}
                  color="#009688"
                />
              </View>
              <Text style={[styles.sectionTitle, { color: paperTheme.colors.onSurface }]}>
                9. Changes to This Privacy Policy
              </Text>
            </View>
            <Text style={[styles.sectionText, { color: paperTheme.colors.onSurfaceVariant }]}>
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date. You are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy are effective when they are posted on this page.
            </Text>
          </Card.Content>
        </Card>

        {/* Section 10 */}
        <Card style={[styles.sectionCard, { backgroundColor: paperTheme.colors.surface }]} mode="elevated">
          <Card.Content>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconContainer, { backgroundColor: '#FF980015' }]}>
                <MaterialCommunityIcons
                  name="earth"
                  size={24}
                  color="#FF9800"
                />
              </View>
              <Text style={[styles.sectionTitle, { color: paperTheme.colors.onSurface }]}>
                10. International Data Transfers
              </Text>
            </View>
            <Text style={[styles.sectionText, { color: paperTheme.colors.onSurfaceVariant }]}>
              Your information may be transferred to and processed in countries other than your country of residence. These countries may have data protection laws that differ from those in your country. By using the App, you consent to the transfer of your information to these countries.
            </Text>
          </Card.Content>
        </Card>

        {/* Section 11 */}
        <Card style={[styles.sectionCard, { backgroundColor: paperTheme.colors.surface }]} mode="elevated">
          <Card.Content>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconContainer, { backgroundColor: '#4CAF5015' }]}>
                <MaterialCommunityIcons
                  name="link-off"
                  size={24}
                  color="#4CAF50"
                />
              </View>
              <Text style={[styles.sectionTitle, { color: paperTheme.colors.onSurface }]}>
                11. Third-Party Services
              </Text>
            </View>
            <Text style={[styles.sectionText, { color: paperTheme.colors.onSurfaceVariant }]}>
              The App does not integrate with third-party analytics or tracking tools.
            </Text>
          </Card.Content>
        </Card>

        {/* Section 12 - Contact */}
        <GradientCard
          colors={isDarkMode ? ['#263238', '#37474F'] as const : ['#E3F2FD', '#BBDEFB'] as const}
          style={styles.contactCard}
          mode="elevated"
        >
          <View style={styles.contactContent}>
            <View style={styles.contactHeader}>
              <MaterialCommunityIcons
                name="email"
                size={32}
                color={isDarkMode ? '#64B5F6' : '#1976D2'}
              />
              <Text style={[styles.contactTitle, { color: isDarkMode ? '#E3F2FD' : '#0D47A1' }]}>
                12. Contact Us
              </Text>
            </View>
            <Text style={[styles.contactText, { color: isDarkMode ? '#B3E5FC' : '#01579B' }]}>
              If you have any questions or concerns about this Privacy Policy or our data practices, please contact us at:
            </Text>
            <View style={styles.emailContainer}>
              <MaterialCommunityIcons
                name="email-outline"
                size={20}
                color={isDarkMode ? '#64B5F6' : '#1976D2'}
              />
              <Text style={[styles.contactEmail, { color: isDarkMode ? '#64B5F6' : '#1976D2' }]}>
                support@claudra.com
              </Text>
            </View>
          </View>
        </GradientCard>

        {/* Footer */}
        <Card style={[styles.footerCard, { backgroundColor: paperTheme.colors.surfaceVariant }]} mode="elevated">
          <Card.Content>
            <View style={styles.footerContent}>
              <MaterialCommunityIcons
                name="check-circle"
                size={24}
                color={paperTheme.colors.primary}
              />
              <Text style={[styles.footerText, { color: paperTheme.colors.onSurfaceVariant }]}>
                By using SCADA Mobile, you acknowledge that you have read, understood, and agree to the terms of this Privacy Policy.
              </Text>
            </View>
          </Card.Content>
        </Card>
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
    padding: 16,
    paddingTop: 20,
    paddingBottom: 40,
  },
  // Header Styles
  headerCard: {
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'hidden',
  },
  headerContent: {
    padding: 24,
    alignItems: 'center',
  },
  headerIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: 'white',
    marginBottom: 12,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  lastUpdatedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lastUpdated: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontStyle: 'italic',
  },
  // Section Styles
  sectionCard: {
    marginBottom: 16,
    borderRadius: 16,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
    letterSpacing: 0.3,
  },
  sectionText: {
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 8,
  },
  // Bullet List Styles
  bulletList: {
    marginTop: 12,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingLeft: 4,
  },
  bulletTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  bulletLabel: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  bulletPoint: {
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
  },
  // Highlight Box
  highlightBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(33, 150, 243, 0.08)',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  highlightIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  highlightText: {
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
    fontWeight: '500',
  },
  // Contact Card
  contactCard: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  contactContent: {
    padding: 24,
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  contactTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginLeft: 12,
    letterSpacing: 0.3,
  },
  contactText: {
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 16,
  },
  emailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  contactEmail: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  // Footer
  footerCard: {
    marginTop: 8,
    borderRadius: 16,
  },
  footerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  footerText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
    fontStyle: 'italic',
  },
});

