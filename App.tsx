import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  Appbar,
  Avatar,
  Divider,
  List,
  Provider as PaperProvider,
  Surface,
  Text,
  useTheme as usePaperTheme
} from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Screens
import HomeScreen from './screens/HomeScreen';
import LoginScreen from './screens/LoginScreen';
import LogsScreen from './screens/LogsScreen';
import RegistersScreen from './screens/RegistersScreen';
import SettingsScreen from './screens/SettingsScreen';
import ConsumptionScreen from './screens/ConsumptionScreen';

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
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const menuSlideAnim = useRef(new Animated.Value(-300)).current;
  const menuFadeAnim = useRef(new Animated.Value(0)).current;
  
  // Splash screen animations
  const splashFadeAnim = useRef(new Animated.Value(0)).current;
  const splashScaleAnim = useRef(new Animated.Value(0.3)).current;
  const splashRotateAnim = useRef(new Animated.Value(0)).current;
  const splashPulseAnim = useRef(new Animated.Value(1)).current;
  const particleAnim1 = useRef(new Animated.Value(0)).current;
  const particleAnim2 = useRef(new Animated.Value(0)).current;
  const particleAnim3 = useRef(new Animated.Value(0)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.5)).current;
  const textSlideAnim = useRef(new Animated.Value(50)).current;
  const textOpacityAnim = useRef(new Animated.Value(0)).current;
  
  // Binary numbers animations
  const binaryGatherAnim = useRef(new Animated.Value(0)).current;
  const cubeFormAnim = useRef(new Animated.Value(0)).current;
  const cubeZoomAnim = useRef(new Animated.Value(1)).current;
  const cubeExplodeAnim = useRef(new Animated.Value(0)).current;
  const cubeRotateAnim = useRef(new Animated.Value(0)).current;
  const rubikRotateX = useRef(new Animated.Value(0)).current;
  const rubikRotateY = useRef(new Animated.Value(0)).current;
  
  // Additional binary animations for different directions
  const binaryLeftAnim = useRef(new Animated.Value(0)).current;
  const binaryRightAnim = useRef(new Animated.Value(0)).current;
  const binaryTopAnim = useRef(new Animated.Value(0)).current;
  const binaryBottomAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start splash screen animations
    Animated.parallel([
      Animated.timing(splashFadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(splashScaleAnim, {
        toValue: 1,
        tension: 10,
        friction: 2,
        useNativeDriver: true,
      }),
    ]).start();

    // Complex animations
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(splashPulseAnim, {
          toValue: 1.2,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(splashPulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();

    // Rotation animation
    const rotateAnimation = Animated.loop(
      Animated.timing(splashRotateAnim, {
        toValue: 1,
        duration: 4000,
        useNativeDriver: true,
      })
    );
    rotateAnimation.start();

    // Particle animations
    const particleAnimation1 = Animated.loop(
      Animated.timing(particleAnim1, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    );
    particleAnimation1.start();

    const particleAnimation2 = Animated.loop(
      Animated.timing(particleAnim2, {
        toValue: 1,
        duration: 3500,
        useNativeDriver: true,
      })
    );
    particleAnimation2.start();

    const particleAnimation3 = Animated.loop(
      Animated.timing(particleAnim3, {
        toValue: 1,
        duration: 4000,
        useNativeDriver: true,
      })
    );
    particleAnimation3.start();

    // Wave animation
    const waveAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(waveAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(waveAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    waveAnimation.start();

    // Glow animation
    const glowAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.3,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    glowAnimation.start();

    // Text animations
    Animated.parallel([
      Animated.timing(textSlideAnim, {
        toValue: 0,
        duration: 1000,
        delay: 500,
        useNativeDriver: true,
      }),
      Animated.timing(textOpacityAnim, {
        toValue: 1,
        duration: 1000,
        delay: 500,
        useNativeDriver: true,
      }),
    ]).start();

    // Binary gathering animation sequence
    Animated.sequence([
      // First, animate binaries from all directions
      Animated.parallel([
        // Binaries from all sides moving to center
        Animated.timing(binaryLeftAnim, {
          toValue: 1,
          duration: 1500,
          delay: 300,
          useNativeDriver: true,
        }),
        Animated.timing(binaryRightAnim, {
          toValue: 1,
          duration: 1500,
          delay: 300,
          useNativeDriver: true,
        }),
        Animated.timing(binaryTopAnim, {
          toValue: 1,
          duration: 1500,
          delay: 300,
          useNativeDriver: true,
        }),
        Animated.timing(binaryBottomAnim, {
          toValue: 1,
          duration: 1500,
          delay: 300,
          useNativeDriver: true,
        }),
        // Original circular binary animation
        Animated.timing(binaryGatherAnim, {
          toValue: 1,
          duration: 1500,
          delay: 300,
          useNativeDriver: true,
        }),
      ]),
      // Form the data cube with rotation
      Animated.parallel([
        Animated.timing(cubeFormAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        // Rotate the cube continuously
        Animated.loop(
          Animated.timing(cubeRotateAnim, {
            toValue: 1,
            duration: 3000,
            useNativeDriver: true,
          })
        ),
      ]),
      // Zoom the cube closer
      Animated.timing(cubeZoomAnim, {
        toValue: 5,  // Less extreme zoom
        duration: 800,
        useNativeDriver: true,
      }),
      // Pause briefly at maximum zoom
      Animated.delay(300),
      // Explode the cube
      Animated.timing(cubeExplodeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Hide splash after 4.5 seconds to allow full animation sequence
    const splashTimer = setTimeout(() => {
      Animated.timing(splashFadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        setShowSplash(false);
        pulseAnimation.stop();
        rotateAnimation.stop();
        particleAnimation1.stop();
        particleAnimation2.stop();
        particleAnimation3.stop();
        waveAnimation.stop();
        glowAnimation.stop();
      });
    }, 5500);

    checkInitialSetup();

    return () => {
      clearTimeout(splashTimer);
      pulseAnimation.stop();
      rotateAnimation.stop();
      particleAnimation1.stop();
      particleAnimation2.stop();
      particleAnimation3.stop();
      waveAnimation.stop();
      glowAnimation.stop();
    };
  }, []);

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
    const spin = splashRotateAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    });

    const reverseSpin = splashRotateAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['360deg', '0deg'],
    });

    const particle1X = particleAnim1.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 200],
    });

    const particle1Y = particleAnim1.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0, -100, 0],
    });

    const particle2X = particleAnim2.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -200],
    });

    const particle2Y = particleAnim2.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0, -150, 0],
    });

    const particle3Y = particleAnim3.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -200],
    });

    const waveScale = waveAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 2],
    });

    const waveOpacity = waveAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.6, 0],
    });

    return (
      <View style={styles.splashContainer}>
        <LinearGradient
          colors={['#0D47A1', '#1565C0', '#1E88E5', '#42A5F5']}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        
        {/* Animated background waves */}
        <Animated.View
          style={[
            styles.waveCircle,
            {
              transform: [{ scale: waveScale }],
              opacity: waveOpacity,
            },
          ]}
        />
        
        {/* Floating particles */}
        <Animated.View
          style={[
            styles.particle,
            styles.particle1,
            {
              transform: [
                { translateX: particle1X },
                { translateY: particle1Y },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.particle,
            styles.particle2,
            {
              transform: [
                { translateX: particle2X },
                { translateY: particle2Y },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.particle,
            styles.particle3,
            {
              transform: [
                { translateY: particle3Y },
              ],
            },
          ]}
        />
        
        <StatusBar style="light" />
        <Animated.View
          style={[
            styles.splashContent,
            {
              opacity: splashFadeAnim,
              transform: [{ scale: splashScaleAnim }],
            },
          ]}
        >
          {/* Futuristic logo with multiple layers */}
          <Animated.View
            style={[
              styles.splashLogoContainer,
              {
                transform: [{ scale: splashPulseAnim }],
              },
            ]}
          >
            {/* Glow effect */}
            <Animated.View
              style={[
                styles.glowEffect,
                {
                  opacity: glowAnim,
                },
              ]}
            />
            
            {/* Outer rotating ring */}
            <Animated.View
              style={[
                styles.outerRing,
                {
                  transform: [{ rotate: spin }],
                },
              ]}
            >
              <View style={styles.ringDot} />
              <View style={[styles.ringDot, { top: 10, right: 10 }]} />
              <View style={[styles.ringDot, { bottom: 10, right: 10 }]} />
              <View style={[styles.ringDot, { bottom: 10, left: 10 }]} />
            </Animated.View>
            
            {/* Binary Rubik Cube Formation */}
            <Animated.View
              style={[
                styles.hexagonContainer,
                {
                  transform: [
                    { scale: cubeZoomAnim },
                    {
                      rotateX: rubikRotateX.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '360deg'],
                      }),
                    },
                    {
                      rotateY: rubikRotateY.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '360deg'],
                      }),
                    },
                  ],
                },
              ]}
            >
              {/* Binary numbers coming from all directions */}
              {/* 1. Circular pattern (original) */}
              {['1', '0', '1', '0', '1', '0', '1', '0', '1'].map((binary, index) => {
                const angle = (index * 40) * Math.PI / 180;
                const radius = 80;
                const startX = Math.cos(angle) * radius;
                const startY = Math.sin(angle) * radius;
                const explodeX = Math.cos(angle) * 250;
                const explodeY = Math.sin(angle) * 250;
                
                return (
                  <Animated.Text
                    key={`circle-${index}`}
                    style={[
                      styles.scatteredBinary,
                      {
                        transform: [
                          {
                            translateX: Animated.add(
                              binaryGatherAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [startX, 0],
                              }),
                              cubeExplodeAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, explodeX],
                              })
                            ),
                          },
                          {
                            translateY: Animated.add(
                              binaryGatherAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [startY, 0],
                              }),
                              cubeExplodeAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, explodeY],
                              })
                            ),
                          },
                          {
                            scale: binaryGatherAnim.interpolate({
                              inputRange: [0, 0.8, 1],
                              outputRange: [1, 1.2, 0],
                            }),
                          },
                        ],
                        opacity: Animated.multiply(
                          binaryGatherAnim.interpolate({
                            inputRange: [0, 0.8, 1],
                            outputRange: [0.8, 1, 0],
                          }),
                          cubeExplodeAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 0],
                          })
                        ),
                      },
                    ]}
                  >
                    {binary}
                  </Animated.Text>
                );
              })}
              
              {/* 2. Left to right */}
              {[...Array(6)].map((_, index) => {
                const startY = -100 + index * 40;
                const explodeX = -200 - (index * 30);
                const explodeY = startY * 1.5;
                
                return (
                  <Animated.Text
                    key={`left-${index}`}
                    style={[
                      styles.scatteredBinary,
                      {
                        transform: [
                          {
                            translateX: Animated.add(
                              binaryLeftAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [-width/2, 0],
                              }),
                              cubeExplodeAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, explodeX],
                              })
                            ),
                          },
                          {
                            translateY: Animated.add(
                              binaryLeftAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [startY, 0],
                              }),
                              cubeExplodeAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, explodeY],
                              })
                            ),
                          },
                          {
                            scale: binaryLeftAnim.interpolate({
                              inputRange: [0, 0.8, 1],
                              outputRange: [0.8, 1.2, 0],
                            }),
                          },
                        ],
                        opacity: Animated.multiply(
                          binaryLeftAnim.interpolate({
                            inputRange: [0, 0.1, 0.8, 1],
                            outputRange: [0, 0.8, 1, 0],
                          }),
                          cubeExplodeAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 0],
                          })
                        ),
                      },
                    ]}
                  >
                    {index % 2 === 0 ? '1' : '0'}
                  </Animated.Text>
                );
              })}
              
              {/* 3. Right to left */}
              {[...Array(6)].map((_, index) => {
                const startY = -80 + index * 40;
                const explodeX = 200 + (index * 30);
                const explodeY = startY * 1.5;
                
                return (
                  <Animated.Text
                    key={`right-${index}`}
                    style={[
                      styles.scatteredBinary,
                      {
                        transform: [
                          {
                            translateX: Animated.add(
                              binaryRightAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [width/2, 0],
                              }),
                              cubeExplodeAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, explodeX],
                              })
                            ),
                          },
                          {
                            translateY: Animated.add(
                              binaryRightAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [startY, 0],
                              }),
                              cubeExplodeAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, explodeY],
                              })
                            ),
                          },
                          {
                            scale: binaryRightAnim.interpolate({
                              inputRange: [0, 0.8, 1],
                              outputRange: [0.8, 1.2, 0],
                            }),
                          },
                        ],
                        opacity: Animated.multiply(
                          binaryRightAnim.interpolate({
                            inputRange: [0, 0.2, 0.8, 1],
                            outputRange: [0, 0.8, 1, 0],
                          }),
                          cubeExplodeAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 0],
                          })
                        ),
                      },
                    ]}
                  >
                    {index % 2 === 0 ? '0' : '1'}
                  </Animated.Text>
                );
              })}
              
              {/* 4. Top to bottom */}
              {[...Array(6)].map((_, index) => {
                const startX = -80 + index * 40;
                const explodeX = startX * 1.5;
                const explodeY = -200 - (index * 30);
                
                return (
                  <Animated.Text
                    key={`top-${index}`}
                    style={[
                      styles.scatteredBinary,
                      {
                        transform: [
                          {
                            translateX: Animated.add(
                              binaryTopAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [startX, 0],
                              }),
                              cubeExplodeAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, explodeX],
                              })
                            ),
                          },
                          {
                            translateY: Animated.add(
                              binaryTopAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [-height/2, 0],
                              }),
                              cubeExplodeAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, explodeY],
                              })
                            ),
                          },
                          {
                            scale: binaryTopAnim.interpolate({
                              inputRange: [0, 0.8, 1],
                              outputRange: [0.8, 1.2, 0],
                            }),
                          },
                        ],
                        opacity: Animated.multiply(
                          binaryTopAnim.interpolate({
                            inputRange: [0, 0.3, 0.8, 1],
                            outputRange: [0, 0.8, 1, 0],
                          }),
                          cubeExplodeAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 0],
                          })
                        ),
                      },
                    ]}
                  >
                    {index % 2 === 0 ? '1' : '0'}
                  </Animated.Text>
                );
              })}
              
              {/* 5. Bottom to top */}
              {[...Array(6)].map((_, index) => {
                const startX = -100 + index * 40;
                const explodeX = startX * 1.5;
                const explodeY = 200 + (index * 30);
                
                return (
                  <Animated.Text
                    key={`bottom-${index}`}
                    style={[
                      styles.scatteredBinary,
                      {
                        transform: [
                          {
                            translateX: Animated.add(
                              binaryBottomAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [startX, 0],
                              }),
                              cubeExplodeAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, explodeX],
                              })
                            ),
                          },
                          {
                            translateY: Animated.add(
                              binaryBottomAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [height/2, 0],
                              }),
                              cubeExplodeAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, explodeY],
                              })
                            ),
                          },
                          {
                            scale: binaryBottomAnim.interpolate({
                              inputRange: [0, 0.8, 1],
                              outputRange: [0.8, 1.2, 0],
                            }),
                          },
                        ],
                        opacity: Animated.multiply(
                          binaryBottomAnim.interpolate({
                            inputRange: [0, 0.4, 0.8, 1],
                            outputRange: [0, 0.8, 1, 0],
                          }),
                          cubeExplodeAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 0],
                          })
                        ),
                      },
                    ]}
                  >
                    {index % 2 === 0 ? '0' : '1'}
                  </Animated.Text>
                );
              })}
              
              {/* Simplified binary data cube representation - more visually appealing */}
              <Animated.View
                style={[
                  styles.dataCubeContainer,
                  {
                    opacity: Animated.multiply(
                      cubeFormAnim,
                      cubeExplodeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 0],
                      })
                    ),
                    transform: [
                      { perspective: 1000 },
                      {
                        scale: cubeFormAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 1],
                        }),
                      },
                      {
                        rotate: cubeRotateAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '360deg'],
                        }),
                      },
                    ],
                  },
                ]}
              >
                {/* Binary Data Cube Grid */}
                <Animated.View style={styles.dataCubeGrid}>
                  {/* Top row */}
                  <View style={styles.dataCubeRow}>
                    <Animated.View
                      style={[
                        styles.dataCubeCell,
                        styles.blueCubeCell,
                        {
                          transform: [
                            {
                              translateX: cubeExplodeAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, -120],
                              }),
                              
                            },
                            {
                              translateY: cubeExplodeAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, -120],
                              }),
                            }
                          ]
                        }
                      ]}
                    >
                      <Text style={styles.cellBinary}>0</Text>
                    </Animated.View>
                    
                    <Animated.View
                      style={[
                        styles.dataCubeCell,
                        styles.blueCubeCell,
                        {
                          transform: [
                            {
                              translateY: cubeExplodeAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, -130],
                              }),
                            }
                          ]
                        }
                      ]}
                    >
                      <Text style={styles.cellBinary}>1</Text>
                    </Animated.View>
                    
                    <Animated.View
                      style={[
                        styles.dataCubeCell,
                        styles.blueCubeCell,
                        {
                          transform: [
                            {
                              translateX: cubeExplodeAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, 120],
                              }),
                              
                            },
                            {
                              translateY: cubeExplodeAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, -120],
                              }),
                            }
                          ]
                        }
                      ]}
                    >
                      <Text style={styles.cellBinary}>0</Text>
                    </Animated.View>
                  </View>
                  
                  {/* Middle row */}
                  <View style={styles.dataCubeRow}>
                    <Animated.View
                      style={[
                        styles.dataCubeCell,
                        styles.greenCubeCell,
                        {
                          transform: [
                            {
                              translateX: cubeExplodeAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, -130],
                              }),
                            }
                          ]
                        }
                      ]}
                    >
                      <Text style={styles.cellBinary}>1</Text>
                    </Animated.View>
                    
                    <Animated.View
                      style={[
                        styles.dataCubeCell,
                        styles.blackCubeCell,
                      ]}
                    />
                    
                    <Animated.View
                      style={[
                        styles.dataCubeCell,
                        styles.orangeCubeCell,
                        {
                          transform: [
                            {
                              translateX: cubeExplodeAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, 130],
                              }),
                            }
                          ]
                        }
                      ]}
                    >
                      <Text style={styles.cellBinary}>1</Text>
                    </Animated.View>
                  </View>
                  
                  {/* Bottom row */}
                  <View style={styles.dataCubeRow}>
                    <Animated.View
                      style={[
                        styles.dataCubeCell,
                        styles.greenCubeCell,
                        {
                          transform: [
                            {
                              translateX: cubeExplodeAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, -120],
                              }),
                              
                            },
                            {
                              translateY: cubeExplodeAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, 120],
                              }),
                            }
                          ]
                        }
                      ]}
                    >
                      <Text style={styles.cellBinary}>0</Text>
                    </Animated.View>
                    
                    <Animated.View
                      style={[
                        styles.dataCubeCell,
                        styles.greenCubeCell,
                        {
                          transform: [
                            {
                              translateY: cubeExplodeAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, 130],
                              }),
                            }
                          ]
                        }
                      ]}
                    >
                      <Text style={styles.cellBinary}>1</Text>
                    </Animated.View>
                    
                    <Animated.View
                      style={[
                        styles.dataCubeCell,
                        styles.orangeCubeCell,
                        {
                          transform: [
                            {
                              translateX: cubeExplodeAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, 120],
                              }),
                              
                            },
                            {
                              translateY: cubeExplodeAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, 120],
                              }),
                            }
                          ]
                        }
                      ]}
                    >
                      <Text style={styles.cellBinary}>0</Text>
                    </Animated.View>
                  </View>
                </Animated.View>
              </Animated.View>
            </Animated.View>
          </Animated.View>
          
          {/* Animated text */}
          <Animated.View
            style={{
              opacity: textOpacityAnim,
              transform: [{ translateY: textSlideAnim }],
            }}
          >
            <Text style={styles.splashTitle}>SCADA Mobile</Text>
            <Text style={styles.splashSubtitle}>Next Generation Control</Text>
          </Animated.View>
          
          {/* Futuristic loading indicator */}
          <View style={styles.splashLoadingContainer}>
            <View style={styles.loadingBar}>
              <Animated.View
                style={[
                  styles.loadingProgress,
                  {
                    transform: [{
                      scaleX: splashFadeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 1],
                      })
                    }],
                  },
                ]}
              />
            </View>
            <Text style={styles.splashLoadingText}>CHECKING SERVER CONNECTION</Text>
          </View>
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
                <Avatar.Icon 
                  size={40} 
                  icon="monitor-dashboard" 
                  style={{backgroundColor: theme.colors.primaryContainer}}
                  color={theme.colors.onPrimaryContainer}
                />
                <Text 
                  variant="headlineSmall" 
                  style={[styles.menuTitle, { color: theme.colors.onPrimary }]}
                >
                  SCADA Mobile
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
  // Splash Screen Styles
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashContent: {
    alignItems: 'center',
  },
  splashLogoContainer: {
    marginBottom: 60,
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowEffect: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: '#42A5F5',
    shadowColor: '#42A5F5',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 50,
    elevation: 20,
  },
  outerRing: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    top: 10,
    left: 10,
  },
  hexagonContainer: {
    width: 140,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    // perspective property is only valid inside a transform array
  },
  scatteredBinary: {
    position: 'absolute',
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'monospace',
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
    zIndex: 10,
  },
  // Data Cube styles - more simplified and clean representation
  dataCubeContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    width: 150,
    height: 150,
  },
  dataCubeGrid: {
    width: 140,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  dataCubeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  dataCubeCell: {
    width: 40,
    height: 40,
    margin: 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(30, 58, 95, 0.5)', // Softer border color
    shadowColor: '#1E3A5F',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3, // Softer shadow
    shadowRadius: 3,
    borderRadius: 3, // Slightly rounded corners
  },
  blueCubeCell: {
    backgroundColor: 'rgba(181, 212, 235, 0.9)', // Soft pastel blue
  },
  greenCubeCell: {
    backgroundColor: 'rgba(187, 226, 213, 0.9)', // Soft pastel green
  },
  orangeCubeCell: {
    backgroundColor: 'rgba(210, 227, 252, 0.9)', // Light pastel blue-purple
  },
  blackCubeCell: {
    backgroundColor: '#1E3A5F', // Dark navy blue instead of black
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  cellBinary: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgba(30, 58, 95, 0.9)', // Dark blue with opacity
    fontFamily: 'monospace',
  },
  splashTitle: {
    fontSize: 42,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  splashSubtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 80,
    letterSpacing: 3,
    fontWeight: '300',
    textTransform: 'uppercase',
  },
  splashLoadingContainer: {
    alignItems: 'center',
    width: width * 0.7,
  },
  loadingBar: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 16,
  },
  loadingProgress: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
    transformOrigin: 'left',
  },
  splashLoadingText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 2,
    fontWeight: '600',
  },
  waveCircle: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'transparent',
  },
  particle: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  particle1: {
    top: height * 0.2,
    left: width * 0.1,
  },
  particle2: {
    top: height * 0.3,
    right: width * 0.1,
  },
  particle3: {
    bottom: height * 0.3,
    left: width * 0.5,
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuTitle: {
    marginLeft: 12,
    fontWeight: '700',
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