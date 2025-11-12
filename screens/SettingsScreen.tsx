
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import {
  ActivityIndicator,
  Card,
  Chip,
  Switch,
  TextInput,
  useTheme as usePaperTheme
} from 'react-native-paper';
import GradientCard from '../components/GradientCard';
import { useConnection } from '../context/ConnectionContext';
import { useOrientation } from '../context/OrientationContext';
import { useTheme as useAppTheme } from '../context/ThemeContext';
import ApiService, { ServerSettings } from '../services/ApiService';
import AuthService from '../services/AuthService';

interface SettingsScreenProps {
  onConnectionSuccess?: () => void;
  onUseDemo?: () => void;
}

export default function SettingsScreen({ onConnectionSuccess, onUseDemo }: SettingsScreenProps = {}) {
  const paperTheme = usePaperTheme();
  const { isDarkMode } = useAppTheme();
  const { isTablet, screenWidth, isLandscape } = useOrientation();
  const { settings, updateSettings, isConnected, disconnect } = useConnection();
  
  const [serverHost, setServerHost] = useState('');
  const [autoConnect, setAutoConnect] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (settings) {
      setServerHost(settings.serverHost);
      setAutoConnect(settings.autoConnect);
      setIsLoading(false);
    }
  }, [settings]);

  const handleUseDemo = async () => {
    try {
      // Demo modunu aktif et (server domain'i değiştirmeden)
      await AsyncStorage.setItem('demoMode', 'true');
      
      // Mevcut ayarları koru, sadece demo modunu aktif et
      // Server domain'i değiştirmiyoruz
      
      // Login ekranına yönlendir
      if (onUseDemo) {
        onUseDemo();
      }
    } catch (error) {
      console.error('Error setting up demo mode:', error);
      Alert.alert('Error', 'Failed to setup demo mode. Please try again.');
    }
  };

  const handleSaveAndConnect = async () => {
    try {
      // Demo modunu kapat (normal moda geçiş)
      await AsyncStorage.removeItem('demoMode');
      
      // Önce ayarları kaydet
      const newSettings: ServerSettings = {
        serverHost,
        serverPort: '443', // Her zaman 443 portu kullan
        useHttps: true,    // Her zaman HTTPS kullan
        autoConnect,
      };
      
      await updateSettings(newSettings);
      
      // Bağlantıyı test et
      const isConnected = await ApiService.testConnection();
      
      if (isConnected) {
        // Bağlantı başarılı - Remember me kontrolü yap
        const hasRememberMe = await AuthService.isLoggedIn();
        
        if (hasRememberMe) {
          // Remember me var, otomatik login dene
          const autoLoginSuccess = await AuthService.simpleAutoLogin();
          
          if (autoLoginSuccess) {
            // Otomatik login başarılı - direkt Home'a git
            Alert.alert(
              'Welcome Back!',
              'Automatically logged in. Redirecting to dashboard...',
              [{
                text: 'Continue',
                onPress: () => {
                  if (onConnectionSuccess) {
                    onConnectionSuccess();
                  }
                }
              }],
              { cancelable: false }
            );
          } else {
            // Otomatik login başarısız - Login ekranına git
            Alert.alert(
              'Connection Successful',
              'Server connected successfully. Please login to continue.',
              [{
                text: 'Continue to Login',
                onPress: () => {
                  if (onConnectionSuccess) {
                    onConnectionSuccess();
                  }
                }
              }],
              { cancelable: false }
            );
          }
        } else {
          // Remember me yok - Login ekranına git
          Alert.alert(
            'Connection Successful',
            'Server connected successfully. Please login to continue.',
            [{
              text: 'Continue to Login',
              onPress: () => {
                if (onConnectionSuccess) {
                  onConnectionSuccess();
                }
              }
            }],
            { cancelable: false }
          );
        }
      } else {
        // Başarısız - Settings'de kal
        Alert.alert(
          'Connection Failed',
          'Unable to connect to the server. Please check:\n\n• Server domain is correct\n• Server is running\n• HTTPS certificate is valid\n• Port 443 is accessible',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Save and connect error:', error);
      Alert.alert(
        'Error',
        'An error occurred. Please check your settings and try again.',
        [{ text: 'OK' }]
      );
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: paperTheme.colors.background }]}>
        <StatusBar style={isDarkMode ? "light" : "dark"} />
        <ActivityIndicator size="large" color={paperTheme.colors.primary} />
        <Text style={[styles.loadingText, { color: paperTheme.colors.onSurface }]}>
          Loading settings...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      
      {/* Modern Header */}
      <View style={[styles.modernHeader, { backgroundColor: 'rgba(33, 150, 243, 0.15)' }]}>
        <View style={styles.headerWrapper}>
          <View style={[
            styles.headerContent,
            isTablet ? styles.headerContentTablet : undefined
          ]}>
            <View style={styles.headerTextContainer}>
              <Text style={[styles.headerTitle, { color: paperTheme.colors.primary }]}>Settings</Text>
              <Text style={[styles.headerSubtitle, { color: paperTheme.colors.onSurfaceVariant }]}>Server Connection Configuration</Text>
            </View>
            {isConnected && (
              <View style={[styles.connectedBadge, { backgroundColor: 'rgba(76, 175, 80, 0.9)' }]}>
                <View style={styles.connectedDot} />
                <Text style={styles.connectedText}>CONNECTED</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={[
        styles.content,
        isTablet ? styles.contentTablet : undefined
      ]}>
        {/* Server Configuration Card */}
        <Card style={[
          styles.configCard,
          isTablet ? styles.configCardTablet : undefined
        ]} mode="elevated">
          <Card.Content>
            <View style={styles.sectionHeader}>
              <View style={styles.iconWrapper}>
                <MaterialCommunityIcons
                  name="server"
                  size={24}
                  color={paperTheme.colors.primary}
                />
              </View>
              <Text style={[styles.sectionTitle, { color: paperTheme.colors.onSurface }]}>
                Server Configuration
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                Server Domain
              </Text>
              <TextInput
                mode="outlined"
                value={serverHost}
                onChangeText={setServerHost}
                placeholder="example.com"
                autoCapitalize="none"
                style={styles.textInput}
                outlineColor={paperTheme.colors.outline}
                activeOutlineColor={paperTheme.colors.primary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                HTTPS Port
              </Text>
              <TextInput
                mode="outlined"
                value="443"
                editable={false}
                style={[styles.textInput, {opacity: 0.7}]}
                outlineColor={paperTheme.colors.outline}
              />
              <Text style={{color: paperTheme.colors.onSurfaceVariant, fontSize: 12, marginTop: 4}}>
                Standard port (443) is used for HTTPS
              </Text>
            </View>

            {/* Switch Options */}
            <View style={[styles.switchContainer, { backgroundColor: paperTheme.colors.surfaceVariant }]}>
              <View style={styles.switchItem}>
                <View style={styles.switchInfo}>
                  <MaterialCommunityIcons
                    name="power"
                    size={20}
                    color={paperTheme.colors.onSurfaceVariant}
                    style={styles.switchIcon}
                  />
                  <Text style={[styles.switchLabel, { color: paperTheme.colors.onSurface }]}>
                    Auto Connect on Startup
                  </Text>
                </View>
                <Switch
                  value={autoConnect}
                  onValueChange={setAutoConnect}
                  color={paperTheme.colors.primary}
                />
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Connection Info Card */}
        <GradientCard
          colors={['#1976D2', '#2196F3']}
          style={StyleSheet.flatten([
            styles.infoCard,
            ...(isTablet ? [styles.infoCardTablet] : [])
          ])}
          mode="elevated"
        >
          <BlurView
            intensity={isDarkMode ? 20 : 15}
            tint={isDarkMode ? "dark" : "light"}
            style={styles.blurContainer}
          >
            <View style={styles.infoContent}>
              <View style={styles.infoHeader}>
                <MaterialCommunityIcons
                  name="information-outline"
                  size={24}
                  color="white"
                />
                <Text style={styles.infoTitle}>Connection Info</Text>
              </View>

              <Chip
                mode="flat"
                style={styles.modeChip}
                textStyle={styles.modeChipText}
                icon={() => (
                  <MaterialCommunityIcons name="cloud-check" size={16} color="white" />
                )}
              >
                HTTPS Secure Connection
              </Chip>
              
              <View style={styles.urlContainer}>
                <View style={styles.urlItem}>
                  <Text style={styles.urlLabel}>Server URL:</Text>
                  <Text style={styles.urlValue}>
                    https://{serverHost}:443
                  </Text>
                </View>
                
                <View style={styles.urlItem}>
                  <Text style={styles.urlLabel}>WebSocket URL:</Text>
                  <Text style={styles.urlValue}>
                    wss://{serverHost}:443
                  </Text>
                </View>
              </View>
            </View>
          </BlurView>
        </GradientCard>

        {/* Use Demo Button */}
        <View style={[
          styles.buttonContainer,
          isTablet ? styles.buttonContainerTablet : undefined
        ]}>
          <TouchableOpacity
            style={[styles.actionButton, styles.demoButton, { backgroundColor: '#FF9800' }]}
            onPress={handleUseDemo}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons
              name="play-circle-outline"
              size={24}
              color="white"
              style={styles.buttonIcon}
            />
            <Text style={styles.buttonText}>Use Demo</Text>
          </TouchableOpacity>
        </View>

        {/* Action Button */}
        <View style={[
          styles.buttonContainer,
          isTablet ? styles.buttonContainerTablet : undefined
        ]}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: paperTheme.colors.primary }]}
            onPress={handleSaveAndConnect}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons
              name="cloud-check"
              size={24}
              color="white"
              style={styles.buttonIcon}
            />
            <Text style={styles.buttonText}>Save and Connect</Text>
          </TouchableOpacity>
        </View>

        <View style={{height: 20}} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    width: '100%',
    maxWidth: '100%',
    alignItems: 'stretch',
  },
  contentTablet: {
    padding: 24,
    maxWidth: 700,
    width: '100%',
    alignSelf: 'center',
    alignItems: 'stretch',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  
  // Modern Header
  modernHeader: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
  },
  headerWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    width: '100%',
    maxWidth: '100%',
  },
  headerContentTablet: {
    maxWidth: 700,
    width: '100%',
    paddingHorizontal: 24,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
  },
  connectedBadge: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  connectedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'white',
    marginRight: 6,
  },
  connectedText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'white',
  },
  
  // Configuration Card
  configCard: {
    marginBottom: 16,
    borderRadius: 16,
    elevation: 3,
    width: '100%',
  },
  configCardTablet: {
    width: '100%',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconWrapper: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 12,
    padding: 10,
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: 'transparent',
  },
  
  // Switch Container
  switchContainer: {
    borderRadius: 12,
    padding: 4,
    marginTop: 8,
  },
  switchItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  switchInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  switchIcon: {
    marginRight: 12,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  switchDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    marginHorizontal: 12,
  },
  
  // Info Card
  infoCard: {
    marginBottom: 20,
    borderRadius: 16,
    elevation: 3,
    width: '100%',
  },
  infoCardTablet: {
    width: '100%',
  },
  blurContainer: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
  },
  infoContent: {
    padding: 16,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
  },
  modeChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 16,
  },
  modeChipText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  urlContainer: {
    gap: 12,
  },
  urlItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 12,
  },
  urlLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },
  urlValue: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    fontFamily: 'monospace',
  },
  
  // Action Buttons
  buttonContainer: {
    gap: 12,
    width: '100%',
  },
  buttonContainerTablet: {
    width: '100%',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  demoButton: {
    marginBottom: 12,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
});