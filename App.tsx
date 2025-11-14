import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { MotiView } from 'moti';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, AppState, AppStateStatus, Dimensions, Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSpring, 
  withRepeat, 
  withSequence,
  withDelay,
  interpolate,
  Easing,
  runOnJS,
  SharedValue
} from 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  Appbar,
  Divider,
  List,
  Provider as PaperProvider,
  Surface,
  Text,
  useTheme as usePaperTheme
} from 'react-native-paper';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

// Screens
import BillingScreen from './screens/BillingScreen';
import ConsumptionScreen from './screens/ConsumptionScreen';
import HomeScreen from './screens/HomeScreen';
import LoginScreen from './screens/LoginScreen';
import LogsScreen from './screens/LogsScreen';
import PeriodicReportsScreen from './screens/PeriodicReportsScreen';
import PrivacyPolicyScreen from './screens/PrivacyPolicyScreen';
import RegistersScreen from './screens/RegistersScreen';
import SettingsScreen from './screens/SettingsScreen';
import SystemLogsScreen from './screens/SystemLogsScreen';

// Contexts
import { ConnectionProvider } from './context/ConnectionContext';
import { OrientationProvider, useOrientation } from './context/OrientationContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { WebSocketProvider } from './context/WebSocketContext';

// Services
import ApiService from './services/ApiService';
import AuthService from './services/AuthService';

// Contexts
import { useConnection } from './context/ConnectionContext';
import { useWebSocket } from './context/WebSocketContext';

// Main App component
export default function AppWrapper() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <PaperProviderWithTheme>
            <OrientationProvider>
              <ConnectionProvider>
                <WebSocketProvider>
                  <MainApp />
                </WebSocketProvider>
              </ConnectionProvider>
            </OrientationProvider>
          </PaperProviderWithTheme>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// PaperProvider with dynamic theme
const PaperProviderWithTheme: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme } = useTheme();
  
  return (
    <PaperProvider theme={theme}>
      {children}
    </PaperProvider>
  );
};

// Helper components for particles and lines to avoid hooks rule violations
const AnimatedLine = React.memo(({ line, index, width }: { line: { translateY: SharedValue<number>, opacity: SharedValue<number> }, index: number, width: number }) => {
  const lineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: line.translateY.value }],
    opacity: line.opacity.value,
  }));
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: 2,
          height: 60,
          backgroundColor: 'rgba(66, 165, 245, 0.4)',
          borderRadius: 1,
          left: (width / 9) * (index + 1),
        },
        lineStyle,
      ]}
    />
  );
});

const AnimatedParticle = React.memo(({ particle, index }: { particle: { translateX: SharedValue<number>, translateY: SharedValue<number>, scale: SharedValue<number>, opacity: SharedValue<number> }, index: number }) => {
  const particleStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: particle.translateX.value },
      { translateY: particle.translateY.value },
      { scale: particle.scale.value },
    ],
    opacity: particle.opacity.value,
  }));
  return (
    <Animated.View style={[
      {
        position: 'absolute',
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
        left: 0,
        top: 0,
      },
      particleStyle
    ]}>
      <Text style={{
        fontSize: 12,
        fontWeight: '700',
        color: 'rgba(255, 255, 255, 0.9)',
        fontFamily: 'monospace',
      }}>{index % 2 === 0 ? '0' : '1'}</Text>
    </Animated.View>
  );
});

