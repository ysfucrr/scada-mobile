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
  const [draggedAnalyzerIndex, setDraggedAnalyzerIndex] = useState<number | undefined>(undefined);
  const [analyzerOrder, setAnalyzerOrder] = useState<string[]>([]);
  const [draggedRegisterIndex, setDraggedRegisterIndex] = useState<number | undefined>(undefined);
  const [registerOrder, setRegisterOrder] = useState<string[]>([]);
  
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
  
  // Kullanıcıya analizörleri sürükleme özelliğini bildirmek için
  useEffect(() => {
    if (analyzerOrder.length > 1 && viewMode === 'analyzers' && !isLoading) {
      // Yalnızca birden fazla analizör olduğunda bildirim göster
      showDragInfo();
    }
  }, [analyzerOrder.length, viewMode, isLoading]);

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

  const handleWriteRegister = (register: RegisterData) => {
    setSelectedRegister(register);
    setWriteModalVisible(true);
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

  const renderAnalyzerItem = ({ item, index }: { item: [string, RegisterData[]], index: number }) => {
    const [analyzerId, analyzerRegisters] = item;
    const firstRegister = analyzerRegisters[0];
    const stats = getAnalyzerStats(analyzerId);
    const isBeingDragged = draggedAnalyzerIndex === index;
    
    return (
      <TouchableOpacity
        onLongPress={() => handleAnalyzerLongPress(index)}
        onPress={draggedAnalyzerIndex !== undefined && draggedAnalyzerIndex !== index
          ? () => handleAnalyzerDrop(index)
          : () => handleAnalyzerSelect(analyzerId)
        }
        activeOpacity={0.9}
        delayLongPress={300}
      >
        <View style={styles.cardWrapper}>
          <GradientCard
            colors={['#1E88E5', '#42A5F5']}
            style={{
              ...styles.analyzerCard,
              ...(isBeingDragged ? styles.beingDragged : {}),
              ...(draggedAnalyzerIndex !== undefined && draggedAnalyzerIndex !== index ? styles.dropTarget : {})
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
              <View style={styles.statsContainer}>
                <View style={styles.statCard}>
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
    );
  };

  const renderRegisterItem = ({ item, index }: { item: RegisterData, index: number }) => {
    const realTimeValue = realTimeValues.get(item._id);
    const displayValue = realTimeValue !== undefined ? realTimeValue : (item.value || 'N/A');
    const isRealTime = realTimeValue !== undefined;
    const isWritable = item.registerType !== 'read';
    const isBeingDragged = draggedRegisterIndex === index;
    const canDrop = draggedRegisterIndex !== undefined && draggedRegisterIndex !== index;
    
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
    
    return (
      <TouchableOpacity
        onLongPress={() => handleRegisterLongPress(index)}
        onPress={canDrop ? () => handleRegisterDrop(index) : undefined}
        activeOpacity={0.9}
        delayLongPress={300}
      >
        <View style={[styles.cardWrapper, isBeingDragged && styles.beingDragged, canDrop && styles.dropTarget]}>
          <Card
            style={styles.registerCard}
            mode="elevated"
          >
          <Card.Content>
            {/* Modern Header */}
            <View style={styles.registerHeader}>
              <View style={styles.registerHeaderLeft}>
                <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
                <Text style={[styles.registerName, {color: paperTheme.colors.onSurface}]}>
                  {item.name}
                </Text>
              </View>
              
              <View style={styles.registerBadges}>
                {/* Type Badge */}
                <View style={[styles.typeBadge, { backgroundColor: paperTheme.colors.surfaceVariant }]}>
                  <Text style={[styles.typeText, {color: paperTheme.colors.primary}]}>
                    {item.dataType?.toUpperCase()}
                  </Text>
                </View>
                
                {isRealTime && (
                  <View style={styles.liveBadgeSmall}>
                    <View style={styles.pulseIndicatorSmall} />
                    <Text style={styles.liveTextSmall}>LIVE</Text>
                  </View>
                )}
              </View>
            </View>
            
            {/* Value Display - Modern */}
            <View style={[styles.registerValueContainer, { 
              backgroundColor: isRealTime ? 'rgba(244, 67, 54, 0.08)' : paperTheme.colors.surfaceVariant 
            }]}>
              <Text
                style={[
                  styles.registerValue,
                  {
                    color: isRealTime ? '#F44336' : paperTheme.colors.onSurface,
                    fontSize: typeof displayValue === 'number' && displayValue.toString().length > 8 ? 20 : 28
                  }
                ]}
              >
                {displayValue}
              </Text>
              {item.unit && (
                <Text style={[styles.unitText, {color: paperTheme.colors.onSurfaceVariant}]}>
                  {item.unit}
                </Text>
              )}
            </View>
            
            {/* Footer */}
            <View style={styles.registerFooter}>
              <View style={styles.footerLeft}>
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={12}
                  color={paperTheme.colors.onSurfaceVariant}
                  style={styles.clockIcon}
                />
                <Text style={[styles.lastUpdate, {color: paperTheme.colors.onSurfaceVariant}]}>
                  {item.timestamp ? new Date(item.timestamp).toLocaleTimeString('tr-TR', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  }) : 'Never updated'}
                </Text>
              </View>
              
              {isWritable ? (
                <TouchableOpacity
                  onPress={() => handleWriteRegister(item)}
                  style={[
                    styles.writeButtonContainer,
                    { backgroundColor: paperTheme.colors.primaryContainer || 'rgba(33, 150, 243, 0.1)' }
                  ]}
                >
                  <MaterialCommunityIcons
                    name="pencil"
                    size={18}
                    color={paperTheme.colors.primary}
                  />
                </TouchableOpacity>
              ) : (
                <MaterialCommunityIcons
                  name="lock-outline"
                  size={16}
                  color={paperTheme.colors.onSurfaceVariant}
                />
              )}
            </View>
          </Card.Content>
        </Card>
      </View>
      </TouchableOpacity>
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
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  registerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  registerHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
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
  registerValueContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'flex-start',
    minHeight: 80,
    justifyContent: 'center',
  },
  registerName: {
    fontSize: 15,
    fontWeight: '700',
    color: 'rgba(0,0,0,0.87)',
    flex: 1,
  },
  registerValue: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  unitText: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  registerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.08)',
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