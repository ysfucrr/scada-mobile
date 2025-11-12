import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useConnection } from '../context/ConnectionContext';
import { useWebSocket } from '../context/WebSocketContext';
import ApiService from '../services/ApiService';
import AuthService from '../services/AuthService';

const { width, height } = Dimensions.get('window');

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
  onNavigateToSettings?: () => void;
}

// Agent bilgisi için tip tanımı
interface Agent {
  id: string;
  name: string;
  connectedAt: string;
  uptime: number;
}

export default function LoginScreen({ onLoginSuccess, onNavigateToSettings }: LoginScreenProps = {}) {
  const { connect } = useConnection();
  const { selectAgent, clearAllRegisterValues } = useWebSocket();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  
  // Agent selection state
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [showAgentSelector, setShowAgentSelector] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const logoScaleAnim = useRef(new Animated.Value(0)).current;
  const logoRotateAnim = useRef(new Animated.Value(0)).current;
  const formOpacityAnim = useRef(new Animated.Value(0)).current;
  const backgroundPulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(logoScaleAnim, {
        toValue: 1,
        tension: 40,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.timing(formOpacityAnim, {
        toValue: 1,
        duration: 600,
        delay: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Logo rotation animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoRotateAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(logoRotateAnim, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Background pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(backgroundPulseAnim, {
          toValue: 1.05,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(backgroundPulseAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Clear any previously selected agent before loading the login screen
    const clearPreviousAgent = async () => {
      console.log('[LoginScreen] Clearing any previous agent selection on screen load');
      await ApiService.setSelectedAgentId(null);
      setSelectedAgent(null);
    };
    
    clearPreviousAgent().then(() => {
      checkAutoLogin();
      fetchAvailableAgents();
    });
  }, []);
  
  // Sunucudan bağlı agent'ları çek
  const fetchAvailableAgents = async () => {
    try {
      setLoadingAgents(true);
      
      // Önce API Service'deki agent ID'yi temizle
      console.log('[LoginScreen] Clearing agent selection before fetching agents');
      await ApiService.setSelectedAgentId(null);
      
      // Agent listesini ApiService üzerinden al
      const agentsList = await ApiService.getAvailableAgents();
      
      console.log('[LoginScreen] Fetched agents:', agentsList);
      
      if (agentsList && agentsList.length > 0) {
        setAgents(agentsList);
        
        // Artık otomatik seçim yapmıyoruz - kullanıcı manuel seçmeli
        // Böylece farklı agent'lara login yaparken sorun yaşanmaz
        console.log('[LoginScreen] Agent list loaded, waiting for user selection');
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

    // Demo modu kontrolü
    const demoMode = await AsyncStorage.getItem('demoMode');
    const isDemoMode = demoMode === 'true';
    
    // Demo modu aktifse ve kullanıcı demo/demo girerse
    if (isDemoMode && username.toLowerCase() === 'demo' && password.toLowerCase() === 'demo') {
      setIsLoading(true);
      try {
        console.log('[LoginScreen] Demo mode login detected');
        
        // Demo kullanıcı objesi oluştur
        const demoUser = {
          _id: 'demo-user-id',
          username: 'demo',
          email: 'demo@scada-mobile.com',
          role: 'user',
          name: 'Demo User'
        };
        
        // AuthService'e demo kullanıcıyı kaydet (basit bir şekilde)
        await AsyncStorage.setItem('demoUser', JSON.stringify(demoUser));
        await AsyncStorage.setItem('isLoggedIn', 'true');
        
        // Demo modu için bağlantı kurma (gerçek bağlantı olmadan)
        console.log('[LoginScreen] Demo mode login successful');
        
        // Login başarılı - Home'a git
        if (onLoginSuccess) {
          onLoginSuccess();
        }
      } catch (error: any) {
        console.error('[LoginScreen] Demo login error:', error);
        Alert.alert('Error', 'Demo login failed. Please try again.');
      } finally {
        setIsLoading(false);
      }
      return;
    }
    
    // Normal login akışı
    if (agents.length > 0 && !selectedAgent) {
      Alert.alert('Error', 'Please select a SCADA system to connect to');
      return;
    }

    setIsLoading(true);
    try {
      console.log(`[LoginScreen] Starting login process with agent: ${selectedAgent?.id} (${selectedAgent?.name})`);
      
      // Demo modunu kapat (normal login)
      await AsyncStorage.removeItem('demoMode');
      
      // First, reset any existing connections to ensure a clean start
      console.log('[LoginScreen] Resetting API service connections before login');
      await ApiService.initialize();
      
      // Set the selected agent ID with a clean slate
      if (selectedAgent?.id) {
        console.log(`[LoginScreen] Setting ApiService agent ID to: ${selectedAgent.id}`);
        await ApiService.setSelectedAgentId(selectedAgent.id);
        
        // Double check the API service agent ID is set correctly
        const currentAgentId = ApiService.getSelectedAgentId();
        console.log(`[LoginScreen] Confirmed ApiService agent ID: ${currentAgentId}`);
        
        if (currentAgentId !== selectedAgent.id) {
          console.error(`[LoginScreen] Agent ID mismatch! UI: ${selectedAgent.id}, API: ${currentAgentId}`);
          Alert.alert('Error', 'Agent selection issue. Please try again.');
          setIsLoading(false);
          return;
        }
        
        // Store the agent selection in a persistent variable
        await AsyncStorage.setItem('currentSelectedAgent', JSON.stringify({
          id: selectedAgent.id,
          name: selectedAgent.name
        }));
        console.log(`[LoginScreen] Saved selected agent to storage: ${selectedAgent.name}`);
      }
      
      // selectedAgent parametresini AuthService.simpleLogin'e gönder
      console.log(`[LoginScreen] Attempting login with username: ${username}, agent: ${selectedAgent?.id}`);
      const success = await AuthService.simpleLogin(
        username,
        password,
        rememberMe,
        selectedAgent?.id // Agent ID'sini gönder
      );
      
      if (success) {
        // Before updating connection context, make sure we force a clean reconnection
        console.log('[LoginScreen] Login successful, forcing clean connection update');
        
        // Ensure any existing sockets are disconnected
        try {
          const SocketIO = require('socket.io-client');
          if (typeof SocketIO.disconnectAll === 'function') {
            SocketIO.disconnectAll();
            console.log('[LoginScreen] Disconnected existing Socket.IO connections');
          }
        } catch (e) {
          console.log('[LoginScreen] No Socket.IO connections to disconnect');
        }
        
        // Now update the connection context with clean connections
        await connect();
        console.log('[LoginScreen] Connection context updated after successful login');
        
        // Finally, trigger the onLoginSuccess callback to navigate to the home screen
        if (onLoginSuccess) {
          onLoginSuccess();
        }
      } else {
        console.log(`[LoginScreen] Login failed for agent: ${selectedAgent?.id}`);
        Alert.alert('Login Failed', 'Invalid username or password for selected SCADA system');
        
        // Clear agent ID on failed login
        await ApiService.setSelectedAgentId(null);
      }
    } catch (error: any) {
      console.error(`[LoginScreen] Login error with agent ${selectedAgent?.id}:`, error);
      Alert.alert('Error', error.message || 'An error occurred during login');
      
      // Clear agent ID on error
      await ApiService.setSelectedAgentId(null);
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

  // Interpolated values for animations
  const logoRotate = logoRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-5deg', '5deg'],
  });

  return (
    <View style={styles.container}>
      {/* Top Blue Section - Limited to upper portion */}
      <Animated.View 
        style={[
          styles.topBlueSection,
          { transform: [{ scale: backgroundPulseAnim }] }
        ]}
      >
        <LinearGradient
          colors={['#0D47A1', '#1565C0', '#1E88E5', '#42A5F5']}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        {/* Decorative Circles */}
        <View style={styles.decorativeCircle1} />
        <View style={styles.decorativeCircle2} />
        <View style={styles.decorativeCircle3} />
        
      </Animated.View>
      
      {/* Settings Button - Top Right (Outside topBlueSection for better touch handling) */}
      {onNavigateToSettings && (
        <TouchableOpacity
          style={styles.settingsIconButton}
          onPress={onNavigateToSettings}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialCommunityIcons 
            name="cog-outline" 
            size={24} 
            color="#FFFFFF" 
          />
        </TouchableOpacity>
      )}

      {/* Bottom White Section */}
      <View style={styles.bottomWhiteSection} />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View 
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Modern Logo Section with Animation */}
            <Animated.View 
              style={[
                styles.logoContainer,
                {
                  transform: [
                    { scale: logoScaleAnim },
                    { rotate: logoRotate },
                  ],
                },
              ]}
            >
              <View style={styles.logoWrapper}>
                <LinearGradient
                  colors={['#1E88E5', '#42A5F5', '#90CAF9'] as [string, string, ...string[]]}
                  style={styles.logoGradient}
                >
                  <View style={styles.logoInnerGlow} />
                  <MaterialCommunityIcons 
                    name="shield-check" 
                    size={64} 
                    color="#FFFFFF" 
                  />
                </LinearGradient>
                {/* Outer glow ring */}
                <View style={styles.logoGlowRing} />
              </View>
              <Animated.Text style={[styles.title, { opacity: fadeAnim }]}>
                SCADA Mobile
              </Animated.Text>
              <Animated.Text style={[styles.subtitle, { opacity: fadeAnim }]}>
                Industrial Control System
              </Animated.Text>
            </Animated.View>

            {/* Modern Form Container with Animation */}
            <Animated.View 
              style={[
                styles.formContainer,
                {
                  opacity: formOpacityAnim,
                  transform: [
                    {
                      translateY: formOpacityAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <BlurView
                intensity={80}
                tint="light"
                style={styles.blurContainer}
              >
                <View style={styles.formContent}>
                  {/* Welcome Text */}
                  <View style={styles.welcomeSection}>
                    <Text style={styles.welcomeTitle}>Welcome Back</Text>
                    <Text style={styles.welcomeSubtitle}>Sign in to continue</Text>
                  </View>
                  {/* Username Input - Modern Design */}
                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputLabel}>Username</Text>
                    <View style={[
                      styles.inputContainer,
                      username ? styles.inputContainerFocused : null
                    ]}>
                      <View style={styles.inputIconContainer}>
                        <MaterialCommunityIcons 
                          name="account-outline" 
                          size={24} 
                          color={username ? theme.colors.primary : theme.colors.text.secondary} 
                        />
                      </View>
                      <TextInput
                        style={styles.input}
                        placeholder="Enter your username"
                        placeholderTextColor={theme.colors.text.secondary}
                        value={username}
                        onChangeText={setUsername}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>
                  </View>

                  {/* Password Input - Modern Design */}
                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputLabel}>Password</Text>
                    <View style={[
                      styles.inputContainer,
                      password ? styles.inputContainerFocused : null
                    ]}>
                      <View style={styles.inputIconContainer}>
                        <MaterialCommunityIcons
                          name="lock-outline"
                          size={24}
                          color={password ? theme.colors.primary : theme.colors.text.secondary}
                        />
                      </View>
                      <TextInput
                        style={styles.input}
                        placeholder="Enter your password"
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
                        activeOpacity={0.7}
                      >
                        <MaterialCommunityIcons
                          name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                          size={22}
                          color={password ? theme.colors.primary : theme.colors.text.secondary}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  {/* SCADA System Selector - Modern Design */}
                  {agents.length > 0 && (
                    <View style={styles.inputWrapper}>
                      <Text style={styles.inputLabel}>SCADA System</Text>
                      <TouchableOpacity
                        style={[
                          styles.inputContainer,
                          styles.agentSelectorContainer,
                          selectedAgent ? styles.selectedInputContainer : null
                        ]}
                        onPress={async () => {
                          console.log('[LoginScreen] Refreshing agent list before opening modal');
                          await fetchAvailableAgents();
                          setShowAgentSelector(true);
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.inputIconContainer}>
                          <MaterialCommunityIcons
                            name="server-network"
                            size={24}
                            color={selectedAgent ? theme.colors.primary : theme.colors.text.secondary}
                          />
                        </View>
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

                  {/* Remember Me - Modern Toggle */}
                  <View style={styles.rememberContainer}>
                    <View style={styles.rememberContent}>
                      <MaterialCommunityIcons 
                        name="bookmark-outline" 
                        size={18} 
                        color={rememberMe ? theme.colors.primary : theme.colors.text.secondary} 
                        style={styles.rememberIcon}
                      />
                      <Text style={[
                        styles.rememberText,
                        rememberMe && styles.rememberTextActive
                      ]}>
                        Remember Me
                      </Text>
                    </View>
                    <Switch
                      value={rememberMe}
                      onValueChange={setRememberMe}
                      trackColor={{ 
                        false: 'rgba(0,0,0,0.1)', 
                        true: theme.colors.primary + '40' 
                      }}
                      thumbColor={rememberMe ? theme.colors.primary : '#FFFFFF'}
                      ios_backgroundColor="rgba(0,0,0,0.1)"
                    />
                  </View>

                  {/* Login Button - Premium Design */}
                  <TouchableOpacity
                    style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
                    onPress={handleLogin}
                    disabled={isLoading}
                    activeOpacity={0.9}
                  >
                    <LinearGradient
                      colors={
                        isLoading 
                          ? ['#BDBDBD', '#9E9E9E'] as [string, string]
                          : ['#1E88E5', '#1565C0', '#0D47A1'] as [string, string, ...string[]]
                      }
                      style={styles.loginButtonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      {isLoading ? (
                        <View style={styles.loadingButtonContent}>
                          <ActivityIndicator color="#fff" size="small" />
                          <Text style={styles.loginButtonText}>Signing In...</Text>
                        </View>
                      ) : (
                        <>
                          <MaterialCommunityIcons 
                            name="login-variant" 
                            size={24} 
                            color="#FFFFFF" 
                            style={styles.loginIcon}
                          />
                          <Text style={styles.loginButtonText}>Sign In</Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>

                  {/* Security Badge - Enhanced */}
                  <View style={styles.securityBadge}>
                    <View style={styles.securityBadgeContent}>
                      <MaterialCommunityIcons 
                        name="shield-check" 
                        size={18} 
                        color={theme.colors.success} 
                      />
                      <Text style={styles.securityText}>End-to-End Encrypted</Text>
                    </View>
                  </View>
                </View>
              </BlurView>
            </Animated.View>
          </Animated.View>
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
              <TouchableOpacity 
                onPress={() => setShowAgentSelector(false)}
                style={styles.modalCloseButton}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons 
                  name="close-circle" 
                  size={28} 
                  color={theme.colors.text.secondary} 
                />
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
                      // First clear any previous selection to avoid state issues
                      await ApiService.setSelectedAgentId(null);
                      
                      // Also clear any cached register values before switching agents
                      clearAllRegisterValues();
                      
                      // Then set the new selection
                      setSelectedAgent(item);
                      
                      // Update API Service and WebSocketContext with new agent selection
                      await ApiService.setSelectedAgentId(item.id);
                      
                      // Use WebSocketContext's selectAgent method to notify server
                      await selectAgent(item.id, item.name);
                      
                      console.log(`[LoginScreen] Selected agent: ${item.name} (${item.id})`);
                      console.log(`[LoginScreen] ApiService agent ID now: ${ApiService.getSelectedAgentId()}`);
                      
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#F5F8FA',
  },
  // Top Blue Section - Limited height
  topBlueSection: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.40, // Mavi alan ekranın %40'ını kaplıyor
    overflow: 'hidden',
    zIndex: 0,
  },
  // Bottom White Section
  bottomWhiteSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    top: height * 0.40, // Mavi alanın altından başlıyor
    backgroundColor: '#F5F8FA',
    zIndex: 0,
  },
  keyboardView: {
    flex: 1,
    zIndex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0D47A1',
  },
  loadingText: {
    marginTop: 16,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  // Decorative elements
  decorativeCircle1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    top: -100,
    right: -50,
  },
  decorativeCircle2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    bottom: -50,
    left: -30,
  },
  decorativeCircle3: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    top: height * 0.15,
    right: 20,
  },
  // Settings icon button (top right)
  settingsIconButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 40,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000, // Very high z-index to ensure it's on top
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    elevation: 10, // Android shadow/elevation
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: height * 0.20, // Logo mavi ve beyaz arasında görünsün
    paddingBottom: 40,
    zIndex: 1,
  },
  // Logo styles
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoWrapper: {
    marginBottom: 24,
    position: 'relative',
  },
  logoGradient: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1E88E5',
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 15,
  },
  logoInnerGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  logoGlowRing: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    top: -10,
    left: -10,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#212121', // Beyaz arka plan üzerinde siyah
    marginBottom: 8,
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#757575', // Beyaz arka plan üzerinde gri
    letterSpacing: 0.6,
    fontWeight: '400',
  },
  // Form styles
  formContainer: {
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  blurContainer: {
    borderRadius: 28,
  },
  formContent: {
    padding: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  // Welcome section
  welcomeSection: {
    marginBottom: 28,
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: 6,
  },
  welcomeSubtitle: {
    fontSize: 15,
    color: theme.colors.text.secondary,
    fontWeight: '400',
  },
  // Input styles
  inputWrapper: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 8,
    paddingLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 248, 250, 0.9)',
    borderRadius: 16,
    paddingHorizontal: 18,
    height: 60,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  inputContainerFocused: {
    borderColor: theme.colors.primary,
    backgroundColor: 'rgba(30, 136, 229, 0.05)',
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  inputIconContainer: {
    marginRight: 12,
    width: 32,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    color: theme.colors.text.primary,
    fontSize: 16,
    fontWeight: '500',
  },
  placeholderText: {
    color: theme.colors.text.secondary,
    fontWeight: '400',
  },
  agentSelectorContainer: {
    justifyContent: 'space-between',
  },
  selectedInputContainer: {
    borderColor: theme.colors.primary,
    borderWidth: 2,
    backgroundColor: 'rgba(30, 136, 229, 0.08)',
  },
  eyeButton: {
    padding: 8,
    marginLeft: 8,
  },
  // Remember Me styles
  rememberContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  rememberContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rememberIcon: {
    marginRight: 8,
  },
  rememberText: {
    color: theme.colors.text.primary,
    fontSize: 16,
    fontWeight: '500',
  },
  rememberTextActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  // Login button styles
  loginButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: theme.colors.primary,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonGradient: {
    flexDirection: 'row',
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  loginIcon: {
    marginRight: 10,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  // Settings button
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    marginBottom: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(30, 136, 229, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(30, 136, 229, 0.3)',
  },
  settingsButtonText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  // Security badge
  securityBadge: {
    alignItems: 'center',
    marginTop: 8,
  },
  securityBadgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 20,
  },
  securityText: {
    color: theme.colors.success,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  // Agent Selector Modal Styles - Modern Design
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 20,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.text.primary,
    letterSpacing: 0.3,
  },
  modalCloseButton: {
    padding: 4,
    borderRadius: 20,
  },
  loadingAgentsContainer: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingAgentsText: {
    marginTop: 20,
    color: theme.colors.text.secondary,
    fontSize: 16,
    fontWeight: '500',
  },
  noAgentsContainer: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noAgentsText: {
    marginTop: 24,
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  noAgentsSubText: {
    fontSize: 15,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: theme.colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  refreshButtonText: {
    color: 'white',
    marginLeft: 10,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  agentList: {
    paddingBottom: 20,
  },
  agentItem: {
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderRadius: 16,
    marginVertical: 4,
    backgroundColor: 'rgba(245, 248, 250, 0.5)',
  },
  selectedAgentItem: {
    backgroundColor: `${theme.colors.primary}15`,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  agentItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  agentItemText: {
    marginLeft: 16,
    flex: 1,
  },
  agentItemName: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: 6,
  },
  agentItemInfo: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    fontWeight: '400',
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    marginVertical: 8,
  },
});