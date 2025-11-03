import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
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
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Screens
import BillingScreen from './screens/BillingScreen';
import ConsumptionScreen from './screens/ConsumptionScreen';
import HomeScreen from './screens/HomeScreen';
import LoginScreen from './screens/LoginScreen';
import LogsScreen from './screens/LogsScreen';
import RegistersScreen from './screens/RegistersScreen';
import SettingsScreen from './screens/SettingsScreen';

// Contexts
import { ConnectionProvider } from './context/ConnectionContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { WebSocketProvider } from './context/WebSocketContext';

// Services
import ApiService from './services/ApiService';
import AuthService from './services/AuthService';

// Contexts
import { useConnection } from './context/ConnectionContext';

// Main App component
export default function AppWrapper() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <PaperProviderWithTheme>
            <ConnectionProvider>
              <WebSocketProvider>
                <MainApp />
              </WebSocketProvider>
            </ConnectionProvider>
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

// Main App component with navigation logic
function MainApp() {
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const paperTheme = usePaperTheme();
  const { isConnected, connect } = useConnection();
  
  const [currentScreen, setCurrentScreen] = useState('Settings');
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showSplash, setShowSplash] = useState(true);
  const [agentName, setAgentName] = useState<string>('SCADA Mobile');
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const menuSlideAnim = useRef(new Animated.Value(-300)).current;
  const menuFadeAnim = useRef(new Animated.Value(0)).current;
  
  // Modern Splash Screen Animations - Ultra Modern Design
  const splashFadeAnim = useRef(new Animated.Value(0)).current;
  const logoScaleAnim = useRef(new Animated.Value(0.5)).current;
  const logoRotateAnim = useRef(new Animated.Value(0)).current;
  const geometricShape1Anim = useRef(new Animated.Value(0)).current;
  const geometricShape2Anim = useRef(new Animated.Value(0)).current;
  const geometricShape3Anim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const textFadeAnim = useRef(new Animated.Value(0)).current;
  const textSlideAnim = useRef(new Animated.Value(50)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  
  // Floating particles - using translateX/Y instead of left/top
  const floatingParticles = useRef(
    Array.from({ length: 15 }, () => {
      const startX = Math.random() * width;
      const startY = Math.random() * height;
      return {
        startX,
        startY,
        translateX: useRef(new Animated.Value(startX)).current,
        translateY: useRef(new Animated.Value(startY)).current,
        opacity: useRef(new Animated.Value(0)).current,
        scale: useRef(new Animated.Value(0.5)).current,
      };
    })
  ).current;
  
  // Data stream lines
  const dataLines = useRef(
    Array.from({ length: 8 }, () => ({
      translateY: useRef(new Animated.Value(0)).current,
      opacity: useRef(new Animated.Value(0)).current,
    }))
  ).current;

  useEffect(() => {
    // Ultra Modern Animation Sequence
    // 1. Background fade in
    Animated.timing(splashFadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // 2. Logo scale and rotation
    Animated.parallel([
      Animated.spring(logoScaleAnim, {
        toValue: 1,
        tension: 40,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.timing(logoRotateAnim, {
          toValue: 1,
          duration: 10000,
          useNativeDriver: true,
        })
      ),
    ]).start();

    // 3. Geometric shapes animation
    Animated.stagger(200, [
      Animated.spring(geometricShape1Anim, {
        toValue: 1,
        tension: 30,
        friction: 5,
        useNativeDriver: true,
      }),
      Animated.spring(geometricShape2Anim, {
        toValue: 1,
        tension: 30,
        friction: 5,
        useNativeDriver: true,
      }),
      Animated.spring(geometricShape3Anim, {
        toValue: 1,
        tension: 30,
        friction: 5,
        useNativeDriver: true,
      }),
    ]).start();

    // 4. Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 5. Text animations
    Animated.parallel([
      Animated.timing(textFadeAnim, {
        toValue: 1,
        duration: 800,
        delay: 800,
        useNativeDriver: true,
      }),
      Animated.spring(textSlideAnim, {
        toValue: 0,
        tension: 40,
        friction: 8,
        delay: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // 5. Floating particles
    floatingParticles.forEach((particle, index) => {
      Animated.parallel([
        Animated.sequence([
          Animated.delay(index * 100),
          Animated.timing(particle.opacity, {
            toValue: 0.7,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
        Animated.loop(
          Animated.sequence([
            Animated.timing(particle.translateY, {
              toValue: particle.startY + (Math.random() * 200 - 100),
              duration: 3000 + Math.random() * 2000,
              useNativeDriver: true,
            }),
            Animated.timing(particle.translateY, {
              toValue: particle.startY - (Math.random() * 200 - 100),
              duration: 3000 + Math.random() * 2000,
              useNativeDriver: true,
            }),
          ])
        ),
        Animated.loop(
          Animated.sequence([
            Animated.timing(particle.scale, {
              toValue: 1.2,
              duration: 2000,
              useNativeDriver: true,
            }),
            Animated.timing(particle.scale, {
              toValue: 0.8,
              duration: 2000,
              useNativeDriver: true,
            }),
          ])
        ),
      ]).start();
    });

    // 6. Data stream lines
    dataLines.forEach((line, index) => {
      Animated.sequence([
        Animated.delay(1000 + index * 150),
        Animated.parallel([
          Animated.timing(line.opacity, {
            toValue: 0.6,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.loop(
            Animated.timing(line.translateY, {
              toValue: height,
              duration: 2000 + index * 200,
              useNativeDriver: true,
            })
          ),
        ]),
      ]).start();
    });

    // 7. Progress bar animation
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 3000,
      delay: 1200,
      useNativeDriver: true,
    }).start();

    // Hide splash after animation completes
    const splashTimer = setTimeout(() => {
      Animated.timing(splashFadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        setShowSplash(false);
      });
    }, 4800);

    checkInitialSetup();

    return () => {
      clearTimeout(splashTimer);
    };
  }, []);

  // Load agent name from AsyncStorage
  useEffect(() => {
    const loadAgentName = async () => {
      try {
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
      }
    };

    loadAgentName();
  }, [isAuthenticated, isMenuVisible]);

  const checkInitialSetup = async () => {
    try {
      console.log('[App] Starting initial setup check...');
      
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
          const user = AuthService.getCurrentUser();
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

  const handleLoginSuccess = () => {
    const user = AuthService.getCurrentUser();
    setCurrentUser(user);
    setIsAuthenticated(true);
    setCurrentScreen('Home');
    console.log('[App] Login successful, user authenticated');
    // ConnectionContext zaten LoginScreen'de güncellendi
  };

  const handleConnectionSuccess = async () => {
    // Settings'den gelen başarılı bağlantı sonrası remember me kontrolü
    try {
      await connect();
      console.log('[App] Connection established from Settings');
      
      const hasRememberMe = await AuthService.isLoggedIn();
      
      if (hasRememberMe) {
        // Remember me var, otomatik login dene
        const autoLoginSuccess = await AuthService.simpleAutoLogin();
        
        if (autoLoginSuccess) {
          // Otomatik login başarılı - direkt Home'a git
          const user = AuthService.getCurrentUser();
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

  if (showSplash) {
    // Interpolated values
    const logoRotation = logoRotateAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    });

    const shape1Rotation = geometricShape1Anim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    });

    const shape2Rotation = geometricShape2Anim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '-360deg'],
    });

    const shape3Rotation = geometricShape3Anim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '180deg'],
    });

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
          <Animated.View
            key={`line-${index}`}
            style={[
              styles.dataStreamLine,
              {
                left: (width / 9) * (index + 1),
                transform: [{ translateY: line.translateY }],
                opacity: line.opacity,
              },
            ]}
          />
        ))}
        
        {/* Floating Particles */}
        {floatingParticles.map((particle, index) => (
          <Animated.View
            key={`particle-${index}`}
            style={[
              styles.floatingParticle,
              {
                transform: [
                  { translateX: particle.translateX },
                  { translateY: particle.translateY },
                  { scale: particle.scale },
                ],
                opacity: particle.opacity,
              },
            ]}
          >
            <Text style={styles.particleText}>{index % 2 === 0 ? '0' : '1'}</Text>
          </Animated.View>
        ))}
        
        <StatusBar style="light" />
        
        <Animated.View
          style={[
            styles.splashContent,
            {
              opacity: splashFadeAnim,
            },
          ]}
        >
          {/* Modern Central Logo with Geometric Shapes */}
          <Animated.View
            style={[
              styles.ultraModernLogoContainer,
              {
                transform: [
                  { scale: logoScaleAnim },
                  { rotate: logoRotation },
                ],
              },
            ]}
          >
            {/* Geometric Shape 1 - Hexagon */}
            <Animated.View
              style={[
                styles.geometricShape,
                styles.hexagonShape,
                {
                  transform: [{ rotate: shape1Rotation }],
                  opacity: geometricShape1Anim,
                },
              ]}
            />
            
            {/* Geometric Shape 2 - Circle */}
            <Animated.View
              style={[
                styles.geometricShape,
                styles.circleShape,
                {
                  transform: [{ rotate: shape2Rotation }],
                  opacity: geometricShape2Anim,
                },
              ]}
            />
            
            {/* Geometric Shape 3 - Triangle */}
            <Animated.View
              style={[
                styles.geometricShape,
                styles.triangleShape,
                {
                  transform: [{ rotate: shape3Rotation }],
                  opacity: geometricShape3Anim,
                },
              ]}
            />
            
            {/* Central Pulse Dot */}
            <Animated.View
              style={[
                styles.centralPulse,
                {
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            />
          </Animated.View>
          
          {/* Modern Title & Subtitle */}
          <Animated.View
            style={{
              opacity: textFadeAnim,
              transform: [{ translateY: textSlideAnim }],
            }}
          >
            <Text style={styles.ultraModernTitle}>SCADA Mobile</Text>
            <Text style={styles.ultraModernSubtitle}>NEXT GENERATION CONTROL</Text>
          </Animated.View>
          
          {/* Ultra Modern Progress Indicator */}
          <Animated.View style={[styles.ultraModernLoadingContainer, { opacity: textFadeAnim }]}>
            <View style={styles.ultraModernLoadingBar}>
              <Animated.View
                style={[
                  styles.ultraModernLoadingProgress,
                  {
                    transform: [{
                      scaleX: progressAnim,
                    }],
                  },
                ]}
              />
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
    { name: 'Home', icon: 'home', title: 'Home' },
    { name: 'Registers', icon: 'format-list-bulleted', title: 'Registers' },
    { name: 'Consumption', icon: 'chart-bar', title: 'Consumption' },
    { name: 'Billing', icon: 'receipt', title: 'Billing' },
    { name: 'Logs', icon: 'chart-line', title: 'Logs' },
    { name: 'Settings', icon: 'cog', title: 'Settings' },
  ];

  const handleMenuSelect = (screenName: string) => {
    if (screenName === 'SignOut') {
      handleSignOut();
    } else {
      // Animate screen transition
      Animated.sequence([
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: -50,
            duration: 150,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(slideAnim, {
          toValue: 50,
          duration: 0,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setCurrentScreen(screenName);
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      });
      
      // Close menu with animation
      closeMenu();
    }
  };
  
  const openMenu = () => {
    setIsMenuVisible(true);
    Animated.parallel([
      Animated.timing(menuSlideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(menuFadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };
  
  const closeMenu = () => {
    Animated.parallel([
      Animated.timing(menuSlideAnim, {
        toValue: -300,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(menuFadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsMenuVisible(false);
    });
  };

  const renderCurrentScreen = () => {
    // Login ve Settings ekranları authentication gerektirmez
    if (currentScreen === 'Login') {
      return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
    }
    
    if (currentScreen === 'Settings') {
      return <SettingsScreen onConnectionSuccess={handleConnectionSuccess} />;
    }
    
    // Diğer ekranlar authentication gerektirir
    if (!isAuthenticated) {
      return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
    }
    
    switch (currentScreen) {
      case 'Home':
        return <HomeScreen />;
      case 'Registers':
        return <RegistersScreen isActive={currentScreen === 'Registers'} />;
      case 'Consumption':
        return <ConsumptionScreen />;
      case 'Billing':
        return <BillingScreen />;
      case 'Logs':
        return <LogsScreen />;
      default:
        return <HomeScreen />;
    }
  };

  const getCurrentTitle = () => {
    return menuItems.find(item => item.name === currentScreen)?.title || 'Home';
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      
      {/* Header'ı sadece authenticated kullanıcılar için göster */}
      {(isAuthenticated || currentScreen === 'Settings') && (
        <Appbar.Header
          style={{
            backgroundColor: theme.colors.primary,
            elevation: 4,
          }}
        >
          <Appbar.Action
            icon="menu"
            color={theme.colors.onPrimary}
            onPress={openMenu}
          />
          <Appbar.Content
            title={getCurrentTitle()}
            color={theme.colors.onPrimary}
            titleStyle={styles.headerTitle}
          />
          <Appbar.Action
            icon={isDarkMode ? "white-balance-sunny" : "weather-night"}
            color={theme.colors.onPrimary}
            onPress={toggleTheme}
          />
        </Appbar.Header>
      )}

      {/* Content with animation */}
      <Animated.View
        style={[
          styles.surfaceWrapper,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }
        ]}
      >
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
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={closeMenu}
        >
          <Animated.View
            style={[
              styles.menuWrapper,
              {
                opacity: menuFadeAnim,
              }
            ]}
          >
            <Animated.View
              style={[
                styles.menuContainer,
                {
                  transform: [{ translateX: menuSlideAnim }],
                  backgroundColor: theme.colors.surface,
                  borderRightColor: theme.colors.outlineVariant
                }
              ]}
            >
              <Surface
                style={styles.menuSurface}
                elevation={4}
              >
            {/* Header with gradient background */}
            <View style={[styles.menuHeader, { backgroundColor: theme.colors.primary }]}>
              <View style={styles.headerContent}>
                <Text 
                  variant="headlineSmall" 
                  style={[styles.menuTitle, { color: theme.colors.onPrimary }]}
                >
                  {agentName}
                </Text>
              </View>
              <TouchableOpacity
                onPress={closeMenu}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={theme.colors.onPrimary} />
              </TouchableOpacity>
            </View>
            
            <Divider />
            
            <View style={styles.menuContent}>
              {/* Menu Items with Material Design 3 styling */}
              {menuItems.map((item) => {
                // Settings her zaman görünür, diğerleri sadece authenticated ise
                if (item.name !== 'Settings' && !isAuthenticated) {
                  return null;
                }
                
                const isActive = currentScreen === item.name;
                
                return (
                  <List.Item
                    key={item.name}
                    title={item.title}
                    style={[
                      styles.menuItem,
                      isActive && {
                        backgroundColor: theme.colors.primaryContainer,
                        borderRadius: 28,
                        marginHorizontal: 12,
                      }
                    ]}
                    titleStyle={[
                      styles.menuItemText,
                      isActive && {
                        color: theme.colors.onPrimaryContainer,
                        fontWeight: 'bold'
                      }
                    ]}
                    left={props => (
                      <List.Icon
                        {...props}
                        icon={item.icon}
                        color={isActive ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant}
                      />
                    )}
                    onPress={() => handleMenuSelect(item.name)}
                  />
                );
              })}
              
              {/* Sign Out button for authenticated users */}
              {isAuthenticated && (
                <>
                  <Divider style={{marginVertical: 8}} />
                  <List.Item
                    title="Sign Out"
                    style={styles.menuItem}
                    titleStyle={styles.menuItemText}
                    left={props => (
                      <List.Icon
                        {...props}
                        icon="logout"
                        color={theme.colors.error}
                      />
                    )}
                    onPress={handleSignOut}
                  />
                </>
              )}
            </View>
            
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
  },
  ultraModernSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 60,
    letterSpacing: 3,
    fontWeight: '300',
    textTransform: 'uppercase',
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
    padding: 16,
    paddingTop: 56,
    paddingBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTitle: {
    fontWeight: '700',
    textAlign: 'center',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
  },
  menuContent: {
    flex: 1,
    paddingTop: 8,
  },
  menuItem: {
    paddingVertical: 4,
    marginVertical: 4,
  },
  menuItemText: {
    fontSize: 16,
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
});