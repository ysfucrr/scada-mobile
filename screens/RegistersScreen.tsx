import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Alert,
  BackHandler,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ToastAndroid,
  Platform,
  ScrollView
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import SwipeGestureRecognizer from 'react-native-swipe-gestures';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, Card, useTheme as usePaperTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import GradientCard from '../components/GradientCard';
import WriteRegisterModal from '../components/WriteRegisterModal';
import { useConnection } from '../context/ConnectionContext';
import { useOrientation } from '../context/OrientationContext';
import { useTheme as useAppTheme } from '../context/ThemeContext';
import { useWebSocket } from '../context/WebSocketContext';
import ApiService, { RegisterData } from '../services/ApiService';

interface RegistersScreenProps {
  isActive?: boolean;
  onSelectedAnalyzerChange?: (analyzerName: string | null) => void;
}

export default function RegistersScreen({ isActive = true, onSelectedAnalyzerChange }: RegistersScreenProps) {
  const paperTheme = usePaperTheme();
  const { isDarkMode } = useAppTheme();
  const { isConnected } = useConnection();
  const { isLandscape, screenWidth, numColumns, isTablet } = useOrientation();
  const {
    isConnected: wsConnected,
    connect: wsConnect,
    watchRegister,
    unwatchRegister,
    registerValues,
    writeRegister
  } = useWebSocket();
  
  const [registers, setRegisters] = useState<RegisterData[]>([]);
  const [groupedRegisters, setGroupedRegisters] = useState<Map<string, RegisterData[]>>(new Map());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [realTimeValues, setRealTimeValues] = useState<Map<string, any>>(new Map());
  const [writeModalVisible, setWriteModalVisible] = useState(false);
  const [selectedRegister, setSelectedRegister] = useState<RegisterData | null>(null);
  const [registerStates, setRegisterStates] = useState<Map<string, {
    selectedOption?: {label: string, value: number | string} | null;
    selectedButton?: 'on' | 'off' | null;
    showDropdown?: boolean;
    value?: string;
  }>>(new Map());
  const [selectedAnalyzerId, setSelectedAnalyzerId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'analyzers' | 'registers'>('analyzers');
  const [draggedAnalyzerIndex, setDraggedAnalyzerIndex] = useState<number | undefined>(undefined);
  const [analyzerOrder, setAnalyzerOrder] = useState<string[]>([]);
  const [draggedRegisterIndex, setDraggedRegisterIndex] = useState<number | undefined>(undefined);
  const [registerOrder, setRegisterOrder] = useState<string[]>([]);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const isTransitioningRef = useRef(false);
  
  // Animation values - Reanimated 3
  const fadeAnim = useSharedValue(1);
  const slideAnim = useSharedValue(0);
  const breathingAnimAnalyzer = useSharedValue(1);
  const breathingAnimRegister = useSharedValue(1);

  // Animated styles for screen transitions - Reanimated 3 (always call hooks in same order)
  const screenStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [{ translateX: slideAnim.value }],
  }));

  const registerScreenStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [{ translateX: slideAnim.value }],
  }));

  useEffect(() => {
    if (isConnected) {
      loadRegisters();
      if (!wsConnected) {
        wsConnect().catch(console.error);
      }
    } else {
      setRegisters([]);
      setIsLoading(false);
    }
  }, [isConnected, wsConnected]);

  // Android back button handler
  useEffect(() => {
    if (Platform.OS === 'android') {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        if (viewMode === 'registers' && selectedAnalyzerId) {
          handleBackToAnalyzers();
          return true;
        }
        return false;
      });

      return () => backHandler.remove();
    }
  }, [viewMode, selectedAnalyzerId]);

  // Swipe gesture handlers
  const onSwipeRight = useCallback(() => {
    if (Platform.OS === 'ios' && viewMode === 'registers' && selectedAnalyzerId) {
      handleBackToAnalyzers();
    }
  }, [viewMode, selectedAnalyzerId]);
  
  // Kullanıcıya analizörleri sürükleme özelliğini bildirmek için
  useEffect(() => {
    if (analyzerOrder.length > 1 && viewMode === 'analyzers' && !isLoading) {
      // Yalnızca birden fazla analizör olduğunda bildirim göster
      showDragInfo();
    }
  }, [analyzerOrder.length, viewMode, isLoading]);

  // Nefes alma animasyonu - analizör seçildiğinde başlat - Reanimated 3
  useEffect(() => {
    if (draggedAnalyzerIndex !== undefined && viewMode === 'analyzers') {
      breathingAnimAnalyzer.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    } else {
      breathingAnimAnalyzer.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.ease) });
    }
  }, [draggedAnalyzerIndex, viewMode]);

  // Nefes alma animasyonu - register seçildiğinde başlat - Reanimated 3
  useEffect(() => {
    if (draggedRegisterIndex !== undefined && viewMode === 'registers') {
      breathingAnimRegister.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    } else {
      breathingAnimRegister.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.ease) });
    }
  }, [draggedRegisterIndex, viewMode]);

  // Register sıralamasını yükle - seçili analizör değiştiğinde
  useEffect(() => {
    const loadRegisterOrder = async () => {
      if (!selectedAnalyzerId || viewMode !== 'registers') {
        return;
      }
      
      const selectedRegisters = groupedRegisters.get(selectedAnalyzerId) || [];
      if (selectedRegisters.length === 0) {
        return;
      }
      
      try {
        const savedOrder = await AsyncStorage.getItem('register_order');
        if (savedOrder) {
          const orderIds = JSON.parse(savedOrder);
          // Sadece seçili analizörün register'larını filtrele
          const analyzerRegisterIds = selectedRegisters.map(r => r._id);
          const validOrder = orderIds.filter((id: string) => analyzerRegisterIds.includes(id));
          
          // Eksik olanları sona ekle
          const missingRegisters = analyzerRegisterIds.filter(id => !validOrder.includes(id));
          setRegisterOrder([...validOrder, ...missingRegisters]);
        } else {
          // İlk kez için varsayılan sıralama
          setRegisterOrder(selectedRegisters.map(r => r._id));
        }
      } catch (error) {
        console.log('Register sıralaması yüklenirken hata:', error);
        setRegisterOrder(selectedRegisters.map(r => r._id));
      }
    };
    
    loadRegisterOrder();
  }, [selectedAnalyzerId, viewMode, groupedRegisters]);

  // Register'ları WebSocket'e abone et - sadece ekran aktifken ve seçili analizör için
  useEffect(() => {
    // Callback'leri saklamak için Map
    const callbacksMap = new Map<string, (value: any) => void>();
    
    // Sadece ekran aktif, WebSocket bağlı, "registers" görünümünde ve analizör seçiliyse izle
    if (isActive && wsConnected && selectedAnalyzerId && viewMode === 'registers') {
      console.log(`[RegistersScreen] Screen is active - Watching registers for analyzer: ${selectedAnalyzerId}`);
      
      // Sadece seçili analizöre ait register'ları izle
      const analyzerRegisters = registers.filter(register =>
        register.analyzerId.toString() === selectedAnalyzerId
      );
      
      analyzerRegisters.forEach(register => {
        console.log(`[RegistersScreen] Subscribing to register: ${register._id}, address: ${register.address}`);
        
        const callback = (value: any) => {
          setRealTimeValues(prev => {
            const newMap = new Map(prev);
            newMap.set(register._id, value);
            return newMap;
          });
        };
        
        // Callback'i sakla
        callbacksMap.set(register._id, callback);

        watchRegister({
          analyzerId: register.analyzerId,
          address: register.address,
          dataType: register.dataType,
          bit: register.bit,
          registerId: register._id,
        }, callback);
      });
    }
    
    // Cleanup function - ekran pasif olduğunda veya component unmount olduğunda çalışır
    return () => {
      console.log('[RegistersScreen] Cleaning up subscriptions');
      
      // Tüm kayıtlı callback'leri kullanarak unwatch yap
      callbacksMap.forEach((callback, registerId) => {
        const register = registers.find(r => r._id === registerId);
        if (register) {
          console.log(`[RegistersScreen] Unwatching register: ${registerId}, address: ${register.address}`);
          unwatchRegister({
            analyzerId: register.analyzerId,
            address: register.address,
            dataType: register.dataType,
            bit: register.bit,
          }, callback);
        }
      });
      
      // Gerçek zamanlı değerleri temizle
      setRealTimeValues(new Map());
    };
  }, [isActive, wsConnected, registers, selectedAnalyzerId, viewMode, watchRegister, unwatchRegister]);

  const loadRegisters = async () => {
    try {
      const data = await ApiService.getRegisters();
      setRegisters(data);
      
      // Register'ları analyzer'lara göre grupla
      const grouped = new Map<string, RegisterData[]>();
      data.forEach(register => {
        const analyzerId = register.analyzerId.toString();
        if (!grouped.has(analyzerId)) {
          grouped.set(analyzerId, []);
        }
        grouped.get(analyzerId)!.push(register);
      });
      
      // Kaydedilmiş analizör sıralamasını kontrol et
      try {
        const savedOrder = await AsyncStorage.getItem('analyzer_order');
        if (savedOrder) {
          const orderIds = JSON.parse(savedOrder);
          setAnalyzerOrder(orderIds);
        } else {
          // İlk kez için varsayılan sıralama oluştur
          setAnalyzerOrder(Array.from(grouped.keys()));
        }
      } catch (error) {
        console.log('Analizör sıralaması yüklenirken hata:', error);
        // Hata durumunda varsayılan sıralama kullan
        setAnalyzerOrder(Array.from(grouped.keys()));
      }
      
      setGroupedRegisters(grouped);
    } catch (error) {
      console.error('Error loading registers:', error);
      Alert.alert(
        'Error',
        'Failed to load registers. Please check your connection.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!isConnected) {
      Alert.alert(
        'Not Connected',
        'Please connect to the server first from the Settings tab.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsRefreshing(true);
    await loadRegisters();
    setIsRefreshing(false);
  };

  const handleWriteRegister = async (register: RegisterData) => {
    const registerState = registerStates.get(register._id) || {};
    let writeValue: number;

    const isDropdown = register.controlType === 'dropdown' && register.dropdownOptions && register.dropdownOptions.length > 0;
    const isButton = register.controlType === 'button';

    if (isDropdown) {
      if (!registerState.selectedOption) {
        Alert.alert('Error', 'Please select a value');
        return;
      }
      writeValue = typeof registerState.selectedOption.value === 'number' 
        ? registerState.selectedOption.value 
        : parseFloat(registerState.selectedOption.value.toString());
      if (isNaN(writeValue)) {
        Alert.alert('Error', 'Invalid value selected');
        return;
      }
    } else if (isButton) {
      if (!registerState.selectedButton) {
        Alert.alert('Error', 'Please select ON or OFF state');
        return;
      }
      const buttonValue = registerState.selectedButton === 'on' ? register.onValue : register.offValue;
      if (buttonValue === undefined || buttonValue === null) {
        Alert.alert('Error', 'Button value not configured');
        return;
      }
      writeValue = typeof buttonValue === 'number' ? buttonValue : parseFloat(buttonValue.toString());
      if (isNaN(writeValue)) {
        Alert.alert('Error', 'Invalid button value');
        return;
      }
    } else {
      if (!registerState.value || !registerState.value.trim()) {
        Alert.alert('Error', 'Please enter a valid value');
        return;
      }
      writeValue = parseFloat(registerState.value);
      if (isNaN(writeValue)) {
        Alert.alert('Error', 'Please enter a numeric value');
        return;
      }
    }

    try {
      await writeRegister(register._id, writeValue);
      
      const successMessage = isDropdown 
        ? `Write command sent successfully!\nRegister: ${register.name}\nValue: ${registerState.selectedOption?.label}`
        : isButton
        ? `Write command sent successfully!\nRegister: ${register.name}\nState: ${registerState.selectedButton === 'on' ? 'ON' : 'OFF'}\nValue: ${writeValue}`
        : `Write command sent successfully!\nRegister: ${register.name}\nValue: ${writeValue}`;
      
      Alert.alert('Success', successMessage);
      
      // State'i temizle
      setRegisterStates(prev => {
        const newMap = new Map(prev);
        const state = newMap.get(register._id) || {};
        newMap.set(register._id, {
          ...state,
          selectedOption: null,
          selectedButton: null,
          value: '',
        });
        return newMap;
      });
    } catch (error) {
      console.error('Write error:', error);
      Alert.alert(
        'Write Failed',
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
    }
  };

  const updateRegisterState = (registerId: string, updates: any) => {
    setRegisterStates(prev => {
      const newMap = new Map(prev);
      const currentState = newMap.get(registerId) || {};
      newMap.set(registerId, { ...currentState, ...updates });
      return newMap;
    });
  };
  
  // Analizör sürükleme başladığında çağrılır
  const handleAnalyzerLongPress = useCallback((index: number) => {
    setDraggedAnalyzerIndex(index);
    
    // Android cihazlarda bir bildirim göster
    if (Platform.OS === 'android') {
      ToastAndroid.showWithGravityAndOffset(
        'Bırakmak istediğiniz konuma sürükleyin',
        ToastAndroid.SHORT,
        ToastAndroid.BOTTOM,
        0,
        100
      );
    }
  }, []);

  // Analizör seçimini kaldır (tek tıklama ile)
  const handleAnalyzerPress = useCallback((index: number) => {
    // Eğer bu analizör zaten seçiliyse, seçimi kaldır
    if (draggedAnalyzerIndex === index) {
      setDraggedAnalyzerIndex(undefined);
    }
  }, [draggedAnalyzerIndex]);
  
  // Analizör bırakıldığında çağrılır
  const handleAnalyzerDrop = useCallback(async (targetIndex: number) => {
    if (draggedAnalyzerIndex === undefined || draggedAnalyzerIndex === targetIndex) {
      setDraggedAnalyzerIndex(undefined);
      return;
    }

    // Sürüklenen analizörün yeni konumunu hesaplama
    const newOrder = [...analyzerOrder];
    const [draggedItem] = newOrder.splice(draggedAnalyzerIndex, 1);
    newOrder.splice(targetIndex, 0, draggedItem);
    
    // Yeni sıralamayı güncelle
    setAnalyzerOrder(newOrder);
    
    // Yeni sıralamayı kalıcı olarak kaydetme
    try {
      await AsyncStorage.setItem('analyzer_order', JSON.stringify(newOrder));
    } catch (error) {
      console.error('Analizör sıralaması kaydedilirken hata:', error);
    }
    
    // Sürüklemeyi sonlandır
    setDraggedAnalyzerIndex(undefined);
  }, [draggedAnalyzerIndex, analyzerOrder]);

  // Register sürükleme başladığında çağrılır
  const handleRegisterLongPress = useCallback((index: number) => {
    setDraggedRegisterIndex(index);
    
    // Android cihazlarda bir bildirim göster
    if (Platform.OS === 'android') {
      ToastAndroid.showWithGravityAndOffset(
        'Bırakmak istediğiniz konuma sürükleyin',
        ToastAndroid.SHORT,
        ToastAndroid.BOTTOM,
        0,
        100
      );
    }
  }, []);

  // Register seçimini kaldır (tek tıklama ile)
  const handleRegisterPress = useCallback((index: number) => {
    // Eğer bu register zaten seçiliyse, seçimi kaldır
    if (draggedRegisterIndex === index) {
      setDraggedRegisterIndex(undefined);
    }
  }, [draggedRegisterIndex]);
  
  // Register bırakıldığında çağrılır
  const handleRegisterDrop = useCallback(async (targetIndex: number) => {
    if (draggedRegisterIndex === undefined || draggedRegisterIndex === targetIndex) {
      setDraggedRegisterIndex(undefined);
      return;
    }

    // Sürüklenen register'ın yeni konumunu hesaplama
    const newOrder = [...registerOrder];
    const [draggedItem] = newOrder.splice(draggedRegisterIndex, 1);
    newOrder.splice(targetIndex, 0, draggedItem);
    
    // Yeni sıralamayı güncelle
    setRegisterOrder(newOrder);
    
    // Yeni sıralamayı kalıcı olarak kaydetme
    try {
      await AsyncStorage.setItem('register_order', JSON.stringify(newOrder));
    } catch (error) {
      console.error('Register sıralaması kaydedilirken hata:', error);
    }
    
    // Sürüklemeyi sonlandır
    setDraggedRegisterIndex(undefined);
  }, [draggedRegisterIndex, registerOrder]);

  const handleAnalyzerSelect = (analyzerId: string) => {
    // Prevent multiple calls during transition
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;
    setIsTransitioning(true);
    
    // Analizör adını bul
    const analyzerRegisters = groupedRegisters.get(analyzerId) || [];
    const analyzerName = analyzerRegisters.length > 0 
      ? analyzerRegisters[0].analyzerName || `Analyzer ${analyzerId}`
      : `Analyzer ${analyzerId}`;
    
    // App.tsx'e seçili analizör adını bildir
    if (onSelectedAnalyzerChange) {
      onSelectedAnalyzerChange(analyzerName);
    }
    
    // Helper function to reset transition flag
    const resetTransitionFlag = () => {
      isTransitioningRef.current = false;
      setIsTransitioning(false);
    };
    
    // Update state immediately for instant response
    setRealTimeValues(new Map());
    setSelectedAnalyzerId(analyzerId);
    setViewMode('registers');
    
    // Very fast fade out animation
    fadeAnim.value = withTiming(0, { 
      duration: 100, 
      easing: Easing.out(Easing.ease) 
    });
    slideAnim.value = withTiming(-20, { 
      duration: 100, 
      easing: Easing.out(Easing.ease) 
    }, (finished) => {
      if (finished) {
        // Very fast fade in animation
        slideAnim.value = 20;
        fadeAnim.value = withTiming(1, { 
          duration: 150, 
          easing: Easing.out(Easing.ease) 
        });
        slideAnim.value = withTiming(0, { 
          duration: 150, 
          easing: Easing.out(Easing.ease) 
        }, (finished) => {
          if (finished) {
            runOnJS(resetTransitionFlag)();
          }
        });
      }
    });
  };

  const handleBackToAnalyzers = () => {
    // Prevent multiple calls during transition
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;
    setIsTransitioning(true);
    
    // App.tsx'e seçili analizör olmadığını bildir
    if (onSelectedAnalyzerChange) {
      onSelectedAnalyzerChange(null);
    }
    
    // Helper function to reset transition flag
    const resetTransitionFlag = () => {
      isTransitioningRef.current = false;
      setIsTransitioning(false);
    };
    
    // Update state immediately for instant response
    setRealTimeValues(new Map());
    setSelectedAnalyzerId(null);
    setViewMode('analyzers');
    
    // Very fast fade out animation
    fadeAnim.value = withTiming(0, { 
      duration: 100, 
      easing: Easing.out(Easing.ease) 
    });
    slideAnim.value = withTiming(20, { 
      duration: 100, 
      easing: Easing.out(Easing.ease) 
    }, (finished) => {
      if (finished) {
        // Very fast fade in animation
        slideAnim.value = -20;
        fadeAnim.value = withTiming(1, { 
          duration: 150, 
          easing: Easing.out(Easing.ease) 
        });
        slideAnim.value = withTiming(0, { 
          duration: 150, 
          easing: Easing.out(Easing.ease) 
        }, (finished) => {
          if (finished) {
            runOnJS(resetTransitionFlag)();
          }
        });
      }
    });
  };

  const getAnalyzerStats = (analyzerId: string) => {
    const analyzerRegisters = groupedRegisters.get(analyzerId) || [];
    const liveCount = analyzerRegisters.filter(reg => 
      realTimeValues.has(reg._id)
    ).length;
    
    return {
      total: analyzerRegisters.length,
      live: liveCount
    };
  };

  const renderAnalyzerItem = ({ item, index }: { item: [string, RegisterData[]], index: number }) => {
    const [analyzerId, analyzerRegisters] = item;
    const firstRegister = analyzerRegisters[0];
    const stats = getAnalyzerStats(analyzerId);
    const isBeingDragged = draggedAnalyzerIndex === index;
    const gradientColors = isDarkMode ? ['#263238', '#37474F'] as const : ['#1E88E5', '#42A5F5'] as const;
    
    // Calculate card width based on numColumns with proper spacing
    // Phone landscape: better padding and gap
    // Tablet: optimized for larger screens
    const analyzerHorizontalPadding = isTablet ? (isLandscape ? 16 : 20) : (isLandscape ? 20 : 16);
    const analyzerCardGap = isTablet ? (isLandscape ? 16 : 12) : (isLandscape ? 16 : 12);
    
    const analyzerCardWidth = numColumns > 1
      ? (screenWidth - (analyzerHorizontalPadding * 2) - (analyzerCardGap * (numColumns - 1))) / numColumns
      : undefined;
    
    return (
      <MotiView
        from={{ opacity: 0, scale: 0.95, translateY: 10 }}
        animate={{ 
          opacity: isTransitioning ? 0 : 1, 
          scale: isTransitioning ? 0.95 : 1, 
          translateY: isTransitioning ? 10 : 0 
        }}
        transition={{ 
          type: 'spring', 
          damping: 18, 
          stiffness: 90, 
          mass: 0.8,
          delay: isTransitioning ? 0 : index * 40 
        }}
        style={analyzerCardWidth ? { width: analyzerCardWidth } : undefined}
      >
        <View>
          <TouchableOpacity
            onLongPress={() => handleAnalyzerLongPress(index)}
            onPress={() => {
              // Eğer bu analizör seçiliyse, seçimi kaldır
              if (draggedAnalyzerIndex === index) {
                handleAnalyzerPress(index);
              } 
              // Eğer başka bir analizör seçiliyse ve bu analizöre drop yapılabilirse, drop yap
              else if (draggedAnalyzerIndex !== undefined && draggedAnalyzerIndex !== index) {
                handleAnalyzerDrop(index);
              }
              // Normal durumda analizörü seç
              else {
                handleAnalyzerSelect(analyzerId);
              }
            }}
            activeOpacity={0.9}
            delayLongPress={500}
          >
            <View style={[
              styles.cardWrapper,
              numColumns > 1 && { marginBottom: 0 }
            ]}>
              <GradientCard
                colors={gradientColors}
                style={{
                  ...styles.analyzerCard,
                  ...(isBeingDragged ? styles.beingDragged : {}),
                  ...(draggedAnalyzerIndex !== undefined && draggedAnalyzerIndex !== index ? styles.dropTarget : {}),
                  ...(numColumns > 1 && { marginBottom: 0 })
                }}
                mode="elevated"
              >
                <BlurView
                  intensity={isDarkMode ? 20 : 15}
                  tint={isDarkMode ? "dark" : "light"}
                  style={styles.blurContainer}
                >
                  <View style={styles.analyzerContent}>
                    {/* Header */}
                    <View style={styles.analyzerHeader}>
                      <View style={styles.iconWrapper}>
                        <MaterialCommunityIcons
                          name="chip"
                          size={24}
                          color="white"
                        />
                      </View>
                      <View style={styles.analyzerInfo}>
                        <Text style={styles.analyzerName}>
                          {firstRegister.analyzerName || `analizör ${analyzerId}`}
                        </Text>
                        <Text style={styles.buildingName}>
                          {firstRegister.buildingName || 'Unknown Building'}
                        </Text>
                      </View>
                      {stats.live > 0 && (
                        <View style={styles.liveBadge}>
                          <View style={styles.pulseIndicator} />
                          <Text style={styles.liveText}>LIVE</Text>
                        </View>
                      )}
                    </View>
                    
                    {/* Stats */}
                    <View style={[
                      styles.statsContainer,
                      numColumns > 1 && styles.statsContainerLandscape
                    ]}>
                      <View style={[
                        styles.statCard,
                        numColumns > 1 && styles.statCardLandscape
                      ]}>
                        <Text style={styles.statValue}>
                          {stats.total}
                        </Text>
                        <Text style={styles.statLabel}>
                          Total Registers
                        </Text>
                      </View>
                    </View>
                    
                    {/* Footer */}
                    <View style={styles.analyzerFooter}>
                      <Text style={styles.tapHint}>Tap to view registers</Text>
                      <MaterialCommunityIcons
                        name="chevron-right"
                        size={18}
                        color="rgba(255,255,255,0.8)"
                      />
                    </View>
                  </View>
                </BlurView>
              </GradientCard>
            </View>
          </TouchableOpacity>
        </View>
      </MotiView>
    );
  };

  const renderRegisterItem = ({ item, index }: { item: RegisterData, index: number }) => {
    const realTimeValue = realTimeValues.get(item._id);
    const isWritable = item.registerType !== 'read';
    const isDropdown = isWritable && item.controlType === 'dropdown' && item.dropdownOptions && item.dropdownOptions.length > 0;
    const isButton = isWritable && item.controlType === 'button';
    const isNumeric = isWritable && !isDropdown && !isButton;
    
    // Write register'lar için özel değer gösterimi
    let displayValue: string | number;
    let showWritableLabel = false;
    
    // Boolean register'lar için formatlama fonksiyonu
    const formatBooleanValue = (value: any): string => {
      if (value === true || value === 1 || value === '1' || value === 'true' || value === 'ON') {
        return 'ON';
      } else if (value === false || value === 0 || value === '0' || value === 'false' || value === 'OFF') {
        return 'OFF';
      }
      return String(value);
    };
    
    if (isWritable) {
      displayValue = 'Writable';
      showWritableLabel = false;
    } else if (realTimeValue !== undefined) {
      // Boolean register'lar için özel formatlama
      if (item.dataType === 'boolean') {
        displayValue = formatBooleanValue(realTimeValue);
      } else {
        displayValue = realTimeValue;
      }
    } else if (item.value !== undefined && item.value !== null) {
      // Boolean register'lar için özel formatlama
      if (item.dataType === 'boolean') {
        displayValue = formatBooleanValue(item.value);
      } else {
        displayValue = item.value;
      }
    } else {
      displayValue = 'N/A';
    }
    
    const isRealTime = realTimeValue !== undefined && !isWritable;
    const isBeingDragged = draggedRegisterIndex === index;
    const canDrop = draggedRegisterIndex !== undefined && draggedRegisterIndex !== index;
    const registerState = registerStates.get(item._id) || {};
    
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'active':
          return '#4CAF50';
        case 'inactive':
          return paperTheme.colors.outline;
        case 'error':
          return paperTheme.colors.error;
        default:
          return paperTheme.colors.outline;
      }
    };
    
    const statusColor = getStatusColor(item.status || 'inactive');
    
    // Calculate card width based on numColumns and device type
    // Tablet Portrait (810x1080): 2 columns with optimized padding
    // Tablet Landscape: 3 columns with optimized padding
    // Phone Portrait: 1 column (full width)
    // Phone Landscape (932x430): 2 columns with better spacing
    const registerHorizontalPadding = isTablet ? (isLandscape ? 16 : 20) : (isLandscape ? 20 : 16);
    const registerCardGap = isTablet ? (isLandscape ? 16 : 12) : (isLandscape ? 16 : 12);
    
    const registerCardWidth = numColumns > 1
      ? (screenWidth - (registerHorizontalPadding * 2) - (registerCardGap * (numColumns - 1))) / numColumns
      : undefined;
    
    return (
      <MotiView
        from={{ opacity: 0, scale: 0.95, translateY: 10 }}
        animate={{ 
          opacity: isTransitioning ? 0 : 1, 
          scale: isTransitioning ? 0.95 : 1, 
          translateY: isTransitioning ? 10 : 0 
        }}
        transition={{ 
          type: 'spring', 
          damping: 18, 
          stiffness: 90, 
          mass: 0.8,
          delay: isTransitioning ? 0 : index * 40 
        }}
        style={registerCardWidth ? { width: registerCardWidth } : undefined}
      >
        <View>
          <TouchableOpacity
            onLongPress={() => handleRegisterLongPress(index)}
            onPress={() => {
              // Eğer bu register seçiliyse, seçimi kaldır
              if (draggedRegisterIndex === index) {
                handleRegisterPress(index);
              } 
              // Eğer başka bir register seçiliyse ve bu register'a drop yapılabilirse, drop yap
              else if (draggedRegisterIndex !== undefined && draggedRegisterIndex !== index) {
                handleRegisterDrop(index);
              }
            }}
            activeOpacity={0.9}
            delayLongPress={500}
          >
            <View style={[
              styles.cardWrapper, 
              isBeingDragged ? styles.beingDragged : undefined, 
              canDrop ? styles.dropTarget : undefined,
              numColumns > 1 ? { marginBottom: 0 } : undefined
            ]}>
              <Card
            style={[
              styles.registerCard,
              numColumns > 1 ? { marginBottom: 0 } : undefined,
              registerCardWidth ? { width: registerCardWidth } : undefined,
            ]}
            mode="elevated"
          >
          <Card.Content style={numColumns > 1 ? { 
            flex: 1, 
            justifyContent: 'space-between',
            minHeight: isWritable ? (isTablet ? 280 : 320) : (isTablet ? 200 : 220)
          } : undefined}>
            {/* Modern Header */}
            <View style={[
              styles.registerHeader,
              isTablet && numColumns > 1 && styles.registerHeaderTablet
            ]}>
              <View style={styles.registerHeaderLeft}>
                <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
                <Text style={[
                  styles.registerName, 
                  {color: paperTheme.colors.onSurface},
                  isTablet && numColumns > 1 && styles.registerNameTablet
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
                >
                  {item.name}
                </Text>
              </View>
              
              <View style={styles.registerBadges}>
                {/* Type Badge */}
                <View style={[
                  styles.typeBadge, 
                  { backgroundColor: paperTheme.colors.surfaceVariant },
                  isTablet && numColumns > 1 && styles.typeBadgeTablet
                ]}>
                  <Text style={[
                    styles.typeText, 
                    {color: paperTheme.colors.primary},
                    isTablet && numColumns > 1 && styles.typeTextTablet
                  ]}>
                    {item.dataType?.toUpperCase()}
                  </Text>
                </View>
                
                {isRealTime && (
                  <View style={[
                    styles.liveBadgeSmall,
                    isTablet && numColumns > 1 && styles.liveBadgeSmallTablet
                  ]}>
                    <View style={styles.pulseIndicatorSmall} />
                    <Text style={[
                      styles.liveTextSmall,
                      isTablet && numColumns > 1 && styles.liveTextSmallTablet
                    ]}>LIVE</Text>
                  </View>
                )}
              </View>
            </View>
            
            {/* Value Display - Modern */}
            <View style={[
              styles.registerValueContainer, 
              { 
                backgroundColor: isRealTime ? 'rgba(244, 67, 54, 0.08)' : paperTheme.colors.surfaceVariant 
              },
              // Responsive padding for tablet
              isTablet && numColumns > 1 && styles.registerValueContainerTablet
            ]}>
              <Text
                style={[
                  styles.registerValue,
                  {
                    color: isRealTime ? '#F44336' : (displayValue === 'Writable' ? paperTheme.colors.primary : paperTheme.colors.onSurface),
                    fontSize: isTablet && numColumns > 1
                      ? (typeof displayValue === 'number' && displayValue.toString().length > 8 ? 18 : (displayValue === 'Writable' || displayValue === 'N/A' ? 16 : 24))
                      : (typeof displayValue === 'number' && displayValue.toString().length > 8 ? 20 : (displayValue === 'Writable' || displayValue === 'N/A' ? 18 : 28)),
                    fontStyle: (displayValue === 'Writable' || displayValue === 'N/A') ? 'italic' : 'normal'
                  }
                ]}
                numberOfLines={2}
                adjustsFontSizeToFit={true}
                minimumFontScale={0.7}
              >
                {displayValue}
              </Text>
              {item.unit && typeof displayValue === 'number' && (
                <Text style={[
                  styles.unitText, 
                  {color: paperTheme.colors.onSurfaceVariant},
                  isTablet && numColumns > 1 && styles.unitTextTablet
                ]}>
                  {item.unit}
                </Text>
              )}
              {showWritableLabel && (
                <View style={styles.writableBadge}>
                  <Text style={styles.writableBadgeText}>Writable</Text>
                </View>
              )}
            </View>
            
            {/* Write Controls - Dropdown, Button, or Numeric Input */}
            {isWritable && (
              <View style={[
                styles.writeControlsContainer,
                isTablet && numColumns > 1 && styles.writeControlsContainerTablet
              ]}>
                {isDropdown ? (
                  <View style={styles.writeControlSection}>
                    <TouchableOpacity
                      style={[
                        styles.dropdownButton, 
                        { borderColor: paperTheme.colors.outline },
                        isTablet && numColumns > 1 && styles.dropdownButtonTablet
                      ]}
                      onPress={() => updateRegisterState(item._id, { showDropdown: !registerState.showDropdown })}
                    >
                      <Text 
                        style={[
                          styles.dropdownButtonText, 
                          !registerState.selectedOption && styles.placeholderText,
                          isTablet && numColumns > 1 && styles.dropdownButtonTextTablet
                        ]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {registerState.selectedOption ? registerState.selectedOption.label : 'Select a value...'}
                      </Text>
                      <MaterialCommunityIcons
                        name={registerState.showDropdown ? "chevron-up" : "chevron-down"}
                        size={isTablet && numColumns > 1 ? 18 : 20}
                        color={paperTheme.colors.onSurfaceVariant}
                      />
                    </TouchableOpacity>
                    {registerState.showDropdown && (
                      <View style={[
                        styles.dropdownList, 
                        { borderColor: paperTheme.colors.outline },
                        isTablet && numColumns > 1 && styles.dropdownListTablet
                      ]}>
                        <ScrollView style={styles.dropdownScrollView} nestedScrollEnabled={true}>
                          {item.dropdownOptions?.map((option, optIndex) => (
                            <TouchableOpacity
                              key={optIndex}
                              style={[
                                styles.dropdownItem,
                                registerState.selectedOption?.value === option.value && styles.dropdownItemSelected,
                                isTablet && numColumns > 1 && styles.dropdownItemTablet
                              ]}
                              onPress={() => updateRegisterState(item._id, { 
                                selectedOption: option, 
                                showDropdown: false 
                              })}
                            >
                              <Text style={[
                                styles.dropdownItemText,
                                registerState.selectedOption?.value === option.value && styles.dropdownItemTextSelected,
                                isTablet && numColumns > 1 && styles.dropdownItemTextTablet
                              ]}
                              numberOfLines={1}
                              ellipsizeMode="tail"
                              >
                                {option.label}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>
                ) : isButton ? (
                  <View style={[
                    styles.stateButtonContainer,
                    isTablet && numColumns > 1 && styles.stateButtonContainerTablet
                  ]}>
                    <TouchableOpacity
                      style={[
                        styles.stateButton,
                        registerState.selectedButton === 'on' && styles.stateButtonSelected,
                        registerState.selectedButton === 'on' && styles.stateButtonOn,
                        isTablet && numColumns > 1 && styles.stateButtonTablet
                      ]}
                      onPress={() => updateRegisterState(item._id, { selectedButton: 'on' })}
                    >
                      <Text style={[
                        styles.stateButtonText,
                        registerState.selectedButton === 'on' && styles.stateButtonTextSelected,
                        isTablet && numColumns > 1 && styles.stateButtonTextTablet
                      ]}
                      numberOfLines={1}
                      >
                        ON state
                      </Text>
                      <Text style={[
                        styles.stateButtonValue,
                        isTablet && numColumns > 1 && styles.stateButtonValueTablet
                      ]}
                      numberOfLines={1}
                      >
                        {item.onValue !== undefined && item.onValue !== null ? item.onValue : 'N/A'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.stateButton,
                        registerState.selectedButton === 'off' && styles.stateButtonSelected,
                        registerState.selectedButton === 'off' && styles.stateButtonOff,
                        isTablet && numColumns > 1 && styles.stateButtonTablet
                      ]}
                      onPress={() => updateRegisterState(item._id, { selectedButton: 'off' })}
                    >
                      <Text style={[
                        styles.stateButtonText,
                        registerState.selectedButton === 'off' && styles.stateButtonTextSelected,
                        isTablet && numColumns > 1 && styles.stateButtonTextTablet
                      ]}
                      numberOfLines={1}
                      >
                        OFF state
                      </Text>
                      <Text style={[
                        styles.stateButtonValue,
                        isTablet && numColumns > 1 && styles.stateButtonValueTablet
                      ]}
                      numberOfLines={1}
                      >
                        {item.offValue !== undefined && item.offValue !== null ? item.offValue : 'N/A'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.writeControlSection}>
                    <TextInput
                      style={[
                        styles.numericInput, 
                        { borderColor: paperTheme.colors.outline },
                        isTablet && numColumns > 1 && styles.numericInputTablet
                      ]}
                      value={registerState.value || ''}
                      onChangeText={(text) => updateRegisterState(item._id, { value: text })}
                      placeholder="Enter numeric value"
                      keyboardType="numeric"
                    />
                  </View>
                )}
                
                {/* Write Button */}
                <TouchableOpacity
                  style={[
                    styles.writeActionButton, 
                    { backgroundColor: paperTheme.colors.primary },
                    isTablet && numColumns > 1 && styles.writeActionButtonTablet
                  ]}
                  onPress={() => handleWriteRegister(item)}
                >
                  <Text style={[
                    styles.writeActionButtonText,
                    isTablet && numColumns > 1 && styles.writeActionButtonTextTablet
                  ]}>
                    Write
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            
            {/* Footer */}
            <View style={styles.registerFooter}>
              <View style={styles.footerLeft}>
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={isTablet && numColumns > 1 ? 11 : 12}
                  color={paperTheme.colors.onSurfaceVariant}
                  style={styles.clockIcon}
                />
                <Text style={[
                  styles.lastUpdate, 
                  {color: paperTheme.colors.onSurfaceVariant},
                  isTablet && numColumns > 1 && styles.lastUpdateTablet
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
                >
                  {item.timestamp ? new Date(item.timestamp).toLocaleTimeString('tr-TR', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  }) : 'Never updated'}
                </Text>
              </View>
              
              {!isWritable && (
                <MaterialCommunityIcons
                  name="lock-outline"
                  size={isTablet && numColumns > 1 ? 14 : 16}
                  color={paperTheme.colors.onSurfaceVariant}
                />
              )}
            </View>
          </Card.Content>
        </Card>
      </View>
          </TouchableOpacity>
        </View>
      </MotiView>
    );
  };

  if (!isConnected) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: paperTheme.colors.background }]}>
        <StatusBar style={isDarkMode ? "light" : "dark"} />
        <View style={styles.notConnectedWrapper}>
          <GradientCard
            colors={['#F44336', '#EF5350']}
            style={styles.notConnectedCard}
          >
            <View style={styles.notConnectedContent}>
              <MaterialCommunityIcons
                name="server-off"
                size={64}
                color="white"
                style={styles.notConnectedIcon}
              />
              <Text style={styles.notConnectedText}>
                Not Connected to Server
              </Text>
              <Text style={styles.instructionText}>
                Please configure and connect to the server in the Settings tab.
              </Text>
            </View>
          </GradientCard>
        </View>
      </View>
    );
  }

  // Show loading overlay while data is being loaded
  if (isLoading && groupedRegisters.size === 0 && viewMode === 'analyzers') {
    return (
      <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
        <StatusBar style={isDarkMode ? "light" : "dark"} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={paperTheme.colors.primary} />
          <Text style={[styles.loadingText, { color: paperTheme.colors.onSurface }]}>
            Loading registers...
          </Text>
        </View>
      </View>
    );
  }

  if (viewMode === 'analyzers') {
    // Analizörleri kaydedilmiş sıralamaya göre düzenle
    const sortedAnalyzers = analyzerOrder
      .filter(id => groupedRegisters.has(id))
      .map(id => [id, groupedRegisters.get(id)!] as [string, RegisterData[]]);
    
    // Sıralama listesinde olmayan analizörleri ekle
    Array.from(groupedRegisters.keys()).forEach(id => {
      if (!analyzerOrder.includes(id)) {
        sortedAnalyzers.push([id, groupedRegisters.get(id)!]);
      }
    });

    return (
      <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
        <StatusBar style={isDarkMode ? "light" : "dark"} />
        
        {/* Modern Gradient Background */}
        <LinearGradient
          colors={isDarkMode 
            ? ['#0D1B2A', '#1B263B', '#415A77', '#778DA9']
            : ['#E3F2FD', '#BBDEFB', '#90CAF9', '#64B5F6']}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        
        <Animated.View style={[{ flex: 1 }, screenStyle]}>
          <FlatList
          key={`analyzers-${isLandscape ? 'landscape' : 'portrait'}`}
          data={sortedAnalyzers}
          renderItem={renderAnalyzerItem}
          keyExtractor={(item) => item[0]}
          contentContainerStyle={[
            styles.content,
            {
              paddingHorizontal: isTablet ? (isLandscape ? 16 : 20) : (isLandscape ? 20 : 16),
              flexGrow: 1,
            },
            numColumns > 1 && styles.contentLandscape
          ]}
          numColumns={numColumns}
          columnWrapperStyle={numColumns > 1 ? {
            ...styles.columnWrapper,
            gap: isTablet ? (isLandscape ? 16 : 12) : (isLandscape ? 16 : 12),
            paddingHorizontal: 0,
          } : undefined}
          refreshControl={
            <RefreshControl 
              refreshing={isRefreshing} 
              onRefresh={handleRefresh} 
              colors={[paperTheme.colors.primary]}
              progressViewOffset={80}
              tintColor={paperTheme.colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, {color: paperTheme.colors.onSurfaceVariant}]}>
                No analyzers found
              </Text>
              <Text style={[styles.emptySubtext, {color: paperTheme.colors.outline}]}>
                Pull down to refresh
              </Text>
            </View>
          }
          />
        </Animated.View>
      </View>
    );
  }

  // Register view mode
  const selectedRegistersUnsorted = selectedAnalyzerId ? groupedRegisters.get(selectedAnalyzerId) || [] : [];
  
  // Register'ları kaydedilmiş sıralamaya göre düzenle
  const selectedRegisters = registerOrder.length > 0
    ? registerOrder
        .filter(id => selectedRegistersUnsorted.some(r => r._id === id))
        .map(id => selectedRegistersUnsorted.find(r => r._id === id)!)
        .concat(selectedRegistersUnsorted.filter(r => !registerOrder.includes(r._id)))
    : selectedRegistersUnsorted;
  
  const selectedAnalyzerName = selectedRegisters.length > 0 
    ? selectedRegisters[0].analyzerName || `Analyzer ${selectedAnalyzerId}`
    : 'Unknown Analyzer';

  const swipeConfig = {
    velocityThreshold: 0.3,
    directionalOffsetThreshold: 80,
    gestureIsClickThreshold: 5,
  };

  return (
    <SwipeGestureRecognizer
      onSwipeRight={onSwipeRight}
      config={swipeConfig}
      style={{ flex: 1 }}
    >
      <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
        <StatusBar style={isDarkMode ? "light" : "dark"} />
        
        {/* Modern Gradient Background */}
        <LinearGradient
          colors={isDarkMode 
            ? ['#0D1B2A', '#1B263B', '#415A77', '#778DA9']
            : ['#E3F2FD', '#BBDEFB', '#90CAF9', '#64B5F6']}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        
        <Animated.View style={[{ flex: 1 }, registerScreenStyle]}>
          <FlatList
        key={`registers-${isLandscape ? 'landscape' : 'portrait'}-${numColumns}`}
        data={selectedRegisters}
        renderItem={renderRegisterItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={[
          styles.content, 
          { paddingTop: 8 },
          {
            paddingHorizontal: isTablet ? (isLandscape ? 16 : 20) : (isLandscape ? 20 : 16),
            flexGrow: 1,
          },
          numColumns > 1 ? styles.contentLandscape : undefined
        ]}
        numColumns={numColumns}
        columnWrapperStyle={numColumns > 1 ? {
          ...styles.columnWrapper,
          gap: isTablet ? (isLandscape ? 16 : 12) : (isLandscape ? 16 : 12),
          paddingHorizontal: 0,
          alignItems: 'stretch', // Ensure cards in same row have same height
        } : undefined}
        refreshControl={
          <RefreshControl 
            refreshing={isRefreshing} 
            onRefresh={handleRefresh}
            colors={[paperTheme.colors.primary]}
            progressViewOffset={80}
            tintColor={paperTheme.colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, {color: paperTheme.colors.onSurfaceVariant}]}>
              No registers found for this analyzer
            </Text>
            <Text style={[styles.emptySubtext, {color: paperTheme.colors.outline}]}>
              Pull down to refresh
            </Text>
          </View>
        }
      />
      
      <WriteRegisterModal
        visible={writeModalVisible}
        register={selectedRegister}
        onClose={() => setWriteModalVisible(false)}
      />
        </Animated.View>
      </View>
    </SwipeGestureRecognizer>
  );
}

// Kullanıcıya analizör sürükleme özelliğini bildirmek için toast
const showDragInfo = () => {
  if (Platform.OS === 'android') {
    ToastAndroid.showWithGravityAndOffset(
      'Analizörleri sıralamak için uzun basın ve sürükleyin',
      ToastAndroid.LONG,
      ToastAndroid.BOTTOM,
      0,
      100
    );
  }
};

const styles = StyleSheet.create({
  beingDragged: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 15,
  },
  dropTarget: {
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    borderStyle: 'dashed',
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  container: {
    flex: 1,
  },
  cardWrapper: {
    marginVertical: 8, // Increased from 4 to 8 for better spacing
    marginHorizontal: 0,
    flex: 1,
    minWidth: 0,
    // Ensure cards stretch to fill available space in grid
    alignSelf: 'stretch',
  },
  valueWrapper: {
    marginVertical: 4,
  },
  content: {
    paddingTop: 16,
    paddingBottom: 32,
    // paddingHorizontal will be set dynamically based on device type
  },
  contentLandscape: {
    // paddingHorizontal will be set dynamically
  },
  columnWrapper: {
    justifyContent: 'flex-start',
    paddingHorizontal: 0,
    // gap will be set dynamically based on device type
    alignItems: 'stretch', // Ensure cards in same row have same height
    marginBottom: 0, // Remove bottom margin from wrapper
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  
  // Not Connected Styles
  notConnectedWrapper: {
    width: '90%',
  },
  notConnectedCard: {
    elevation: 4,
  },
  notConnectedContent: {
    padding: 48,
    alignItems: 'center',
  },
  notConnectedIcon: {
    marginBottom: 24,
  },
  notConnectedText: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
    color: 'white',
  },
  instructionText: {
    fontSize: 16,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 20,
  },
  
  // Modern Analyzer Card Styles
  analyzerCard: {
    elevation: 3,
    marginBottom: 0, // Margin handled by cardWrapper
    flex: 1,
    marginHorizontal: 0,
    minWidth: 0,
  },
  blurContainer: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  analyzerContent: {
    padding: 16,
  },
  analyzerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconWrapper: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 8,
    marginRight: 12,
  },
  analyzerInfo: {
    flex: 1,
  },
  analyzerName: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
    marginBottom: 2,
  },
  buildingName: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  liveBadge: {
    backgroundColor: '#F44336',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pulseIndicator: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'white',
    marginRight: 3,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'white',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
    justifyContent: 'center',
  },
  statsContainerLandscape: {
    justifyContent: 'flex-start',
  },
  statCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    flex: 1,
    minWidth: 100,
  },
  statCardLandscape: {
    flex: 1,
    minWidth: 0,
  },
  liveStatCard: {
    backgroundColor: 'rgba(244, 67, 54, 0.15)',
    borderColor: 'rgba(244, 67, 54, 0.3)',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: 'white',
    marginBottom: 2,
  },
  liveStatValue: {
    color: '#F44336',
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  analyzerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  tapHint: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  
  // Modern Register Card Styles
  registerCard: {
    marginBottom: 0, // Margin handled by cardWrapper
    borderRadius: 12,
    elevation: 2,
    flex: 1,
    marginHorizontal: 0,
    minWidth: 0,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    // Ensure cards fill available space in grid layout and have consistent height
    alignSelf: 'stretch',
    width: '100%',
  },
  registerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  registerHeaderTablet: {
    marginBottom: 10,
  },
  registerHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
    minWidth: 0,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  registerBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  liveBadgeSmall: {
    backgroundColor: '#F44336',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 6,
  },
  liveBadgeSmallTablet: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: 4,
  },
  pulseIndicatorSmall: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'white',
    marginRight: 4,
  },
  liveTextSmall: {
    fontSize: 9,
    fontWeight: '700',
    color: 'white',
    letterSpacing: 0.5,
  },
  liveTextSmallTablet: {
    fontSize: 8,
    letterSpacing: 0.3,
  },
  registerValueContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'flex-start',
    minHeight: 80,
    justifyContent: 'center',
    flexShrink: 1,
  },
  registerValueContainerTablet: {
    padding: 12,
    minHeight: 70,
  },
  registerName: {
    fontSize: 15,
    fontWeight: '700',
    color: 'rgba(0,0,0,0.87)',
    flex: 1,
    flexShrink: 1,
  },
  registerNameTablet: {
    fontSize: 14,
  },
  registerValue: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 4,
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  unitText: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
  },
  unitTextTablet: {
    fontSize: 11,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeBadgeTablet: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  typeTextTablet: {
    fontSize: 9,
  },
  registerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.08)',
    // Push footer to bottom when using flex layout in grid mode
    marginTop: 'auto',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  clockIcon: {
    marginRight: 4,
  },
  lastUpdate: {
    fontSize: 11,
    fontWeight: '500',
  },
  lastUpdateTablet: {
    fontSize: 10,
  },
  writeButtonContainer: {
    padding: 4,
    borderRadius: 8,
  },
  
  // Navigation Styles
  backHeader: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  backHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backIconButton: {
    marginLeft: -8,
    marginRight: 4,
  },
  headerTitleSection: {
    flex: 1,
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.08)',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 8,
  },
  analyzerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  registerCount: {
    fontSize: 12,
    marginTop: 2,
  },
  headerRightSection: {
    marginLeft: 'auto',
    paddingLeft: 8,
  },
  
  // Modern Header Styles
  modernHeader: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  headerTextContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
  },
  headerActions: {
    marginLeft: 'auto',
  },
  liveIndicatorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'white',
    marginRight: 4,
  },
  liveTextHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: 'white',
  },
  
  // Loading Styles
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  
  // Empty State Styles
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 14,
  },
  writeControlsContainer: {
    marginTop: 12,
    marginBottom: 8,
  },
  writeControlsContainerTablet: {
    marginTop: 10,
    marginBottom: 6,
  },
  writeControlSection: {
    marginBottom: 12,
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  dropdownButtonTablet: {
    padding: 10,
    borderRadius: 6,
  },
  dropdownButtonText: {
    fontSize: 14,
    color: '#2c3e50',
    flex: 1,
  },
  dropdownButtonTextTablet: {
    fontSize: 12,
  },
  placeholderText: {
    color: '#95a5a6',
  },
  dropdownList: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: '#fff',
    maxHeight: 150,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dropdownListTablet: {
    maxHeight: 120,
    borderRadius: 6,
  },
  dropdownScrollView: {
    maxHeight: 150,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  dropdownItemTablet: {
    padding: 10,
  },
  dropdownItemSelected: {
    backgroundColor: '#e3f2fd',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#2c3e50',
  },
  dropdownItemTextTablet: {
    fontSize: 12,
  },
  dropdownItemTextSelected: {
    color: '#1976d2',
    fontWeight: '600',
  },
  stateButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  stateButtonContainerTablet: {
    gap: 8,
    marginBottom: 10,
  },
  stateButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  stateButtonTablet: {
    padding: 10,
    borderRadius: 6,
  },
  stateButtonSelected: {
    borderWidth: 2,
  },
  stateButtonOn: {
    borderColor: '#4CAF50',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  stateButtonOff: {
    borderColor: '#F44336',
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
  },
  stateButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 4,
  },
  stateButtonTextTablet: {
    fontSize: 12,
    marginBottom: 2,
  },
  stateButtonTextSelected: {
    color: '#1976d2',
  },
  stateButtonValue: {
    fontSize: 12,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  stateButtonValueTablet: {
    fontSize: 11,
  },
  numericInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  numericInputTablet: {
    padding: 10,
    fontSize: 13,
    borderRadius: 6,
  },
  writeActionButton: {
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  writeActionButtonTablet: {
    padding: 10,
    borderRadius: 6,
    marginTop: 6,
  },
  writeActionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  writeActionButtonTextTablet: {
    fontSize: 12,
  },
  writableBadge: {
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  writableBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1976d2',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});