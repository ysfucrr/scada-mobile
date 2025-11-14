import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
  ToastAndroid
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { ActivityIndicator, useTheme as usePaperTheme } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import GradientCard from '../components/GradientCard';
import { useConnection } from '../context/ConnectionContext';
import { useOrientation } from '../context/OrientationContext';
import { useTheme as useAppTheme } from '../context/ThemeContext';
import { useWebSocket } from '../context/WebSocketContext';
import ApiService from '../services/ApiService';

interface BillingTrendLog {
  id: string;
  analyzerId: string;
  registerId: string;
  analyzerName: string;
  firstValue: number;
  currentValue?: number;
}

interface BillingType {
  _id: string;
  name: string;
  price: number;
  currency: string;
  trendLogs: BillingTrendLog[];
  startTime: string;
  createdAt: string;
  updatedAt?: string;
}

// Billing Item Component - Separate component to use hooks properly
const BillingItem = React.memo(({ 
  billing, 
  index, 
  isExpanded, 
  isBeingDragged, 
  isSelected, 
  canDrop,
  registerValues,
  breathingAnimValue,
  onLongPress,
  onPress,
  formatCurrency,
  convertToUnit,
  getDaysDifference,
  billingCardWidth,
  numColumns,
  isDarkMode
}: {
  billing: BillingType;
  index: number;
  isExpanded: boolean;
  isBeingDragged: boolean;
  isSelected: boolean;
  canDrop: boolean;
  registerValues: Map<string, number>;
  breathingAnimValue: ReturnType<typeof useSharedValue<number>>;
  onLongPress: () => void;
  onPress: () => void;
  formatCurrency: (amount: number, currency: string) => string;
  convertToUnit: (value: number | undefined) => string;
  getDaysDifference: (startTime: string) => number;
  billingCardWidth?: number;
  numColumns: number;
  isDarkMode: boolean;
}) => {
  // No animation - instant expand/collapse
  // Calculate totals
  let totalUsed = 0;
  let totalCost = 0;
  
  billing.trendLogs.forEach(trendLog => {
    const currentValue = registerValues.get(trendLog.registerId) || trendLog.currentValue || trendLog.firstValue;
    const used = Math.max(0, currentValue - trendLog.firstValue);
    totalUsed += used;
    totalCost += used * billing.price;
  });

  // Get gradient colors based on index
  const gradientColors = isDarkMode 
    ? [
        ['#1A237E', '#283593', '#3949AB'],
        ['#004D40', '#00695C', '#00796B'],
        ['#5D4037', '#6D4C41', '#795548'],
        ['#BF360C', '#D84315', '#E64A19'],
      ][index % 4] as [string, string, ...string[]]
    : [
        ['#1E88E5', '#42A5F5', '#64B5F6'],
        ['#00ACC1', '#26C6DA', '#4DD0E1'],
        ['#7B1FA2', '#9C27B0', '#BA68C8'],
        ['#F57C00', '#FF9800', '#FFB74D'],
      ][index % 4] as [string, string, ...string[]];
  
  // No expand animation - instant show/hide
  
  // Animated style for breathing animation - Reanimated 3
  const breathingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: isBeingDragged ? (breathingAnimValue.value as number) : 1 }],
  }), [isBeingDragged, breathingAnimValue]);

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
        styles.billingCardWrapper,
        billingCardWidth ? { width: billingCardWidth } : undefined,
        numColumns > 1 ? { marginBottom: 0 } : undefined
      ]}
    >
      <TouchableOpacity
        onLongPress={onLongPress}
        onPress={onPress}
        activeOpacity={1}
        delayLongPress={300}
      >
      <Animated.View style={[
        isBeingDragged ? styles.beingDragged : undefined,
        canDrop ? styles.dropTarget : undefined,
        breathingStyle,
      ]}>
      <GradientCard
        colors={gradientColors}
        style={styles.billingCard}
        mode="elevated"
      >
        <BlurView
          intensity={isDarkMode ? 30 : 20}
          tint={isDarkMode ? "dark" : "light"}
          style={styles.blurContainer}
        >
          {/* Header */}
          <View style={styles.billingHeader}>
            <View style={styles.headerLeft}>
              <View style={[styles.iconContainer, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
                <MaterialCommunityIcons
                  name="file-document-outline"
                  size={24}
                  color="#FFFFFF"
                />
              </View>
              <View style={styles.headerTextContainer}>
                <Text style={styles.billingName}>{billing.name}</Text>
                <View style={styles.priceBadge}>
                  <MaterialCommunityIcons
                    name="currency-usd"
                    size={14}
                    color="#FFFFFF"
                    style={{ marginRight: 4 }}
                  />
                  <Text style={styles.priceText}>
                    {formatCurrency(billing.price, billing.currency)}/kWh
                  </Text>
                </View>
              </View>
            </View>
            <View style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }}>
              <MaterialCommunityIcons
                name="chevron-down"
                size={28}
                color="#FFFFFF"
              />
            </View>
          </View>

          {/* Expanded Content */}
          {isExpanded && (
          <View
            style={styles.expandedContent}
          >
            <View style={styles.contentInner}>
              {/* Summary Cards */}
              <View style={styles.summaryCards}>
                <View style={[styles.summaryCard, { backgroundColor: 'rgba(255, 255, 255, 0.15)' }]}>
                  <MaterialCommunityIcons
                    name="calendar-clock"
                    size={18}
                    color="#FFFFFF"
                  />
                  <Text style={styles.summaryCardLabel}>Days</Text>
                  <Text style={styles.summaryCardValue}>
                    {getDaysDifference(billing.startTime)}
                  </Text>
                </View>
                <View style={[styles.summaryCard, { backgroundColor: 'rgba(255, 255, 255, 0.15)' }]}>
                  <MaterialCommunityIcons
                    name="flash"
                    size={18}
                    color="#FFFFFF"
                  />
                  <Text style={styles.summaryCardLabel}>Used</Text>
                  <Text style={styles.summaryCardValue}>
                    {convertToUnit(totalUsed)}
                  </Text>
                </View>
                <View style={[styles.summaryCard, { backgroundColor: 'rgba(255, 255, 255, 0.25)' }]}>
                  <MaterialCommunityIcons
                    name="cash-multiple"
                    size={18}
                    color="#FFFFFF"
                  />
                  <Text style={styles.summaryCardLabel}>Total Cost</Text>
                  <Text style={[styles.summaryCardValue, styles.totalCostValue]}>
                    {formatCurrency(totalCost, billing.currency)}
                  </Text>
                </View>
              </View>

              {/* Trend Logs */}
              <View style={styles.trendLogsContainer}>
                <Text style={styles.trendLogsTitle}>
                  <MaterialCommunityIcons name="chart-line" size={18} color="#FFFFFF" /> Energy Meters
                </Text>
                {billing.trendLogs.map((trendLog, idx) => {
                  const currentValue = registerValues.get(trendLog.registerId) || trendLog.currentValue || trendLog.firstValue;
                  const used = Math.max(0, currentValue - trendLog.firstValue);
                  const cost = used * billing.price;

                  return (
                    <View
                      key={`${billing._id}-${trendLog.id}-${idx}`}
                      style={[styles.trendLogCard, { backgroundColor: 'rgba(255, 255, 255, 0.1)' }]}
                    >
                      <View style={styles.trendLogHeader}>
                        <View style={styles.trendLogIconContainer}>
                          <MaterialCommunityIcons
                            name="gauge"
                            size={18}
                            color="#FFFFFF"
                          />
                        </View>
                        <Text style={styles.trendLogName}>{trendLog.analyzerName}</Text>
                      </View>
                      
                      <View style={styles.trendLogMetrics}>
                        <View style={styles.metricRow}>
                          <View style={styles.metricItem}>
                            <Text style={styles.metricLabel}>First</Text>
                            <Text style={styles.metricValue}>
                              {convertToUnit(trendLog.firstValue)}
                            </Text>
                          </View>
                          <View style={styles.metricItem}>
                            <Text style={styles.metricLabel}>Current</Text>
                            <Text style={styles.metricValue}>
                              {convertToUnit(currentValue)}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.metricRow}>
                          <View style={styles.metricItem}>
                            <Text style={styles.metricLabel}>Used</Text>
                            <Text style={[styles.metricValue, styles.usedValue]}>
                              {convertToUnit(used)}
                            </Text>
                          </View>
                          <View style={[styles.metricItem, styles.costItem]}>
                            <Text style={styles.metricLabel}>Cost</Text>
                            <Text style={[styles.metricValue, styles.costValue]}>
                              {formatCurrency(cost, billing.currency)}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* Footer Info */}
              <View style={styles.footerInfo}>
                <View style={styles.footerItem}>
                  <MaterialCommunityIcons
                    name="calendar-start"
                    size={16}
                    color="rgba(255, 255, 255, 0.8)"
                  />
                  <Text style={styles.footerText}>
                    Started: {new Date(billing.startTime).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            </View>
          </View>
          )}
        </BlurView>
      </GradientCard>
      </Animated.View>
      </TouchableOpacity>
    </MotiView>
  );
});

