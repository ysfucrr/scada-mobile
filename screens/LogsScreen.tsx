import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Alert,
  BackHandler,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ToastAndroid,
  Platform
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
import { ActivityIndicator, useTheme as usePaperTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

// Components
import GradientCard from '../components/GradientCard';
import LogCard from '../components/LogCard';

// Contexts
import { useConnection } from '../context/ConnectionContext';
import { useOrientation } from '../context/OrientationContext';
import { useTheme as useAppTheme } from '../context/ThemeContext';

// Services
import ApiService from '../services/ApiService';
import LogEntriesScreen from './LogEntriesScreen';

// Types
export interface TrendLogData {
  _id: string;
  analyzerId: string;
  analyzerName: string;
  registerId: string;
  registerName: string;
  registerAddress: number;
  buildingName: string;
  period: string;
  interval: number;
  endDate: string;
  status: string;
  isKWHCounter: boolean;
  dataType: string;
  unit: string;
  createdAt: string;
  updatedAt: string;
}

interface LogsScreenProps {
  onSelectedAnalyzerChange?: (analyzerName: string | null) => void;
  onLogEntryTitleChange?: (title: string | null) => void;
}

// Analyzer Item Component - Separate component to use hooks properly
const AnalyzerItem = React.memo(({
  item,
  index,
  isBeingDragged,
  isSelected,
  canDrop,
  draggedAnalyzerIndex,
  breathingAnimValue,
  onLongPress,
  onPress,
  onSelect,
  onDrop,
  getAnalyzerStats,
  isDarkMode,
  screenWidth,
  numColumns
}: {
  item: [string, TrendLogData[]];
  index: number;
  isBeingDragged: boolean;
  isSelected: boolean;
  canDrop: boolean;
  draggedAnalyzerIndex: number | undefined;
  breathingAnimValue: ReturnType<typeof useSharedValue<number>>;
  onLongPress: () => void;
  onPress: () => void;
  onSelect: () => void;
  onDrop: () => void;
  getAnalyzerStats: (analyzerId: string) => { total: number; running: number };
  isDarkMode: boolean;
  screenWidth: number;
  numColumns: number;
}) => {
  const [analyzerId, analyzerLogs] = item;
  const firstLog = analyzerLogs[0];
  const stats = getAnalyzerStats(analyzerId);
  const gradientColors = isDarkMode 
    ? ['#1A237E', '#283593', '#3949AB'] as [string, string, ...string[]]
    : ['#1E88E5', '#42A5F5', '#64B5F6'] as [string, string, ...string[]];
  
  // Animated style for breathing animation - Reanimated 3
  const breathingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: isBeingDragged ? breathingAnimValue.value : 1 }],
  }), [isBeingDragged, breathingAnimValue]);
  
  // Calculate card width based on numColumns
  const analyzerCardWidth = numColumns > 1
    ? (screenWidth - 24 - (12 * (numColumns - 1))) / numColumns
    : undefined;
  
  return (
    <MotiView
      from={{ opacity: 0, scale: 0.95, translateY: 10 }}
      animate={{ opacity: 1, scale: 1, translateY: 0 }}
      transition={{ 
        type: 'spring', 
        damping: 18, 
        stiffness: 90, 
        mass: 0.8,
        delay: index * 40 
      }}
      style={[
        styles.cardWrapper,
        analyzerCardWidth ? { width: analyzerCardWidth } : undefined,
        numColumns > 1 ? { marginBottom: 0 } : undefined
      ]}
    >
      <TouchableOpacity
        onLongPress={onLongPress}
        onPress={() => {
          if (isSelected) {
            onPress();
          } else if (canDrop) {
            onDrop();
          } else {
            onSelect();
          }
        }}
        activeOpacity={1}
        delayLongPress={500}
      >
        <Animated.View style={breathingStyle}>
          <GradientCard
            colors={gradientColors}
            style={StyleSheet.flatten([
              styles.analyzerCard,
              isBeingDragged ? styles.beingDragged : undefined,
              canDrop ? styles.dropTarget : undefined,
              numColumns > 1 ? { marginBottom: 0 } : undefined
            ])}
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
                    name="chart-line"
                    size={24}
                    color="white"
                  />
                </View>
                <View style={styles.analyzerInfo}>
                  <Text style={styles.analyzerName}>
                    {firstLog.analyzerName || `Analyzer ${analyzerId}`}
                  </Text>
                  <Text style={styles.buildingName}>
                    {firstLog.buildingName || 'Unknown Building'}
                  </Text>
                </View>
                {stats.running > 0 && (
                  <View style={styles.liveBadge}>
                    <View style={styles.pulseIndicator} />
                    <Text style={styles.liveText}>RUNNING</Text>
                  </View>
                )}
              </View>
              
              {/* Stats */}
              <View style={[
                styles.statsContainer,
                numColumns > 1 ? styles.statsContainerLandscape : undefined
              ]}>
                <View style={[
                  styles.statCard,
                  numColumns > 1 ? styles.statCardLandscape : undefined
                ]}>
                  <Text style={styles.statValue}>
                    {stats.total}
                  </Text>
                  <Text style={styles.statLabel}>
                    Total Logs
                  </Text>
                </View>
              </View>
              
              {/* Footer */}
              <View style={styles.analyzerFooter}>
                <Text style={styles.tapHint}>View logs</Text>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={18}
                  color="rgba(255,255,255,0.8)"
                />
              </View>
            </View>
          </BlurView>
        </GradientCard>
      </Animated.View>
    </TouchableOpacity>
  </MotiView>
  );
});