// Main App component with navigation logic
function MainApp() {
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const paperTheme = usePaperTheme();
  const { isConnected, connect } = useConnection();
  const { isConnected: wsConnected, connectionState: wsConnectionState } = useWebSocket();
  const { isLandscape, screenWidth } = useOrientation();
  const insets = useSafeAreaInsets();
  
  const [currentScreen, setCurrentScreen] = useState('Settings');
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showSplash, setShowSplash] = useState(true);
  const [agentName, setAgentName] = useState<string>('SCADA Mobile');
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [showSessionExpiredModal, setShowSessionExpiredModal] = useState(false);
  const [selectedAnalyzerName, setSelectedAnalyzerName] = useState<string | null>(null);
  const [selectedLogsAnalyzerName, setSelectedLogsAnalyzerName] = useState<string | null>(null);
  const [logEntryTitle, setLogEntryTitle] = useState<string | null>(null);
  
  // AppState tracking for session timeout
  const appStateRef = useRef(AppState.currentState);
  const backgroundTimeRef = useRef<number | null>(null);
  const SESSION_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes
  
  // Animation values - Reanimated 3
  const fadeAnim = useSharedValue(1);
  const slideAnim = useSharedValue(0);
  const menuSlideAnim = useSharedValue(-screenWidth);
  const menuFadeAnim = useSharedValue(0);
  const menuScaleAnim = useSharedValue(0.95);
  
  // Modern Splash Screen Animations - Reanimated 3
  const splashFadeAnim = useSharedValue(0);
  const logoScaleAnim = useSharedValue(0.5);
  const logoRotateAnim = useSharedValue(0);
  const geometricShape1Anim = useSharedValue(0);
  const geometricShape2Anim = useSharedValue(0);
  const geometricShape3Anim = useSharedValue(0);
  const pulseAnim = useSharedValue(1);
  const textFadeAnim = useSharedValue(0);
  const textSlideAnim = useSharedValue(50);
  const progressAnim = useSharedValue(0);
  
  // Floating particles - Reanimated 3
  const floatingParticles = useRef(
    Array.from({ length: 15 }, () => {
      const startX = Math.random() * width;
      const startY = Math.random() * height;
      return {
        startX,
        startY,
        translateX: useSharedValue(startX),
        translateY: useSharedValue(startY),
        opacity: useSharedValue(0),
        scale: useSharedValue(0.5),
      };
    })
  ).current;
  
  // Data stream lines - Reanimated 3
  const dataLines = useRef(
    Array.from({ length: 8 }, () => ({
      translateY: useSharedValue(0),
      opacity: useSharedValue(0),
    }))
  ).current;

  useEffect(() => {
    // Ultra Modern Animation Sequence - Reanimated 3
    // 1. Background fade in
    splashFadeAnim.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.ease) });

    // 2. Logo scale and rotation
    logoScaleAnim.value = withSpring(1, { damping: 6, stiffness: 40 });
    logoRotateAnim.value = withRepeat(
      withTiming(1, { duration: 10000, easing: Easing.linear }),
      -1,
      false
    );

    // 3. Geometric shapes animation
    geometricShape1Anim.value = withDelay(0, withSpring(1, { damping: 5, stiffness: 30 }));
    geometricShape2Anim.value = withDelay(200, withSpring(1, { damping: 5, stiffness: 30 }));
    geometricShape3Anim.value = withDelay(400, withSpring(1, { damping: 5, stiffness: 30 }));

    // 4. Pulse animation
    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );

    // 5. Text animations
    textFadeAnim.value = withDelay(800, withTiming(1, { duration: 800, easing: Easing.out(Easing.ease) }));
    textSlideAnim.value = withDelay(800, withSpring(0, { damping: 8, stiffness: 40 }));

    // 6. Floating particles
    floatingParticles.forEach((particle, index) => {
      particle.opacity.value = withDelay(
        index * 100,
        withTiming(0.7, { duration: 800, easing: Easing.out(Easing.ease) })
      );
      
      particle.translateY.value = withRepeat(
        withSequence(
          withTiming(particle.startY + (Math.random() * 200 - 100), {
            duration: 3000 + Math.random() * 2000,
            easing: Easing.inOut(Easing.ease)
          }),
          withTiming(particle.startY - (Math.random() * 200 - 100), {
            duration: 3000 + Math.random() * 2000,
            easing: Easing.inOut(Easing.ease)
          })
        ),
        -1,
        false
      );
      
      particle.scale.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.8, { duration: 2000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    });

    // 7. Data stream lines
    dataLines.forEach((line, index) => {
      line.opacity.value = withDelay(
        1000 + index * 150,
        withTiming(0.6, { duration: 500, easing: Easing.out(Easing.ease) })
      );
      
      line.translateY.value = withRepeat(
        withTiming(height, {
          duration: 2000 + index * 200,
          easing: Easing.linear
        }),
        -1,
        false
      );
    });

    // 8. Progress bar animation
    progressAnim.value = withDelay(
      1200,
      withTiming(1, { duration: 3000, easing: Easing.out(Easing.ease) })
    );

    // Hide splash after animation completes
    const splashTimer = setTimeout(() => {
      splashFadeAnim.value = withTiming(0, { duration: 400, easing: Easing.in(Easing.ease) }, () => {
        runOnJS(setShowSplash)(false);
      });
    }, 4800);

    checkInitialSetup();

    return () => {
      clearTimeout(splashTimer);
    };
  }, []);

  // Load agent name and demo mode from AsyncStorage
  useEffect(() => {
    const loadAgentName = async () => {
      try {
        // Demo modu kontrolü
        const demoMode = await AsyncStorage.getItem('demoMode');
        if (demoMode === 'true') {
          setAgentName('Demo Mode');
          setIsDemoMode(true);
          return;
        }
        
        setIsDemoMode(false);
        
        // Try to get from currentSelectedAgent first (LoginScreen saves it here)
        const currentAgent = await AsyncStorage.getItem('currentSelectedAgent');
        if (currentAgent) {
          const agent = JSON.parse(currentAgent);
          if (agent.name) {
            setAgentName(agent.name);
            return;
          }
        }
        
        // Fallback to selectedAgentName (WebSocketContext saves it here)
        const agentName = await AsyncStorage.getItem('selectedAgentName');
        if (agentName) {
          setAgentName(agentName);
          return;
        }
        
        // Default to 'SCADA Mobile' if no agent name found
        setAgentName('SCADA Mobile');
      } catch (error) {
        console.error('[App] Error loading agent name:', error);
        setAgentName('SCADA Mobile');
        setIsDemoMode(false);
      }
    };

    loadAgentName();
  }, [isAuthenticated, isMenuVisible]);

  // AppState listener for session timeout
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App has come to the foreground
        console.log('[App] App has come to the foreground');
        
        // Check if we were in background for more than 3 minutes
        if (backgroundTimeRef.current !== null) {
          const timeInBackground = Date.now() - backgroundTimeRef.current;
          
          if (timeInBackground >= SESSION_TIMEOUT_MS) {
            // Check if connection is lost
            const connectionLost = !wsConnected || wsConnectionState !== 'connected' || !isConnected;
            
            if (connectionLost && isAuthenticated && !isDemoMode) {
              console.log('[App] Session expired - showing modal');
              setShowSessionExpiredModal(true);
            }
          }
          
          backgroundTimeRef.current = null;
        }
      } else if (
        appStateRef.current === 'active' &&
        nextAppState.match(/inactive|background/)
      ) {
        // App has gone to the background
        console.log('[App] App has gone to the background');
        backgroundTimeRef.current = Date.now();
      }

      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [wsConnected, wsConnectionState, isConnected, isAuthenticated, isDemoMode]);

  const checkInitialSetup = async () => {
    try {
      console.log('[App] Starting initial setup check...');
      
      // Demo mode kontrolü - eğer demo mode aktifse, normal akışı atla
      const demoMode = await AsyncStorage.getItem('demoMode');
      if (demoMode === 'true') {
        console.log('[App] Demo mode active, checking demo authentication');
        setIsDemoMode(true);
        
        // Demo kullanıcı kontrolü
        const demoUser = await AsyncStorage.getItem('demoUser');
        const isLoggedIn = await AsyncStorage.getItem('isLoggedIn');
        
        if (demoUser && isLoggedIn === 'true') {
          // Demo kullanıcı zaten giriş yapmış, Home'a git
          const user = JSON.parse(demoUser);
          setCurrentUser(user);
          setIsAuthenticated(true);
          setCurrentScreen('Home');
          await connect(); // Demo modunda bağlantıyı simüle et
          console.log('[App] Demo mode user already logged in, redirecting to Home');
        } else {
          // Demo mode aktif ama kullanıcı giriş yapmamış, demo girişi yap
          await handleUseDemo();
        }
        setIsLoading(false);
        return;
      }
      
      // 1. Önce server ayarları var mı kontrol et
      const serverSettings = await ApiService.getCurrentSettings();
      console.log('[App] Server settings:', serverSettings);
      
      if (!serverSettings || !serverSettings.serverHost) {
        // İlk kurulum - Settings ekranına yönlendir
        console.log('[App] No server settings found, redirecting to Settings');
        setCurrentScreen('Settings');
        setIsLoading(false);
        return;
      }
      
      // 2. Server ayarları var, bağlantı testi yap
      console.log('[App] Testing server connection...');
      const connected = await ApiService.testConnection();
      console.log('[App] Connection test result:', connected);
      
      if (!connected) {
        // Bağlantı başarısız - Settings ekranına yönlendir
        console.log('[App] Connection failed, redirecting to Settings');
        setCurrentScreen('Settings');
        setIsLoading(false);
        return;
      }
      
      // 3. Bağlantı başarılı, remember me kontrolü yap
      console.log('[App] Connection successful, checking remember me...');
      const isLoggedIn = await AuthService.isLoggedIn();
      console.log('[App] Remember me status:', isLoggedIn);
      
      if (isLoggedIn) {
        // Remember me var, otomatik login dene
        console.log('[App] Attempting auto login...');
        const autoLoginSuccess = await AuthService.simpleAutoLogin();
        console.log('[App] Auto login result:', autoLoginSuccess);
        
        if (autoLoginSuccess) {
          // Otomatik login başarılı - ConnectionContext'i güncelle ve Home'a git
          await connect();
          const user = await AuthService.getCurrentUser();
          setCurrentUser(user);
          setIsAuthenticated(true);
          setCurrentScreen('Home');
          console.log('[App] Auto login successful, connection updated, redirecting to Home');
        } else {
          // Otomatik login başarısız - Login ekranına git
          console.log('[App] Auto login failed, redirecting to Login');
          setCurrentScreen('Login');
        }
      } else {
        // Remember me yok - Login ekranına git
        console.log('[App] No remember me, redirecting to Login');
        setCurrentScreen('Login');
      }
    } catch (error) {
      console.error('[App] Error during initial setup:', error);
      // Hata durumunda Settings ekranına yönlendir
      setCurrentScreen('Settings');
    } finally {
      setIsLoading(false);
      console.log('[App] Initial setup completed');
    }
  };

  const handleSignOut = async () => {
    try {
      await AuthService.logout();
      setCurrentUser(null);
      setIsAuthenticated(false);
      setCurrentScreen('Login');
      setIsMenuVisible(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleLoginSuccess = async () => {
    const user = await AuthService.getCurrentUser();
    setCurrentUser(user);
    setIsAuthenticated(true);
    setCurrentScreen('Home');
    console.log('[App] Login successful, user authenticated');
    // ConnectionContext zaten LoginScreen'de güncellendi
  };

  const handleConnectionSuccess = async () => {
    // Settings'den gelen başarılı bağlantı sonrası remember me kontrolü
    try {
      // Demo mode'u temizle (Settings'te Save and Connect yapıldığında)
      const demoMode = await AsyncStorage.getItem('demoMode');
      if (demoMode === 'true') {
        await AsyncStorage.removeItem('demoMode');
        await AsyncStorage.removeItem('demoUser');
        setIsDemoMode(false);
      }
      
      await connect();
      console.log('[App] Connection established from Settings');
      
      const hasRememberMe = await AuthService.isLoggedIn();
      
      if (hasRememberMe) {
        // Remember me var, otomatik login dene
        const autoLoginSuccess = await AuthService.simpleAutoLogin();
        
        if (autoLoginSuccess) {
          // Otomatik login başarılı - direkt Home'a git
          const user = await AuthService.getCurrentUser();
          setCurrentUser(user);
          setIsAuthenticated(true);
          setCurrentScreen('Home');
          console.log('[App] Auto login from Settings successful, redirecting to Home');
        } else {
          // Otomatik login başarısız - Login ekranına git
          console.log('[App] Auto login from Settings failed, redirecting to Login');
          setCurrentScreen('Login');
        }
      } else {
        // Remember me yok - Login ekranına git
        console.log('[App] No remember me from Settings, redirecting to Login');
        setCurrentScreen('Login');
      }
    } catch (error) {
      console.error('[App] Error in handleConnectionSuccess:', error);
      setCurrentScreen('Login');
    }
  };

  const handleUseDemo = async () => {
    // Demo modu aktif, direkt demo girişi yap
    console.log('[App] Demo mode activated, performing auto login');
    
    try {
      // Demo kullanıcı objesi oluştur
      const demoUser = {
        _id: 'demo-user-id',
        username: 'demo',
        email: 'demo@scada-mobile.com',
        role: 'user',
        name: 'Demo User'
      };
      
      // Demo kullanıcıyı kaydet
      await AsyncStorage.setItem('demoUser', JSON.stringify(demoUser));
      await AsyncStorage.setItem('isLoggedIn', 'true');
      
      // Kullanıcıyı set et ve Home'a git
      setCurrentUser(demoUser);
      setIsAuthenticated(true);
      setIsDemoMode(true);
      setCurrentScreen('Home');
      
      // ConnectionContext'i güncelle (demo modunda bağlı gibi davranır)
      await connect();
      
      console.log('[App] Demo mode auto login successful');
    } catch (error) {
      console.error('[App] Demo mode auto login error:', error);
      // Hata durumunda Login ekranına yönlendir
      setCurrentScreen('Login');
    }
  };

  const handleSwitchMode = async () => {
    // Demo mode'dan çık ve Settings'e git
    try {
      console.log('[App] Switching from demo mode to settings');
      
      // Demo mode'u temizle
      await AsyncStorage.removeItem('demoMode');
      await AsyncStorage.removeItem('demoUser');
      await AsyncStorage.removeItem('isLoggedIn');
      
      // State'leri temizle
      setIsDemoMode(false);
      setCurrentUser(null);
      setIsAuthenticated(false);
      setAgentName('SCADA Mobile');
      
      // Settings sayfasına git
      setCurrentScreen('Settings');
      closeMenu();
      
      console.log('[App] Switched to settings successfully');
    } catch (error) {
      console.error('[App] Error switching mode:', error);
      Alert.alert('Error', 'Failed to switch mode. Please try again.');
    }
  };

  // Animated styles for splash screen - Reanimated 3
  const splashContentStyle = useAnimatedStyle(() => ({
    opacity: splashFadeAnim.value,
  }));

  const textContainerStyle = useAnimatedStyle(() => ({
    opacity: textFadeAnim.value,
    transform: [{ translateY: textSlideAnim.value }],
  }));

  const progressBarStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: progressAnim.value }],
  }));

  // Animated styles for menu
  const menuWrapperStyle = useAnimatedStyle(() => ({
    opacity: menuFadeAnim.value,
  }));

  const menuContainerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: menuSlideAnim.value },
      { scale: menuScaleAnim.value }
    ],
  }));

  // Animated styles for screen transitions
  const screenWrapperStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [{ translateY: slideAnim.value }],
  }));


  if (showSplash) {

    return (
      <View style={styles.splashContainer}>
        {/* Ultra Modern Gradient Background */}
        <LinearGradient
          colors={['#0A1929', '#1E3A5F', '#2D4F7C', '#3A6599']}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        
        {/* Data Stream Lines Background */}
        {dataLines.map((line, index) => (
          <AnimatedLine key={`line-${index}`} line={line} index={index} width={width} />
        ))}
        
        {/* Floating Particles */}
        {floatingParticles.map((particle, index) => (
          <AnimatedParticle key={`particle-${index}`} particle={particle} index={index} />
        ))}
        
        <StatusBar style="light" />
        
        <Animated.View style={[styles.splashContent, splashContentStyle]}>
          {/* Modern Title & Subtitle */}
          <Animated.View style={[textContainerStyle, { alignItems: 'center' }]}>
            <Text style={styles.ultraModernTitle}>SCADA Mobile</Text>
            <Text style={styles.ultraModernSubtitle}>NEXT GENERATION CONTROL</Text>
          </Animated.View>
          
          {/* Ultra Modern Progress Indicator */}
          <Animated.View style={[styles.ultraModernLoadingContainer, textContainerStyle]}>
            <View style={styles.ultraModernLoadingBar}>
              <Animated.View style={[styles.ultraModernLoadingProgress, progressBarStyle]} />
            </View>
            <Text style={styles.ultraModernLoadingText}>CHECKING SERVER CONNECTION</Text>
          </Animated.View>
        </Animated.View>
      </View>
    );
  }

  if (isLoading) {
    return null; // Splash screen handles loading state
  }

  const menuItems = [
    { 
      name: 'Home', 
      icon: 'home', 
      title: 'Home',
      iconColor: '#2196F3', // Bright Blue
      iconLibrary: 'material' as const
    },
    { 
      name: 'Registers', 
      icon: 'format-list-bulleted', 
      title: 'Registers',
      iconColor: '#4CAF50', // Green
      iconLibrary: 'material' as const
    },
    { 
      name: 'Consumption', 
      icon: 'chart-bar', 
      title: 'Consumption',
      iconColor: '#FF9800', // Orange
      iconLibrary: 'material' as const
    },
    { 
      name: 'Billing', 
      icon: 'receipt', 
      title: 'Billing',
      iconColor: '#9C27B0', // Purple
      iconLibrary: 'material' as const
    },
    { 
      name: 'Logs', 
      icon: 'chart-line', 
      title: 'Logs',
      iconColor: '#00BCD4', // Cyan
      iconLibrary: 'material' as const
    },
    { 
      name: 'SystemLogs', 
      icon: 'file-document', 
      title: 'System Logs',
      iconColor: '#F44336', // Red
      iconLibrary: 'material' as const
    },
    { 
      name: 'PeriodicReports', 
      icon: 'file-document-outline', 
      title: 'Periodic Reports',
      iconColor: '#3F51B5', // Indigo
      iconLibrary: 'material' as const
    },
    { 
      name: 'Settings', 
      icon: 'cog', 
      title: 'Settings',
      iconColor: '#607D8B', // Blue Grey
      iconLibrary: 'material' as const
    },
    { 
      name: 'PrivacyPolicy', 
      icon: 'shield-check', 
      title: 'Privacy Policy',
      iconColor: '#009688', // Teal
      iconLibrary: 'material' as const
    },
  ];

  const handleMenuSelect = (screenName: string) => {
    if (screenName === 'SignOut') {
      handleSignOut();
    } else {
      // Ekran değiştiğinde seçili analizör adını temizle
      if (screenName !== 'Registers') {
        setSelectedAnalyzerName(null);
      }
      if (screenName !== 'Logs') {
        setSelectedLogsAnalyzerName(null);
        setLogEntryTitle(null);
      }
      
      // Animate screen transition - Reanimated 3
      fadeAnim.value = withTiming(0, { duration: 150, easing: Easing.out(Easing.ease) });
      slideAnim.value = withTiming(-50, { duration: 150, easing: Easing.out(Easing.ease) }, () => {
        runOnJS(setCurrentScreen)(screenName);
        slideAnim.value = 50;
        fadeAnim.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.ease) });
        slideAnim.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.ease) });
      });
      
      // Close menu with animation
      closeMenu();
    }
  };
  
  const openMenu = () => {
    setIsMenuVisible(true);
    // Smooth spring animation with scale effect
    menuSlideAnim.value = -screenWidth;
    menuFadeAnim.value = 0;
    menuScaleAnim.value = 0.95;
    
    // Use spring for natural, smooth movement
    menuSlideAnim.value = withSpring(0, {
      damping: 20,
      stiffness: 90,
      mass: 0.8,
    });
    menuFadeAnim.value = withSpring(1, {
      damping: 20,
      stiffness: 90,
      mass: 0.8,
    });
    menuScaleAnim.value = withSpring(1, {
      damping: 18,
      stiffness: 100,
      mass: 0.7,
    });
  };
  
  const closeMenu = () => {
    menuSlideAnim.value = withTiming(-screenWidth, { 
      duration: 200, 
      easing: Easing.in(Easing.ease) 
    });
    menuFadeAnim.value = withTiming(0, { 
      duration: 200, 
      easing: Easing.in(Easing.ease) 
    });
    menuScaleAnim.value = withTiming(0.95, { 
      duration: 200, 
      easing: Easing.in(Easing.ease) 
    }, () => {
      runOnJS(setIsMenuVisible)(false);
    });
  };

  const handleNavigateToSettings = () => {
    setCurrentScreen('Settings');
  };

  const renderCurrentScreen = () => {
    // Login ve Settings ekranları authentication gerektirmez
    if (currentScreen === 'Login') {
      return <LoginScreen onLoginSuccess={handleLoginSuccess} onNavigateToSettings={handleNavigateToSettings} />;
    }
    
    if (currentScreen === 'Settings') {
      return <SettingsScreen onConnectionSuccess={handleConnectionSuccess} onUseDemo={handleUseDemo} />;
    }
    
    if (currentScreen === 'PrivacyPolicy') {
      return <PrivacyPolicyScreen />;
    }
    
    // Diğer ekranlar authentication gerektirir
    if (!isAuthenticated) {
      return <LoginScreen onLoginSuccess={handleLoginSuccess} onNavigateToSettings={handleNavigateToSettings} />;
    }
    
    switch (currentScreen) {
      case 'Home':
        return <HomeScreen />;
      case 'Registers':
        return (
          <RegistersScreen 
            isActive={currentScreen === 'Registers'} 
            onSelectedAnalyzerChange={setSelectedAnalyzerName}
          />
        );
      case 'Consumption':
        return <ConsumptionScreen />;
      case 'Billing':
        return <BillingScreen />;
      case 'Logs':
        return (
          <LogsScreen 
            onSelectedAnalyzerChange={setSelectedLogsAnalyzerName}
            onLogEntryTitleChange={setLogEntryTitle}
          />
        );
      case 'SystemLogs':
        return <SystemLogsScreen />;
      case 'PeriodicReports':
        return <PeriodicReportsScreen />;
      default:
        return <HomeScreen />;
    }
  };

  const getCurrentTitle = () => {
    // Registers ekranında ve seçili analizör varsa, analizör adını göster
    if (currentScreen === 'Registers' && selectedAnalyzerName) {
      return selectedAnalyzerName;
    }
    // Logs ekranında log entry görünümündeyse, log entry title'ı göster
    if (currentScreen === 'Logs' && logEntryTitle) {
      return logEntryTitle;
    }
    // Logs ekranında ve seçili analizör varsa, analizör adını göster
    if (currentScreen === 'Logs' && selectedLogsAnalyzerName) {
      return selectedLogsAnalyzerName;
    }
    return menuItems.find(item => item.name === currentScreen)?.title || 'Home';
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      
      {/* Modern Header - sadece authenticated kullanıcılar için göster */}
      {(isAuthenticated || currentScreen === 'Settings' || currentScreen === 'PrivacyPolicy') && (
        <View style={[styles.modernHeaderWrapper, { paddingTop: insets.top }]}>
          {/* Gradient Background - extends to top including safe area */}
          <LinearGradient
            colors={isDarkMode 
              ? ['#1E3A5F', '#2D4F7C', '#3A6599']
              : ['#1E88E5', '#42A5F5', '#64B5F6']}
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
          
          {/* Glassmorphism Overlay */}
          <View style={styles.headerGlassOverlay} />
          
          {/* Header Content */}
          <View style={styles.modernHeaderContainer}>
            <View style={styles.modernHeaderContent}>
            {/* Hamburger Menu Button */}
            <MotiView
              from={{ scale: 1 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 15, stiffness: 300 }}
            >
              <TouchableOpacity
                onPress={openMenu}
                activeOpacity={0.8}
                style={styles.modernHeaderButton}
              >
                <MotiView
                  animate={{ 
                    rotate: '0deg',
                    scale: 1
                  }}
                  transition={{ type: 'spring', damping: 12, stiffness: 200 }}
                >
                  <MaterialCommunityIcons
                    name="menu"
                    size={26}
                    color="#FFFFFF"
                  />
                </MotiView>
              </TouchableOpacity>
            </MotiView>
            
            {/* Title */}
            <View style={styles.modernHeaderTitleContainer}>
              <Text style={styles.modernHeaderTitle}>
                {getCurrentTitle()}
              </Text>
            </View>
            
            {/* Dark/Light Mode Toggle Button */}
            <MotiView
              from={{ scale: 1, rotate: '0deg' }}
              animate={{ 
                scale: 1,
                rotate: isDarkMode ? '180deg' : '0deg'
              }}
              transition={{ type: 'spring', damping: 12, stiffness: 200 }}
            >
              <TouchableOpacity
                onPress={toggleTheme}
                activeOpacity={0.8}
                style={styles.modernHeaderButton}
              >
                <MotiView
                  animate={{ 
                    scale: 1,
                    rotate: isDarkMode ? '180deg' : '0deg'
                  }}
                  transition={{ type: 'spring', damping: 12, stiffness: 200 }}
                >
                  <MaterialCommunityIcons
                    name={isDarkMode ? "white-balance-sunny" : "weather-night"}
                    size={24}
                    color="#FFFFFF"
                  />
                </MotiView>
              </TouchableOpacity>
            </MotiView>
            </View>
          </View>
        </View>
      )}

      {/* Content with animation - Reanimated 3 */}
      <Animated.View style={[styles.surfaceWrapper, screenWrapperStyle]}>
        <Surface style={styles.content}>
          {renderCurrentScreen()}
        </Surface>
      </Animated.View>

      {/* Modern Navigation Drawer */}
      <Modal
        visible={isMenuVisible}
        transparent={true}
        animationType="none"
        onRequestClose={closeMenu}
        supportedOrientations={['portrait', 'portrait-upside-down', 'landscape', 'landscape-left', 'landscape-right']}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={closeMenu}
        >
          <Animated.View style={[styles.menuWrapper, menuWrapperStyle]}>
            <Animated.View
              style={[
                styles.menuContainer,
                menuContainerStyle,
                {
                  backgroundColor: theme.colors.surface,
                  borderRightColor: theme.colors.outlineVariant,
                  width: isLandscape ? Math.min(400, screenWidth * 0.4) : Math.min(300, screenWidth * 0.85)
                }
              ]}
            >
              <Surface
                style={styles.menuSurface}
                elevation={4}
              >
            {/* Header with gradient background - matching main header style */}
            <View style={[styles.menuHeader, styles.modernHeaderWrapper, { paddingTop: insets.top }]}>
              {/* Gradient Background */}
              <LinearGradient
                colors={isDarkMode 
                  ? ['#1E3A5F', '#2D4F7C', '#3A6599']
                  : ['#1E88E5', '#42A5F5', '#64B5F6']}
                style={StyleSheet.absoluteFillObject}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
              
              {/* Glassmorphism Overlay */}
              <View style={styles.headerGlassOverlay} />
              
              {/* Header Content */}
              <View style={styles.modernHeaderContainer}>
                <View style={styles.modernHeaderContent}>
                  <View style={styles.modernHeaderTitleContainer}>
                    <Text style={styles.modernHeaderTitle}>
                      {agentName}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={closeMenu}
                    style={styles.modernHeaderButton}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="close" size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            
            <ScrollView 
              style={styles.menuContent}
              contentContainerStyle={styles.menuContentContainer}
              showsVerticalScrollIndicator={true}
            >
              {/* Menu Items with Material Design 3 styling */}
              {menuItems.map((item) => {
                // Demo mode'da Settings'i gizle
                if (isDemoMode && item.name === 'Settings') {
                  return null;
                }
                
                // Settings ve Privacy Policy her zaman görünür (demo mode hariç), diğerleri sadece authenticated ise
                if (item.name !== 'Settings' && item.name !== 'PrivacyPolicy' && !isAuthenticated) {
                  return null;
                }
                
                const isActive = currentScreen === item.name;
                const iconColor = isActive ? '#FFFFFF' : (item.iconColor || theme.colors.onSurfaceVariant);
                
                return (
                  <MotiView
                    key={item.name}
                    from={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ 
                      type: 'timing', 
                      duration: 200,
                      delay: menuItems.indexOf(item) * 30 
                    }}
                  >
                    <TouchableOpacity
                      onPress={() => handleMenuSelect(item.name)}
                      activeOpacity={0.7}
                      style={[
                        styles.menuItemContainer,
                        isActive && {
                          backgroundColor: item.iconColor || theme.colors.primary,
                          borderRadius: 16,
                          marginHorizontal: 12,
                          marginVertical: 4,
                        }
                      ]}
                    >
                      <View style={[
                        styles.menuItemContent,
                        isActive && styles.menuItemContentActive
                      ]}>
                        <View style={[
                          styles.iconContainer,
                          isActive && { backgroundColor: 'rgba(255, 255, 255, 0.2)' },
                          !isActive && { backgroundColor: `${item.iconColor}15` }
                        ]}>
                          {item.iconLibrary === 'material' ? (
                            <MaterialCommunityIcons
                              name={item.icon as any}
                              size={24}
                              color={iconColor}
                            />
                          ) : (
                            <Ionicons
                              name={item.icon as any}
                              size={24}
                              color={iconColor}
                            />
                          )}
                        </View>
                        <Text
                          style={[
                            styles.menuItemText,
                            isActive && styles.menuItemTextActive,
                            !isActive && { color: theme.colors.onSurface }
                          ]}
                        >
                          {item.title}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </MotiView>
                );
              })}
              
              {/* Switch Mode button for demo mode users */}
              {isDemoMode && (
                <>
                  <Divider style={{marginVertical: 8}} />
                  <TouchableOpacity
                    onPress={handleSwitchMode}
                    activeOpacity={0.7}
                    style={styles.menuItemContainer}
                  >
                    <View style={styles.menuItemContent}>
                      <View style={[styles.iconContainer, { backgroundColor: `${theme.colors.primary}15` }]}>
                        <MaterialCommunityIcons
                          name="swap-horizontal"
                          size={24}
                          color={theme.colors.primary}
                        />
                      </View>
                      <Text style={[styles.menuItemText, { color: theme.colors.primary }]}>
                        Switch Mode
                      </Text>
                    </View>
                  </TouchableOpacity>
                </>
              )}
              
              {/* Sign Out button for authenticated users (not in demo mode) */}
              {isAuthenticated && !isDemoMode && (
                <>
                  <Divider style={{marginVertical: 8}} />
                  <TouchableOpacity
                    onPress={handleSignOut}
                    activeOpacity={0.7}
                    style={styles.menuItemContainer}
                  >
                    <View style={styles.menuItemContent}>
                      <View style={[styles.iconContainer, { backgroundColor: '#F4433615' }]}>
                        <MaterialCommunityIcons
                          name="logout"
                          size={24}
                          color="#F44336"
                        />
                      </View>
                      <Text style={[styles.menuItemText, { color: '#F44336' }]}>
                        Sign Out
                      </Text>
                    </View>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
            
            <Divider style={{marginVertical: 8}} />
            
            <View style={styles.menuFooter}>
              <TouchableOpacity
                style={[
                  styles.themeToggle,
                  { backgroundColor: theme.colors.surfaceVariant }
                ]}
                onPress={() => {
                  toggleTheme();
                  closeMenu();
                }}
              >
                <Ionicons 
                  name={isDarkMode ? "sunny" : "moon"} 
                  size={18} 
                  color={theme.colors.onSurfaceVariant} 
                />
                <Text 
                  style={[styles.themeToggleText, { color: theme.colors.onSurfaceVariant }]}
                >
                  {isDarkMode ? "Light Mode" : "Dark Mode"}
                </Text>
              </TouchableOpacity>
            </View>
              </Surface>
            </Animated.View>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* Session Expired Modal */}
      <Modal
        visible={showSessionExpiredModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSessionExpiredModal(false)}
      >
        <View style={styles.sessionModalOverlay}>
          <View style={[styles.sessionModalContainer, { backgroundColor: paperTheme.colors.surface }]}>
            <View style={styles.sessionModalHeader}>
              <MaterialCommunityIcons
                name="alert-circle"
                size={48}
                color={paperTheme.colors.error}
              />
              <Text style={[styles.sessionModalTitle, { color: paperTheme.colors.onSurface }]}>
                Session Expired
              </Text>
            </View>
            
            <Text style={[styles.sessionModalText, { color: paperTheme.colors.onSurfaceVariant }]}>
              Your session has expired. The connection to the server or agent has been lost. Please login again to continue using the application.
            </Text>
            
            <TouchableOpacity
              style={[styles.sessionModalButton, { backgroundColor: paperTheme.colors.primary }]}
              onPress={async () => {
                setShowSessionExpiredModal(false);
                
                // Small delay to ensure modal closes smoothly
                setTimeout(() => {
                  // Check if server connection exists
                  if (isConnected) {
                    // Navigate to Login screen
                    setCurrentScreen('Login');
                  } else {
                    // Navigate to Settings screen to configure connection
                    setCurrentScreen('Settings');
                  }
                }, 300);
              }}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name="login"
                size={20}
                color="white"
                style={styles.sessionModalButtonIcon}
              />
              <Text style={styles.sessionModalButtonText}>
                Login
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  // Modern Splash Screen Styles - 2025 Design
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modernGlow: {
    position: 'absolute',
    width: width * 1.5,
    height: width * 1.5,
    borderRadius: width * 0.75,
    backgroundColor: '#42A5F5',
    opacity: 0.15,
    top: -width * 0.5,
    left: -width * 0.25,
  },
  splashContent: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  // Modern Logo Container
  modernLogoContainer: {
    marginBottom: 50,
    width: 220,
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  modernRing: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modernBinaryParticle: {
    position: 'absolute',
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.95)',
    fontFamily: 'monospace',
    textShadowColor: 'rgba(66, 165, 245, 0.9)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
    letterSpacing: 0,
  },
  // Ultra Modern Design Styles
  // Data Stream Lines
  dataStreamLine: {
    position: 'absolute',
    width: 2,
    height: 60,
    backgroundColor: 'rgba(66, 165, 245, 0.4)',
    borderRadius: 1,
  },
  // Floating Particles
  floatingParticle: {
    position: 'absolute',
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    left: 0,
    top: 0,
  },
  particleText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.9)',
    fontFamily: 'monospace',
  },
  // Ultra Modern Logo Container
  ultraModernLogoContainer: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 50,
  },
  // Geometric Shapes
  geometricShape: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  hexagonShape: {
    width: 140,
    height: 140,
    borderRadius: 20,
    borderStyle: 'dashed',
    shadowColor: '#42A5F5',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  circleShape: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderStyle: 'solid',
    shadowColor: '#64B5F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  triangleShape: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 40,
    borderRightWidth: 40,
    borderBottomWidth: 70,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#90CAF9',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  // Central Pulse
  centralPulse: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#42A5F5',
    shadowColor: '#42A5F5',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 10,
  },
  // Ultra Modern Typography
  ultraModernTitle: {
    fontSize: 42,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 12,
    letterSpacing: 2,
    textShadowColor: 'rgba(66, 165, 245, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
    textAlign: 'center',
  },
  ultraModernSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 60,
    letterSpacing: 3,
    fontWeight: '300',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  // Ultra Modern Loading Indicator
  ultraModernLoadingContainer: {
    alignItems: 'center',
    width: width * 0.8,
    marginTop: 30,
  },
  ultraModernLoadingBar: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  ultraModernLoadingProgress: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '100%',
    backgroundColor: '#42A5F5',
    borderRadius: 2,
    transformOrigin: 'left',
    shadowColor: '#42A5F5',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 4,
  },
  ultraModernLoadingText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 2,
    fontWeight: '400',
    textTransform: 'uppercase',
  },
  
  // Existing styles
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Modern Header Styles
  modernHeaderWrapper: {
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  modernHeaderContainer: {
    height: 56,
    backgroundColor: 'transparent',
  },
  headerGlassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  modernHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: 8,
  },
  modernHeaderButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  modernHeaderTitleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  modernHeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  surfaceWrapper: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
  },
  menuWrapper: {
    flex: 1,
    flexDirection: 'row',
  },
  menuContainer: {
    width: 300,
    height: '100%',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
    borderRightWidth: 1,
  },
  menuSurface: {
    flex: 1,
  },
  menuHeader: {
    overflow: 'hidden',
  },
  menuContent: {
    flex: 1,
  },
  menuContentContainer: {
    paddingTop: 8,
    paddingBottom: 8,
  },
  menuItemContainer: {
    marginVertical: 2,
    marginHorizontal: 8,
    borderRadius: 16,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuItemContentActive: {
    paddingVertical: 14,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuItem: {
    paddingVertical: 4,
    marginVertical: 4,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  menuItemTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  menuFooter: {
    padding: 16,
    paddingBottom: 32,
  },
  themeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 28,
  },
  themeToggleText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '500',
    marginTop: 10,
  },
  // Session Expired Modal Styles
  sessionModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  sessionModalContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  sessionModalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  sessionModalTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 12,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  sessionModalText: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 24,
  },
  sessionModalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    elevation: 2,
  },
  sessionModalButtonIcon: {
    marginRight: 8,
  },
  sessionModalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});