export default function BillingScreen() {
  const paperTheme = usePaperTheme();
  const { isDarkMode } = useAppTheme();
  const { isConnected } = useConnection();
  const { isConnected: wsConnected, connect: wsConnect, watchRegister, unwatchRegister } = useWebSocket();
  const { isLandscape, screenWidth, numColumns } = useOrientation();
  
  const [billings, setBillings] = useState<BillingType[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedBilling, setExpandedBilling] = useState<Set<string>>(new Set());
  const [registerValues, setRegisterValues] = useState<Map<string, number>>(new Map());
  const [draggedBillingIndex, setDraggedBillingIndex] = useState<number | undefined>(undefined);
  const [billingOrder, setBillingOrder] = useState<string[]>([]);
  
  // Animation values - Reanimated 3
  const fadeAnim = useSharedValue(0);
  const slideAnim = useSharedValue(50);
  const breathingAnim = useSharedValue(1);

  // Animated styles for screen transitions - Reanimated 3 (must be called before any early returns)
  const screenStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [{ translateY: slideAnim.value }],
  }));

  useEffect(() => {
    // Fast entry animation - Reanimated 3
    fadeAnim.value = withTiming(1, { duration: 150, easing: Easing.out(Easing.ease) });
    slideAnim.value = withTiming(0, { duration: 150, easing: Easing.out(Easing.ease) });

    if (isConnected) {
      loadBillings();
      if (!wsConnected) {
        wsConnect().catch(console.error);
      }
    } else {
      setBillings([]);
      setIsLoading(false);
    }
  }, [isConnected, wsConnected]);

  // Watch registers for live data when billing is expanded
  useEffect(() => {
    const activeSubscriptions = new Map<string, any>();
    const activeCallbacks = new Map<string, (value: any) => void>();
    
    if (wsConnected && expandedBilling.size > 0) {
      // Get all registers to find register details
      ApiService.getRegisters().then(registers => {
        // Process all expanded billings
        expandedBilling.forEach(billingId => {
          const billing = billings.find(b => b._id === billingId);
          
          if (billing) {
            billing.trendLogs.forEach(trendLog => {
              // Skip if already subscribed
              if (activeSubscriptions.has(trendLog.registerId)) {
                return;
              }
              
              // Find register by registerId
              const register = registers.find(r => r._id === trendLog.registerId);
              
              if (register) {
                // Create register subscription
                const registerSubscription = {
                  analyzerId: register.analyzerId,
                  address: register.address,
                  dataType: register.dataType,
                  scale: register.scale,
                  byteOrder: register.byteOrder,
                  bit: register.bit,
                  registerId: register._id
                };
                
                // Create callback for this register
                const callback = (value: any) => {
                  setRegisterValues(prev => {
                    const newMap = new Map(prev);
                    newMap.set(trendLog.registerId, value);
                    return newMap;
                  });
                };
                
                // Watch the register
                watchRegister(registerSubscription, callback);
                
                // Store subscription info and callback for cleanup
                activeSubscriptions.set(trendLog.registerId, registerSubscription);
                activeCallbacks.set(trendLog.registerId, callback);
              }
            });
          }
        });
      });
    }
    
    return () => {
      // Cleanup subscriptions
      activeSubscriptions.forEach((subscription, registerId) => {
        const callback = activeCallbacks.get(registerId);
        if (callback) {
          unwatchRegister(subscription, callback);
        }
      });
    };
  }, [wsConnected, expandedBilling, billings, watchRegister, unwatchRegister]);

  // Nefes alma animasyonu - billing seçildiğinde başlat - Reanimated 3
  useEffect(() => {
    if (draggedBillingIndex !== undefined) {
      breathingAnim.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    } else {
      breathingAnim.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.ease) });
    }
  }, [draggedBillingIndex]);

  const loadBillings = async () => {
    try {
      setIsLoading(true);
      const data = await ApiService.getBillings();
      
      // Initialize expand animations for each billing - Reanimated 3
      // Note: useSharedValue must be called at component level, not in loops
      // We'll initialize them lazily in renderBillingItem
      
      // Kaydedilmiş billing sıralamasını kontrol et
      try {
        const savedOrder = await AsyncStorage.getItem('billing_order');
        if (savedOrder) {
          const orderIds = JSON.parse(savedOrder);
          setBillingOrder(orderIds);
          
          // Sıralamaya göre billing'leri düzenle
          const orderedBillings: BillingType[] = [];
          orderIds.forEach((id: string) => {
            const billing = data.find(b => b._id === id);
            if (billing) {
              orderedBillings.push(billing);
            }
          });
          
          // Sıralamada olmayan billing'leri ekle
          data.forEach(billing => {
            if (!orderIds.includes(billing._id)) {
              orderedBillings.push(billing);
            }
          });
          
          setBillings(orderedBillings);
        } else {
          // İlk kez için varsayılan sıralama
          setBillingOrder(data.map(b => b._id));
          setBillings(data);
        }
      } catch (error) {
        console.log('Billing sıralaması yüklenirken hata:', error);
        setBillings(data);
        setBillingOrder(data.map(b => b._id));
      }
    } catch (error) {
      console.error('Error loading billings:', error);
      Alert.alert(
        'Error',
        'Failed to load billings. Please check your connection.',
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
    await loadBillings();
    setIsRefreshing(false);
  };

  const toggleBilling = (billingId: string) => {
    setExpandedBilling(prev => {
      const newSet = new Set(prev);
      if (newSet.has(billingId)) {
        newSet.delete(billingId);
      } else {
        newSet.add(billingId);
      }
      return newSet;
    });
  };

  const convertToUnit = (value: number | undefined): string => {
    if (value === undefined || value === null) return '0.00 kWh';
    return `${value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })} kWh`;
  };

  const getDaysDifference = (startTime: string): number => {
    const start = new Date(startTime);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) - 1;
  };

  const formatCurrency = (amount: number, currency: string): string => {
    return `${amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })} ${currency}`;
  };

  // Billing sürükleme başladığında çağrılır
  const handleBillingLongPress = (index: number) => {
    setDraggedBillingIndex(index);
    
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
  };

  // Billing seçimini kaldır (tek tıklama ile)
  const handleBillingPress = (index: number) => {
    // Eğer bu billing zaten seçiliyse, seçimi kaldır
    if (draggedBillingIndex === index) {
      breathingAnim.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.ease) });
      setDraggedBillingIndex(undefined);
    }
  };

  // Billing bırakıldığında çağrılır
  const handleBillingDrop = async (targetIndex: number) => {
    if (draggedBillingIndex === undefined || draggedBillingIndex === targetIndex) {
      breathingAnim.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.ease) });
      setDraggedBillingIndex(undefined);
      return;
    }

    // Sürüklenen billing'in yeni konumunu hesaplama
    const newBillings = [...billings];
    const [draggedBilling] = newBillings.splice(draggedBillingIndex, 1);
    newBillings.splice(targetIndex, 0, draggedBilling);
    
    // Yeni billing listesini güncelle
    setBillings(newBillings);
    
    // Sıralama için ID listesini güncelle
    const newOrder = newBillings.map(billing => billing._id);
    setBillingOrder(newOrder);
    
    // Yeni sıralamayı kalıcı olarak kaydetme
    try {
      await AsyncStorage.setItem('billing_order', JSON.stringify(newOrder));
    } catch (error) {
      console.error('Billing sıralaması kaydedilirken hata:', error);
    }
    
    breathingAnim.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.ease) });
    
    // Sürüklemeyi sonlandırma
    setDraggedBillingIndex(undefined);
  };

  const renderBillingItem = ({ item: billing, index }: { item: BillingType; index: number }) => {
    const isExpanded = expandedBilling.has(billing._id);
    const isBeingDragged = draggedBillingIndex === index;
    const isSelected = draggedBillingIndex === index;
    const canDrop = draggedBillingIndex !== undefined && draggedBillingIndex !== index;
    
    // Calculate card width based on numColumns
    const billingCardWidth = numColumns > 1
      ? (screenWidth - 24 - (12 * (numColumns - 1))) / numColumns
      : undefined;

    return (
      <BillingItem
        billing={billing}
        index={index}
        isExpanded={isExpanded}
        isBeingDragged={isBeingDragged}
        isSelected={isSelected}
        canDrop={canDrop}
        registerValues={registerValues}
        breathingAnimValue={breathingAnim}
        onLongPress={() => handleBillingLongPress(index)}
        onPress={() => {
          if (isSelected) {
            handleBillingPress(index);
          } else if (canDrop) {
            handleBillingDrop(index);
          } else {
            toggleBilling(billing._id);
          }
        }}
        formatCurrency={formatCurrency}
        convertToUnit={convertToUnit}
        getDaysDifference={getDaysDifference}
        billingCardWidth={billingCardWidth}
        numColumns={numColumns}
        isDarkMode={isDarkMode}
      />
    );
  };

  if (!isConnected) {
    return (
      <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        <View style={styles.centerContainer}>
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={64}
            color={paperTheme.colors.error}
          />
          <Text style={[styles.errorText, { color: paperTheme.colors.onSurface }]}>
            Not Connected
          </Text>
          <Text style={[styles.errorSubtext, { color: paperTheme.colors.onSurfaceVariant }]}>
            Please connect to the server from Settings
          </Text>
        </View>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={paperTheme.colors.primary} />
          <Text style={[styles.loadingText, { color: paperTheme.colors.onSurface }]}>
            Loading billings...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      
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
        {billings.length === 0 ? (
          <View style={styles.centerContainer}>
            <LinearGradient
              colors={isDarkMode ? ['#263238', '#37474F'] : ['#1E88E5', '#42A5F5']}
              style={styles.emptyIconContainer}
            >
              <MaterialCommunityIcons
                name="receipt-outline"
                size={48}
                color="#FFFFFF"
              />
            </LinearGradient>
            <Text style={[styles.emptyText, { color: paperTheme.colors.onSurface }]}>
              No billings found
            </Text>
            <Text style={[styles.emptySubtext, { color: paperTheme.colors.onSurfaceVariant }]}>
              Create a billing in the web interface to view it here
            </Text>
          </View>
        ) : (
          <FlatList
            key={`billings-${isLandscape ? 'landscape' : 'portrait'}`}
            data={billings}
            keyExtractor={(item) => item._id}
            renderItem={renderBillingItem}
            extraData={draggedBillingIndex}
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
            contentContainerStyle={[
              styles.listContent,
              numColumns > 1 ? styles.listContentLandscape : undefined
            ]}
            showsVerticalScrollIndicator={false}
          />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  errorText: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: 'bold',
  },
  errorSubtext: {
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
  },
  emptyText: {
    marginTop: 24,
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  listContent: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  listContentLandscape: {
    paddingHorizontal: 12,
  },
  columnWrapper: {
    justifyContent: 'flex-start',
    paddingHorizontal: 0,
    gap: 12,
  },
  billingCardWrapper: {
    marginBottom: 20,
    flex: 1,
    minWidth: 0,
  },
  billingCard: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  blurContainer: {
    padding: 0,
  },
  billingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerTextContainer: {
    flex: 1,
  },
  billingName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  priceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  priceText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  expandedContent: {
    overflow: 'hidden',
  },
  contentInner: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  summaryCards: {
    flexDirection: 'column',
    marginBottom: 16,
    gap: 8,
  },
  summaryCard: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
  },
  summaryCardLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: 12,
    flex: 1,
  },
  summaryCardValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'right',
  },
  totalCostValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  trendLogsContainer: {
    marginBottom: 6,
  },
  trendLogsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  trendLogCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  trendLogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  trendLogIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  trendLogName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  trendLogMetrics: {
    gap: 8,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  metricItem: {
    flex: 1,
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
  },
  costItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  usedValue: {
    color: '#FFD700',
  },
  costValue: {
    color: '#4CAF50',
    fontSize: 16,
  },
  footerInfo: {
    paddingTop: 8,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
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
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
});
