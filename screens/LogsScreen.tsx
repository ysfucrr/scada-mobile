import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Alert,
  Animated,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ToastAndroid,
  Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, useTheme as usePaperTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

// Components
import GradientCard from '../components/GradientCard';
import LogCard from '../components/LogCard';

// Contexts
import { useConnection } from '../context/ConnectionContext';
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

export default function LogsScreen() {
  const { isConnected } = useConnection();
  const { isDarkMode } = useAppTheme();
  const paperTheme = usePaperTheme();
  
  const [trendLogs, setTrendLogs] = useState<TrendLogData[]>([]);
  const [groupedLogs, setGroupedLogs] = useState<Map<string, TrendLogData[]>>(new Map());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAnalyzerId, setSelectedAnalyzerId] = useState<string | null>(null);
  const [selectedTrendLog, setSelectedTrendLog] = useState<TrendLogData | null>(null);
  const [viewMode, setViewMode] = useState<'analyzers' | 'logs' | 'entries'>('analyzers');
  const [draggedAnalyzerIndex, setDraggedAnalyzerIndex] = useState<number | undefined>(undefined);
  const [analyzerOrder, setAnalyzerOrder] = useState<string[]>([]);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isConnected) {
      loadTrendLogs();
    } else {
      setTrendLogs([]);
      setIsLoading(false);
    }
  }, [isConnected]);
  
  // Kullanıcıya analizörleri sürükleme özelliğini bildirmek için
  useEffect(() => {
    if (analyzerOrder.length > 1 && viewMode === 'analyzers' && !isLoading) {
      // Yalnızca birden fazla analizör olduğunda bildirim göster
      showDragInfo();
    }
  }, [analyzerOrder.length, viewMode, isLoading]);

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
    // Animate transition
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
    ]).start(() => {
      setSelectedAnalyzerId(analyzerId);
      setViewMode('logs');
      
      // Animate in
      Animated.timing(slideAnim, {
        toValue: 50,
        duration: 0,
        useNativeDriver: true,
      }).start(() => {
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
    });
  };

  const handleBackToAnalyzers = () => {
    // Animate transition
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 50,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setSelectedAnalyzerId(null);
      setSelectedTrendLog(null);
      setViewMode('analyzers');
      
      // Animate in
      Animated.timing(slideAnim, {
        toValue: -50,
        duration: 0,
        useNativeDriver: true,
      }).start(() => {
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
    });
  };

  const handleBackToLogs = () => {
    // Animate transition
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 50,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setSelectedTrendLog(null);
      setViewMode('logs');
      
      // Animate in
      Animated.timing(slideAnim, {
        toValue: -50,
        duration: 0,
        useNativeDriver: true,
      }).start(() => {
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
    });
  };

  const handleLogSelect = (trendLog: TrendLogData) => {
    // Animate transition
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
    ]).start(() => {
      setSelectedTrendLog(trendLog);
      setViewMode('entries');
      
      // Animate in
      Animated.timing(slideAnim, {
        toValue: 50,
        duration: 0,
        useNativeDriver: true,
      }).start(() => {
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
    
    // Sürüklemeyi sonlandır
    setDraggedAnalyzerIndex(undefined);
  }, [draggedAnalyzerIndex, analyzerOrder, groupedLogs]);

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
      <Animated.View
        style={{
          flex: 1,
          opacity: fadeAnim,
          transform: [{ translateX: slideAnim }],
        }}
      >
        <LogEntriesScreen
          trendLog={selectedTrendLog}
          onBack={handleBackToLogs}
        />
      </Animated.View>
    );
  }

  if (viewMode === 'logs') {
    const selectedLogs = selectedAnalyzerId ? groupedLogs.get(selectedAnalyzerId) || [] : [];
    const selectedAnalyzerName = selectedLogs.length > 0
      ? selectedLogs[0].analyzerName || `Analyzer ${selectedAnalyzerId}`
      : 'Unknown Analyzer';

    return (
      <Animated.View
        style={[
          styles.container,
          {
            backgroundColor: paperTheme.colors.background,
            opacity: fadeAnim,
            transform: [{ translateX: slideAnim }],
          }
        ]}
      >
        <StatusBar style={isDarkMode ? "light" : "dark"} />
        
        {/* Modern Floating Header */}
        <View style={[styles.modernHeader, { backgroundColor: 'rgba(33, 150, 243, 0.15)', height: 'auto' }]}>
          <SafeAreaView edges={['top']} style={{ paddingTop: -48 }}>
            <TouchableOpacity
              style={[styles.headerContent, { paddingTop: 1, paddingBottom: 4 }]}
              onPress={handleBackToAnalyzers}
              activeOpacity={0.8}
            >
              <View style={[styles.backButton, { backgroundColor: paperTheme.colors.primary }]}>
                <MaterialCommunityIcons
                  name="arrow-left"
                  size={24}
                  color="white"
                />
              </View>
              
              <View style={styles.headerTextContainer}>
                <Text style={[styles.headerTitle, { color: paperTheme.colors.primary }]}>
                  {selectedAnalyzerName}
                </Text>
                <Text style={[styles.headerSubtitle, { color: paperTheme.colors.onSurfaceVariant }]}>
                  {selectedLogs.length} logs • {selectedLogs[0]?.buildingName || 'Unknown Building'}
                </Text>
              </View>
              
              <View style={styles.headerActions}>
                <View style={[styles.liveIndicatorHeader, { backgroundColor: 'rgba(76, 175, 80, 0.9)' }]}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveTextHeader}>
                    {selectedLogs.filter(log => log.status === 'running').length} RUNNING
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </SafeAreaView>
        </View>
        
        <FlatList
          data={selectedLogs}
          renderItem={({ item }) => (
            <LogCard 
              log={item}
              onPress={() => handleLogSelect(item)}
            />
          )}
          keyExtractor={(item) => item._id}
          contentContainerStyle={[styles.content, { paddingTop: 8 }]}
          refreshControl={
            <RefreshControl 
              refreshing={isRefreshing} 
              onRefresh={handleRefresh} 
              colors={[paperTheme.colors.primary]} 
            />
          }
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
    );
  }

  const renderAnalyzerItem = ({ item, index }: { item: [string, TrendLogData[]], index: number }) => {
    const [analyzerId, analyzerLogs] = item;
    const firstLog = analyzerLogs[0];
    const stats = getAnalyzerStats(analyzerId);
    const isBeingDragged = draggedAnalyzerIndex === index;
    const isSelected = draggedAnalyzerIndex === index;
    const canDrop = draggedAnalyzerIndex !== undefined && draggedAnalyzerIndex !== index;
    const gradientColors = isDarkMode ? ['#263238', '#37474F'] as const : ['#1E88E5', '#42A5F5'] as const;
    
    return (
      <TouchableOpacity
        onLongPress={() => handleAnalyzerLongPress(index)}
        onPress={() => {
          // Eğer bu analizör seçiliyse, seçimi kaldır
          if (isSelected) {
            handleAnalyzerPress(index);
          } 
          // Eğer başka bir analizör seçiliyse ve bu analizöre drop yapılabilirse, drop yap
          else if (canDrop) {
            handleAnalyzerDrop(index);
          }
          // Normal tıklama - analizörü seç
          else {
            handleAnalyzerSelect(analyzerId);
          }
        }}
        activeOpacity={0.9}
        delayLongPress={300}
      >
        <View style={styles.cardWrapper}>
          <GradientCard
            colors={gradientColors}
            style={{
              ...styles.analyzerCard,
              ...(isBeingDragged ? styles.beingDragged : {}),
              ...(canDrop ? styles.dropTarget : {})
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
              <View style={styles.statsContainer}>
                <View style={styles.statCard}>
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
      </View>
    </TouchableOpacity>
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
      
      <Animated.View
        style={{
          flex: 1,
          opacity: fadeAnim,
          transform: [{ translateX: slideAnim }],
        }}
      >
        <FlatList
        data={sortedAnalyzers}
        renderItem={renderAnalyzerItem}
        keyExtractor={(item) => item[0]}
        extraData={draggedAnalyzerIndex}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl 
            refreshing={isRefreshing} 
            onRefresh={handleRefresh} 
            colors={[paperTheme.colors.primary]}
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
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  cardWrapper: {
    marginVertical: 4,
    marginHorizontal: 0,
  },
  analyzerCard: {
    elevation: 3,
    marginBottom: 12,
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
  statCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    minWidth: 320,
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
    transform: [{ scale: 1.05 }],
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