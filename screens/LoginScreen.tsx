import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  FlatList,
  Modal,
} from 'react-native';
import AuthService from '../services/AuthService';
import ApiService from '../services/ApiService';
import { useConnection } from '../context/ConnectionContext';

const { width } = Dimensions.get('window');

// Theme configuration
const theme = {
  colors: {
    primary: '#1E88E5',
    primaryDark: '#1565C0',
    secondary: '#00ACC1',
    background: '#F5F8FA',
    card: '#FFFFFF',
    border: '#E0E0E0',
    text: {
      primary: '#212121',
      secondary: '#757575',
    },
    gradient: ['#1E88E5', '#1976D2'] as [string, string],
    success: '#4CAF50',
    error: '#F44336',
  },
};

interface LoginScreenProps {
  onLoginSuccess?: () => void;
}

// Agent bilgisi için tip tanımı
interface Agent {
  id: string;
  name: string;
  connectedAt: string;
  uptime: number;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps = {}) {
  const { connect } = useConnection();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  
  // Agent seçimi için state'ler
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [showAgentSelector, setShowAgentSelector] = useState(false);

  useEffect(() => {
    checkAutoLogin();
    fetchAvailableAgents();
  }, []);
  
  // Sunucudan bağlı agent'ları çek
  const fetchAvailableAgents = async () => {
    try {
      setLoadingAgents(true);
      
      // Agent listesini ApiService üzerinden al
      const agentsList = await ApiService.getAvailableAgents();
      
      console.log('[LoginScreen] Fetched agents:', agentsList);
      
      if (agentsList && agentsList.length > 0) {
        setAgents(agentsList);
        
        // Eğer sadece bir agent varsa otomatik olarak seç
        if (agentsList.length === 1) {
          setSelectedAgent(agentsList[0]);
          // Also update the ApiService with the selected agent
          await ApiService.setSelectedAgentId(agentsList[0].id);
        }
      }
    } catch (error) {
      console.error('[LoginScreen] Error fetching agents:', error);
    } finally {
      setLoadingAgents(false);
    }
  };

  const checkAutoLogin = async () => {
    try {
      // Sadece kayıtlı kullanıcı bilgilerini form'a doldur
      // Otomatik login yapmayı App.tsx'e bırak
      const savedCredentials = await AuthService.getSavedCredentials();
      if (savedCredentials && savedCredentials.username) {
        setUsername(savedCredentials.username);
        setRememberMe(savedCredentials.rememberMe);
        console.log('[LoginScreen] Loaded saved credentials for form');
      }
    } catch (error) {
      console.error('Error loading saved credentials:', error);
    } finally {
      setIsCheckingAuth(false);
    }
  };

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Error', 'Username and password are required');
      return;
    }
    
    if (agents.length > 0 && !selectedAgent) {
      Alert.alert('Error', 'Please select a SCADA system to connect to');
      return;
    }

    setIsLoading(true);
    try {
      // Make sure ApiService has the latest agent ID
      if (selectedAgent?.id) {
        await ApiService.setSelectedAgentId(selectedAgent.id);
      }
      
      // selectedAgent parametresini AuthService.simpleLogin'e gönder
      const success = await AuthService.simpleLogin(
        username,
        password,
        rememberMe,
        selectedAgent?.id // Agent ID'sini gönder
      );
      
      if (success) {
        // Login başarılı olduktan sonra ConnectionContext'i güncelle
        await connect();
        console.log('[LoginScreen] Login successful, connection context updated');
        
        if (onLoginSuccess) {
          onLoginSuccess();
        }
      } else {
        Alert.alert('Login Failed', 'Invalid username or password');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Checking authentication...</Text>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={['#F5F8FA', '#E3F2FD']}
      style={styles.container}
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {/* Modern Logo Section */}
            <View style={styles.logoContainer}>
              <View style={styles.logoWrapper}>
                <LinearGradient
                  colors={theme.colors.gradient as [string, string, ...string[]]}
                  style={styles.logoGradient}
                >
                  <MaterialCommunityIcons 
                    name="shield-check" 
                    size={60} 
                    color="#FFFFFF" 
                  />
                </LinearGradient>
              </View>
              <Text style={styles.title}>SCADA Mobile</Text>
              <Text style={styles.subtitle}>Industrial Control System</Text>
            </View>

            {/* Modern Form Container */}
            <View style={styles.formContainer}>
              <BlurView
                intensity={100}
                tint="light"
                style={styles.blurContainer}
              >
                <View style={styles.formContent}>
                  {/* Username Input */}
                  <View style={styles.inputWrapper}>
                    <View style={styles.inputContainer}>
                      <MaterialCommunityIcons 
                        name="account-outline" 
                        size={22} 
                        color={theme.colors.text.secondary} 
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="Username"
                        placeholderTextColor={theme.colors.text.secondary}
                        value={username}
                        onChangeText={setUsername}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>
                  </View>

                  {/* Password Input */}
                  <View style={styles.inputWrapper}>
                    <View style={styles.inputContainer}>
                      <MaterialCommunityIcons
                        name="lock-outline"
                        size={22}
                        color={theme.colors.text.secondary}
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="Password"
                        placeholderTextColor={theme.colors.text.secondary}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      <TouchableOpacity
                        onPress={() => setShowPassword(!showPassword)}
                        style={styles.eyeButton}
                      >
                        <MaterialCommunityIcons
                          name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                          size={22}
                          color={theme.colors.text.secondary}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  {/* SCADA System Selector */}
                  {agents.length > 0 && (
                    <View style={styles.inputWrapper}>
                      <TouchableOpacity
                        style={[
                          styles.inputContainer,
                          selectedAgent ? styles.selectedInputContainer : null
                        ]}
                        onPress={() => setShowAgentSelector(true)}
                      >
                        <MaterialCommunityIcons
                          name="server-network"
                          size={22}
                          color={theme.colors.text.secondary}
                        />
                        <Text
                          style={[
                            styles.input,
                            !selectedAgent && styles.placeholderText
                          ]}
                        >
                          {selectedAgent ? selectedAgent.name : "Select SCADA System"}
                        </Text>
                        <MaterialCommunityIcons
                          name="chevron-down"
                          size={22}
                          color={theme.colors.text.secondary}
                        />
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Remember Me */}
                  <View style={styles.rememberContainer}>
                    <Text style={styles.rememberText}>Remember Me</Text>
                    <Switch
                      value={rememberMe}
                      onValueChange={setRememberMe}
                      trackColor={{ 
                        false: theme.colors.border, 
                        true: theme.colors.primary + '50' 
                      }}
                      thumbColor={rememberMe ? theme.colors.primary : '#f4f3f4'}
                      ios_backgroundColor={theme.colors.border}
                    />
                  </View>

                  {/* Login Button */}
                  <TouchableOpacity
                    style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
                    onPress={handleLogin}
                    disabled={isLoading}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={isLoading ? ['#BDBDBD', '#9E9E9E'] as [string, string] : theme.colors.gradient as [string, string]}
                      style={styles.loginButtonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      {isLoading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <>
                          <MaterialCommunityIcons 
                            name="login" 
                            size={24} 
                            color="#FFFFFF" 
                            style={styles.loginIcon}
                          />
                          <Text style={styles.loginButtonText}>Sign In</Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>

                  {/* Security Badge */}
                  <View style={styles.securityBadge}>
                    <MaterialCommunityIcons 
                      name="shield-lock-outline" 
                      size={16} 
                      color={theme.colors.success} 
                    />
                    <Text style={styles.securityText}>Secure Connection</Text>
                  </View>
                </View>
              </BlurView>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      
      {/* Agent Selection Modal */}
      <Modal
        visible={showAgentSelector}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAgentSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select SCADA System</Text>
              <TouchableOpacity onPress={() => setShowAgentSelector(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            
            {loadingAgents ? (
              <View style={styles.loadingAgentsContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingAgentsText}>Loading available systems...</Text>
              </View>
            ) : agents.length === 0 ? (
              <View style={styles.noAgentsContainer}>
                <MaterialCommunityIcons
                  name="alert-circle-outline"
                  size={48}
                  color={theme.colors.error}
                />
                <Text style={styles.noAgentsText}>No SCADA systems available</Text>
                <Text style={styles.noAgentsSubText}>Please check server connection settings</Text>
                
                <TouchableOpacity
                  style={styles.refreshButton}
                  onPress={() => {
                    fetchAvailableAgents();
                  }}
                >
                  <MaterialCommunityIcons name="refresh" size={18} color="#fff" />
                  <Text style={styles.refreshButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={agents}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.agentItem,
                      selectedAgent?.id === item.id && styles.selectedAgentItem
                    ]}
                    onPress={async () => {
                      setSelectedAgent(item);
                      // Update ApiService with selected agent ID
                      await ApiService.setSelectedAgentId(item.id);
                      console.log(`[LoginScreen] Selected agent: ${item.name} (${item.id})`);
                      setShowAgentSelector(false);
                    }}
                  >
                    <View style={styles.agentItemContent}>
                      <MaterialCommunityIcons
                        name={selectedAgent?.id === item.id ? "checkbox-marked-circle" : "server-network"}
                        size={24}
                        color={selectedAgent?.id === item.id ? theme.colors.primary : "#666"}
                      />
                      <View style={styles.agentItemText}>
                        <Text style={styles.agentItemName}>{item.name}</Text>
                        <Text style={styles.agentItemInfo}>
                          Connected since: {new Date(item.connectedAt).toLocaleTimeString()}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                contentContainerStyle={styles.agentList}
              />
            )}
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: 16,
    color: theme.colors.text.secondary,
    fontSize: 16,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoWrapper: {
    marginBottom: 20,
  },
  logoGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    letterSpacing: 0.5,
  },
  formContainer: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  blurContainer: {
    borderRadius: 24,
  },
  formContent: {
    padding: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  inputWrapper: {
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 248, 250, 0.8)',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  selectedInputContainer: {
    borderColor: theme.colors.primary,
    borderWidth: 2,
  },
  input: {
    flex: 1,
    marginLeft: 12,
    color: theme.colors.text.primary,
    fontSize: 16,
  },
  placeholderText: {
    color: theme.colors.text.secondary,
  },
  eyeButton: {
    padding: 4,
  },
  rememberContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
    paddingHorizontal: 4,
  },
  rememberText: {
    color: theme.colors.text.primary,
    fontSize: 16,
    fontWeight: '500',
  },
  loginButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonGradient: {
    flexDirection: 'row',
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loginIcon: {
    marginRight: 8,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  securityBadge: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  securityText: {
    color: theme.colors.success,
    fontSize: 14,
    fontWeight: '500',
  },
  // Agent Selector Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text.primary,
  },
  loadingAgentsContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingAgentsText: {
    marginTop: 16,
    color: theme.colors.text.secondary,
    fontSize: 16,
  },
  noAgentsContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noAgentsText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  noAgentsSubText: {
    marginTop: 8,
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: 24,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: 'white',
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  agentList: {
    paddingBottom: 16,
  },
  agentItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  selectedAgentItem: {
    backgroundColor: `${theme.colors.primary}15`,
  },
  agentItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  agentItemText: {
    marginLeft: 12,
    flex: 1,
  },
  agentItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  agentItemInfo: {
    fontSize: 12,
    color: theme.colors.text.secondary,
  },
  separator: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 4,
  },
});