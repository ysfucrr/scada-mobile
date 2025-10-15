import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { Card, IconButton, useTheme as usePaperTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import GradientCard from '../components/GradientCard';
import WriteRegisterModal from '../components/WriteRegisterModal';
import { useConnection } from '../context/ConnectionContext';
import { useTheme as useAppTheme } from '../context/ThemeContext';
import { useWebSocket } from '../context/WebSocketContext';
import ApiService, { RegisterData } from '../services/ApiService';

interface RegistersScreenProps {
  isActive?: boolean;
}

export default function RegistersScreen({ isActive = true }: RegistersScreenProps) {
  const paperTheme = usePaperTheme();
  const { isDarkMode } = useAppTheme();
  const { isConnected } = useConnection();
  const {
    isConnected: wsConnected,
    connect: wsConnect,
    watchRegister,
    unwatchRegister,
    registerValues
  } = useWebSocket();
  
  const [registers, setRegisters] = useState<RegisterData[]>([]);
  const [groupedRegisters, setGroupedRegisters] = useState<Map<string, RegisterData[]>>(new Map());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [realTimeValues, setRealTimeValues] = useState<Map<string, any>>(new Map());
  const [writeModalVisible, setWriteModalVisible] = useState(false);
  const [selectedRegister, setSelectedRegister] = useState<RegisterData | null>(null);
  const [selectedAnalyzerId, setSelectedAnalyzerId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'analyzers' | 'registers'>('analyzers');
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

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

  const handleWriteRegister = (register: RegisterData) => {
    setSelectedRegister(register);
    setWriteModalVisible(true);
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
      // Analizör seçildiğinde eski gerçek zamanlı değerleri temizle
      setRealTimeValues(new Map());
      setSelectedAnalyzerId(analyzerId);
      setViewMode('registers');
      
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
      // Analizörler ekranına döndüğünde gerçek zamanlı değerleri temizle
      setRealTimeValues(new Map());
      setSelectedAnalyzerId(null);
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

  const renderAnalyzerItem = ({ item }: { item: [string, RegisterData[]] }) => {
    const [analyzerId, analyzerRegisters] = item;
    const firstRegister = analyzerRegisters[0];
    const stats = getAnalyzerStats(analyzerId);
    
    return (
      <View style={styles.cardWrapper}>
        <GradientCard
          colors={['#1E88E5', '#42A5F5']}
          style={styles.analyzerCard}
          mode="elevated"
          onPress={() => handleAnalyzerSelect(analyzerId)}
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
              <View style={styles.statsContainer}>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>
                    {stats.total}
                  </Text>
                  <Text style={styles.statLabel}>
                    Total Registers
                  </Text>
                </View>
                
                <View style={[styles.statCard, stats.live > 0 && styles.liveStatCard]}>
                  <Text style={[styles.statValue, stats.live > 0 && styles.liveStatValue]}>
                    {stats.live}
                  </Text>
                  <Text style={styles.statLabel}>
                    Live Updates
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
    );
  };

  const renderRegisterItem = ({ item }: { item: RegisterData }) => {
    const realTimeValue = realTimeValues.get(item._id);
    const displayValue = realTimeValue !== undefined ? realTimeValue : (item.value || 'N/A');
    const isRealTime = realTimeValue !== undefined;
    const isWritable = item.registerType !== 'read';
    
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'active':
          return paperTheme.colors.tertiary;
        case 'inactive':
          return paperTheme.colors.outline;
        case 'error':
          return paperTheme.colors.error;
        default:
          return paperTheme.colors.outline;
      }
    };
    
    const statusColor = getStatusColor(item.status || 'inactive');
    
    return (
      <View style={styles.cardWrapper}>
        <Card
          style={styles.registerCard}
          mode="elevated"
          onLongPress={isWritable ? () => handleWriteRegister(item) : undefined}
        >
          <Card.Content>
            {/* Header */}
            <View style={styles.registerHeader}>
              <View style={styles.registerHeaderLeft}>
                <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
                <Text style={[styles.registerAddress, {color: paperTheme.colors.onSurfaceVariant}]}>
                  Address: {item.address}
                </Text>
              </View>
              
              <View style={styles.registerBadges}>
                {isRealTime && (
                  <View style={styles.liveBadgeSmall}>
                    <View style={styles.pulseIndicatorSmall} />
                    <Text style={styles.liveTextSmall}>LIVE</Text>
                  </View>
                )}
              </View>
            </View>
            
            {/* Value Display */}
            <View style={[styles.registerValueContainer, { backgroundColor: paperTheme.colors.surfaceVariant }]}>
              <View style={styles.valueContent}>
                <Text style={styles.registerName}>
                  {item.name}
                </Text>
                <View style={styles.valueRow}>
                  <Text
                    style={[
                      styles.registerValue,
                      {color: isRealTime ? '#F44336' : paperTheme.colors.onSurface}
                    ]}
                  >
                    {displayValue}
                  </Text>
                  {/* Type Badge */}
                  <View style={styles.typeBadge}>
                    <MaterialCommunityIcons
                      name={item.dataType === 'bit' ? 'toggle-switch' : 'numeric'}
                      size={14}
                      color={paperTheme.colors.onSurfaceVariant}
                    />
                    <Text style={[styles.typeText, {color: paperTheme.colors.onSurfaceVariant}]}>
                      {item.dataType}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
            
            {/* Footer */}
            <View style={styles.registerFooter}>
              <Text style={[styles.lastUpdate, {color: paperTheme.colors.onSurfaceVariant}]}>
                {item.timestamp ? `Updated: ${new Date(item.timestamp).toLocaleTimeString()}` : 'Never updated'}
              </Text>
              
              {isWritable ? (
                <IconButton
                  icon="pencil"
                  iconColor={paperTheme.colors.primary}
                  size={20}
                  onPress={() => handleWriteRegister(item)}
                  style={styles.writeButton}
                />
              ) : (
                <MaterialCommunityIcons
                  name="lock"
                  size={16}
                  color={paperTheme.colors.onSurfaceVariant}
                />
              )}
            </View>
          </Card.Content>
        </Card>
      </View>
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

  if (viewMode === 'analyzers') {
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
          data={Array.from(groupedRegisters.entries())}
          renderItem={renderAnalyzerItem}
          keyExtractor={(item) => item[0]}
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
                {isLoading ? 'Loading...' : 'Pull down to refresh'}
              </Text>
            </View>
          }
          />
        </Animated.View>
      </View>
    );
  }

  // Register view mode
  const selectedRegisters = selectedAnalyzerId ? groupedRegisters.get(selectedAnalyzerId) || [] : [];
  const selectedAnalyzerName = selectedRegisters.length > 0 
    ? selectedRegisters[0].analyzerName || `Analyzer ${selectedAnalyzerId}`
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
                {selectedRegisters.length} registers • {selectedRegisters[0]?.buildingName || 'Unknown Building'}
              </Text>
            </View>
            
            <View style={styles.headerActions}>
              <View style={[styles.liveIndicatorHeader, { backgroundColor: 'rgba(244, 67, 54, 0.9)' }]}>
                <View style={styles.liveDot} />
                <Text style={styles.liveTextHeader}>
                  {selectedRegisters.filter(reg => realTimeValues.has(reg._id)).length} LIVE
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
      
      <FlatList
        data={selectedRegisters}
        renderItem={renderRegisterItem}
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  cardWrapper: {
    marginVertical: 4,
    marginHorizontal: 0,
  },
  valueWrapper: {
    marginVertical: 4,
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
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
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
    marginBottom: 12,
    borderRadius: 10,
    elevation: 2,
  },
  registerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  registerHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  registerAddress: {
    fontSize: 12,
    fontWeight: '600',
  },
  registerBadges: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveBadgeSmall: {
    backgroundColor: '#F44336',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
  },
  pulseIndicatorSmall: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'white',
    marginRight: 3,
  },
  liveTextSmall: {
    fontSize: 9,
    fontWeight: '700',
    color: 'white',
  },
  registerValueContainer: {
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  valueContent: {
    flex: 1,
  },
  registerName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    color: 'rgba(0,0,0,0.7)',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  registerValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  registerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  lastUpdate: {
    fontSize: 11,
  },
  writeButton: {
    margin: -6,
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