export default function LogsScreen({ onSelectedAnalyzerChange, onLogEntryTitleChange }: LogsScreenProps) {
  const { isConnected } = useConnection();
  const { isDarkMode } = useAppTheme();
  const paperTheme = usePaperTheme();
  const { isLandscape, screenWidth, numColumns } = useOrientation();
  
  const [trendLogs, setTrendLogs] = useState<TrendLogData[]>([]);
  const [groupedLogs, setGroupedLogs] = useState<Map<string, TrendLogData[]>>(new Map());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAnalyzerId, setSelectedAnalyzerId] = useState<string | null>(null);
  const [selectedTrendLog, setSelectedTrendLog] = useState<TrendLogData | null>(null);
  const [viewMode, setViewMode] = useState<'analyzers' | 'logs' | 'entries'>('analyzers');
  const [draggedAnalyzerIndex, setDraggedAnalyzerIndex] = useState<number | undefined>(undefined);
  const [analyzerOrder, setAnalyzerOrder] = useState<string[]>([]);
  
  // Animation values - Reanimated 3
  const fadeAnim = useSharedValue(1);
  const slideAnim = useSharedValue(0);
  const breathingAnim = useSharedValue(1);
  const isTransitioningRef = useRef(false);

  // Animated styles for screen transitions - Reanimated 3 (must be called before any early returns)
  const screenStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [{ translateX: slideAnim.value }],
  }), []);

  useEffect(() => {
    if (isConnected) {
      loadTrendLogs();
    } else {
      setTrendLogs([]);
      setIsLoading(false);
    }
  }, [isConnected]);

  // Android back button handler
  useEffect(() => {
    if (Platform.OS === 'android') {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        if (viewMode === 'entries' && selectedTrendLog) {
          handleBackToLogs();
          return true;
        } else if (viewMode === 'logs' && selectedAnalyzerId) {
          handleBackToAnalyzers();
          return true;
        }
        return false;
      });

      return () => backHandler.remove();
    }
  }, [viewMode, selectedTrendLog, selectedAnalyzerId]);

  // Swipe gesture handlers
  const onSwipeRight = useCallback(() => {
    if (Platform.OS === 'ios') {
      if (viewMode === 'entries' && selectedTrendLog) {
        handleBackToLogs();
      } else if (viewMode === 'logs' && selectedAnalyzerId) {
        handleBackToAnalyzers();
      }
    }
  }, [viewMode, selectedTrendLog, selectedAnalyzerId]);
  
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
      breathingAnim.value = withRepeat(
        withSequence(
          withTiming(1.05, {
            duration: 800,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(1, {
            duration: 800,
            easing: Easing.inOut(Easing.ease),
          })
        ),
        -1,
        false
      );
    } else {
      breathingAnim.value = withTiming(1, {
        duration: 200,
        easing: Easing.out(Easing.ease),
      });
    }
  }, [draggedAnalyzerIndex, viewMode, breathingAnim]);

  const loadTrendLogs = async () => {
    try {
      const data = await ApiService.getTrendLogs();
      setTrendLogs(data);
      
      // Group trend logs by analyzer
      const grouped = new Map<string, TrendLogData[]>();
      data.forEach((log: TrendLogData) => {
        const analyzerId = log.analyzerId.toString();
        if (!grouped.has(analyzerId)) {
          grouped.set(analyzerId, []);
        }
        grouped.get(analyzerId)!.push(log);
      });
      
      // Kaydedilmiş analizör sıralamasını kontrol et
      try {
        const savedOrder = await AsyncStorage.getItem('logs_analyzer_order');
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
      
      setGroupedLogs(grouped);
    } catch (error) {
      console.error('Error loading trend logs:', error);
      Alert.alert(
        'Error',
        'Failed to load trend logs. Please check your connection.',
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
    await loadTrendLogs();
    setIsRefreshing(false);
  };

  const handleAnalyzerSelect = (analyzerId: string) => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;
    
    // Analizör adını bul
    const analyzerLogs = groupedLogs.get(analyzerId) || [];
    const analyzerName = analyzerLogs.length > 0
      ? analyzerLogs[0].analyzerName || `Analyzer ${analyzerId}`
      : `Analyzer ${analyzerId}`;
    
    // App.tsx'e seçili analizör adını bildir
    if (onSelectedAnalyzerChange) {
      onSelectedAnalyzerChange(analyzerName);
    }
    
    // Helper function to reset transition flag
    const resetTransitionFlag = () => {
      isTransitioningRef.current = false;
    };
    
    // Update state immediately for instant response
    setSelectedAnalyzerId(analyzerId);
    setViewMode('logs');
    
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
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;
    
    // App.tsx'e seçili analizör olmadığını bildir
    if (onSelectedAnalyzerChange) {
      onSelectedAnalyzerChange(null);
    }
    
    // Helper function to reset transition flag
    const resetTransitionFlag = () => {
      isTransitioningRef.current = false;
    };
    
    // Update state immediately for instant response
    setSelectedAnalyzerId(null);
    setSelectedTrendLog(null);
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

  const handleBackToLogs = () => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;
    
    // App.tsx'e log entry title'ı temizle
    if (onLogEntryTitleChange) {
      onLogEntryTitleChange(null);
    }
    
    // Helper function to reset transition flag
    const resetTransitionFlag = () => {
      isTransitioningRef.current = false;
    };
    
    // Update state immediately for instant response
    setSelectedTrendLog(null);
    setViewMode('logs');
    
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

  const handleLogSelect = (trendLog: TrendLogData) => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;
    
    // Helper function to reset transition flag
    const resetTransitionFlag = () => {
      isTransitioningRef.current = false;
    };
    
    // Update state immediately for instant response
    setSelectedTrendLog(trendLog);
    setViewMode('entries');
    
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
      // Animasyonu durdur - Reanimated 3
      breathingAnim.value = withTiming(1, {
        duration: 200,
        easing: Easing.out(Easing.ease),
      });
      setDraggedAnalyzerIndex(undefined);
    }
  }, [draggedAnalyzerIndex, breathingAnim]);
  
  // Analizör bırakıldığında çağrılır
  const handleAnalyzerDrop = useCallback(async (targetIndex: number) => {
    if (draggedAnalyzerIndex === undefined || draggedAnalyzerIndex === targetIndex) {
      // Animasyonu durdur - Reanimated 3
      breathingAnim.value = withTiming(1, {
        duration: 200,
        easing: Easing.out(Easing.ease),
      });
      setDraggedAnalyzerIndex(undefined);
      return;
    }

    // Mevcut görüntülenen sıralamayı al (sortedAnalyzers mantığı ile tamamen aynı)
    const currentSortedAnalyzers: string[] = [];
    
    // Önce kaydedilmiş sıralamaya göre ekle
    analyzerOrder
      .filter(id => groupedLogs.has(id))
      .forEach(id => currentSortedAnalyzers.push(id));
    
    // Sıralama listesinde olmayan analizörleri ekle
    Array.from(groupedLogs.keys()).forEach(id => {
      if (!currentSortedAnalyzers.includes(id)) {
        currentSortedAnalyzers.push(id);
      }
    });

    // Index'lerin geçerli olduğundan emin ol
    if (draggedAnalyzerIndex >= currentSortedAnalyzers.length || targetIndex >= currentSortedAnalyzers.length) {
      console.error('Invalid index in handleAnalyzerDrop', { draggedAnalyzerIndex, targetIndex, length: currentSortedAnalyzers.length });
      // Animasyonu durdur - Reanimated 3
      breathingAnim.value = withTiming(1, {
        duration: 200,
        easing: Easing.out(Easing.ease),
      });
      setDraggedAnalyzerIndex(undefined);
      return;
    }

    // Sürüklenen analizörün yeni konumunu hesaplama
    const newOrder = [...currentSortedAnalyzers];
    const [draggedItem] = newOrder.splice(draggedAnalyzerIndex, 1);
    newOrder.splice(targetIndex, 0, draggedItem);
    
    // Yeni sıralamayı güncelle
    setAnalyzerOrder(newOrder);
    
    // Yeni sıralamayı kalıcı olarak kaydetme
    try {
      await AsyncStorage.setItem('logs_analyzer_order', JSON.stringify(newOrder));
    } catch (error) {
      console.error('Analizör sıralaması kaydedilirken hata:', error);
    }
    
    // Animasyonu durdur - Reanimated 3
    breathingAnim.value = withTiming(1, {
      duration: 200,
      easing: Easing.out(Easing.ease),
    });
    
    // Sürüklemeyi sonlandır
    setDraggedAnalyzerIndex(undefined);
  }, [draggedAnalyzerIndex, analyzerOrder, groupedLogs, breathingAnim]);

  const getAnalyzerStats = (analyzerId: string) => {
    const analyzerLogs = groupedLogs.get(analyzerId) || [];
    const runningCount = analyzerLogs.filter(log => log.status === 'running').length;
    
    return {
      total: analyzerLogs.length,
      running: runningCount
    };
  };

  if (!isConnected) {
    return (
      <View style={[styles.container, styles.centered]}>
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
  if (isLoading && groupedLogs.size === 0 && viewMode === 'analyzers') {
    return (
      <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
        <StatusBar style={isDarkMode ? "light" : "dark"} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={paperTheme.colors.primary} />
          <Text style={[styles.loadingText, { color: paperTheme.colors.onSurface }]}>
            Loading logs...
          </Text>
        </View>
      </View>
    );
  }

  if (viewMode === 'entries' && selectedTrendLog) {
    return (
      <Animated.View style={[{ flex: 1 }, screenStyle]}>
        <LogEntriesScreen
          trendLog={selectedTrendLog}
          onBack={handleBackToLogs}
          onTitleChange={onLogEntryTitleChange}
        />
      </Animated.View>
    );
  }

  if (viewMode === 'logs') {
    const selectedLogs = selectedAnalyzerId ? groupedLogs.get(selectedAnalyzerId) || [] : [];
    const selectedAnalyzerName = selectedLogs.length > 0
      ? selectedLogs[0].analyzerName || `Analyzer ${selectedAnalyzerId}`
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
        <Animated.View
          style={[
            styles.container,
            { backgroundColor: paperTheme.colors.background },
            screenStyle
          ]}
        >
          <StatusBar style={isDarkMode ? "light" : "dark"} />
          <LinearGradient
            colors={isDarkMode 
              ? ['#0D1B2A', '#1B263B', '#415A77'] 
              : ['#E3F2FD', '#BBDEFB', '#90CAF9']}
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <FlatList
          key={`logs-${isLandscape ? 'landscape' : 'portrait'}`}
          data={selectedLogs}
          renderItem={({ item }) => (
            <LogCard 
              log={item}
              onPress={() => handleLogSelect(item)}
            />
          )}
          keyExtractor={(item) => item._id}
          style={styles.list}
          contentContainerStyle={[
            styles.content, 
            { paddingTop: 8 },
            numColumns > 1 ? styles.contentLandscape : undefined,
            selectedLogs.length === 0 && styles.contentEmpty
          ]}
          numColumns={numColumns}
          columnWrapperStyle={numColumns > 1 ? styles.columnWrapper : undefined}
          refreshControl={
            <RefreshControl 
              refreshing={isRefreshing} 
              onRefresh={handleRefresh} 
              colors={[paperTheme.colors.primary]}
              tintColor={paperTheme.colors.primary}
            />
          }
          scrollEnabled={true}
          nestedScrollEnabled={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, {color: paperTheme.colors.onSurfaceVariant}]}>
                No logs found for this analyzer
              </Text>
              <Text style={[styles.emptySubtext, {color: paperTheme.colors.outline}]}>
                Pull down to refresh
              </Text>
            </View>
          }
        />
        </Animated.View>
      </SwipeGestureRecognizer>
    );
  }

  const renderAnalyzerItem = ({ item, index }: { item: [string, TrendLogData[]], index: number }) => {
    const [analyzerId] = item;
    const isBeingDragged = draggedAnalyzerIndex === index;
    const isSelected = draggedAnalyzerIndex === index;
    const canDrop = draggedAnalyzerIndex !== undefined && draggedAnalyzerIndex !== index;
    
    return (
      <AnalyzerItem
        item={item}
        index={index}
        isBeingDragged={isBeingDragged}
        isSelected={isSelected}
        canDrop={canDrop}
        draggedAnalyzerIndex={draggedAnalyzerIndex}
        breathingAnimValue={breathingAnim}
        onLongPress={() => handleAnalyzerLongPress(index)}
        onPress={() => handleAnalyzerPress(index)}
        onSelect={() => handleAnalyzerSelect(analyzerId)}
        onDrop={() => handleAnalyzerDrop(index)}
        getAnalyzerStats={getAnalyzerStats}
        isDarkMode={isDarkMode}
        screenWidth={screenWidth}
        numColumns={numColumns}
      />
    );
  };

  // Default analyzer view
  // Analizörleri kaydedilmiş sıralamaya göre düzenle
  const sortedAnalyzers = analyzerOrder
    .filter(id => groupedLogs.has(id))
    .map(id => [id, groupedLogs.get(id)!] as [string, TrendLogData[]]);
  
  // Sıralama listesinde olmayan analizörleri ekle
  Array.from(groupedLogs.keys()).forEach(id => {
    if (!analyzerOrder.includes(id)) {
      sortedAnalyzers.push([id, groupedLogs.get(id)!]);
    }
  });
  
  return (
    <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      <LinearGradient
        colors={isDarkMode 
          ? ['#0D1B2A', '#1B263B', '#415A77'] 
          : ['#E3F2FD', '#BBDEFB', '#90CAF9']}
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
        extraData={draggedAnalyzerIndex}
        style={styles.list}
        contentContainerStyle={[
          styles.content,
          numColumns > 1 ? styles.contentLandscape : undefined,
          sortedAnalyzers.length === 0 && styles.contentEmpty
        ]}
        numColumns={numColumns}
        columnWrapperStyle={numColumns > 1 ? styles.columnWrapper : undefined}
        refreshControl={
          <RefreshControl 
            refreshing={isRefreshing} 
            onRefresh={handleRefresh} 
            colors={[paperTheme.colors.primary]}
            tintColor={paperTheme.colors.primary}
          />
        }
        scrollEnabled={true}
        nestedScrollEnabled={false}
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
  container: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
    flexGrow: 1,
  },
  contentLandscape: {
    paddingHorizontal: 12,
  },
  contentEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  columnWrapper: {
    justifyContent: 'flex-start',
    paddingHorizontal: 0,
    gap: 12,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  cardWrapper: {
    marginVertical: 4,
    marginHorizontal: 0,
    flex: 1,
    minWidth: 0,
  },
  analyzerCard: {
    elevation: 3,
    marginBottom: 12,
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
    backgroundColor: '#4CAF50',
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
    backgroundColor: 'rgba(76, 175, 80, 0.25)',
    borderColor: 'rgba(76, 175, 80, 0.5)',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: 'white',
    marginBottom: 2,
  },
  liveStatValue: {
    color: '#dfe4e0ff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    fontWeight: '600',
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
  beingDragged: {
    opacity: 0.85,
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
});