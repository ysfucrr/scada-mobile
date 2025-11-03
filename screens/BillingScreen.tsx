import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions
} from 'react-native';
import { ActivityIndicator, useTheme as usePaperTheme } from 'react-native-paper';
import GradientCard from '../components/GradientCard';
import { useConnection } from '../context/ConnectionContext';
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

const { width: screenWidth } = Dimensions.get('window');

export default function BillingScreen() {
  const paperTheme = usePaperTheme();
  const { isDarkMode } = useAppTheme();
  const { isConnected } = useConnection();
  const { isConnected: wsConnected, connect: wsConnect, watchRegister, unwatchRegister } = useWebSocket();
  
  const [billings, setBillings] = useState<BillingType[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedBilling, setExpandedBilling] = useState<string | null>(null);
  const [registerValues, setRegisterValues] = useState<Map<string, number>>(new Map());
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const expandAnims = useRef(new Map<string, Animated.Value>()).current;

  useEffect(() => {
    // Entry animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

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
    
    if (wsConnected && expandedBilling) {
      const billing = billings.find(b => b._id === expandedBilling);
      
      if (billing) {
        // Get all registers to find register details
        ApiService.getRegisters().then(registers => {
          billing.trendLogs.forEach(trendLog => {
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
        });
      }
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

  const loadBillings = async () => {
    try {
      setIsLoading(true);
      const data = await ApiService.getBillings();
      setBillings(data);
      
      // Initialize expand animations for each billing
      data.forEach(billing => {
        if (!expandAnims.has(billing._id)) {
          expandAnims.set(billing._id, new Animated.Value(0));
        }
      });
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
    const isExpanding = expandedBilling !== billingId;
    setExpandedBilling(isExpanding ? billingId : null);
    
    // Animate expansion/collapse
    const animValue = expandAnims.get(billingId);
    if (animValue) {
      Animated.spring(animValue, {
        toValue: isExpanding ? 1 : 0,
        useNativeDriver: false,
        tension: 65,
        friction: 11,
      }).start();
    }
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

  const renderBillingItem = ({ item: billing, index }: { item: BillingType; index: number }) => {
    const isExpanded = expandedBilling === billing._id;
    
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
    
    const expandAnim = expandAnims.get(billing._id) || new Animated.Value(0);
    const rotateAnim = expandAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '180deg'],
    });

    const maxHeight = expandAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, billing.trendLogs.length * 200 + 300],
    });

    return (
      <View style={styles.billingCardWrapper}>
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
            <TouchableOpacity
              onPress={() => toggleBilling(billing._id)}
              activeOpacity={0.9}
              style={styles.billingHeader}
            >
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
              <Animated.View style={{ transform: [{ rotate: rotateAnim }] }}>
                <MaterialCommunityIcons
                  name="chevron-down"
                  size={28}
                  color="#FFFFFF"
                />
              </Animated.View>
            </TouchableOpacity>

            {/* Expanded Content */}
            <Animated.View
              style={[
                styles.expandedContent,
                {
                  maxHeight,
                  opacity: expandAnim,
                }
              ]}
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
                      {convertToUnit(totalUsed).split(' ')[0]}
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
                                {convertToUnit(trendLog.firstValue).split(' ')[0]}
                              </Text>
                            </View>
                            <View style={styles.metricItem}>
                              <Text style={styles.metricLabel}>Current</Text>
                              <Text style={styles.metricValue}>
                                {convertToUnit(currentValue).split(' ')[0]}
                              </Text>
                            </View>
                          </View>
                          <View style={styles.metricRow}>
                            <View style={styles.metricItem}>
                              <Text style={styles.metricLabel}>Used</Text>
                              <Text style={[styles.metricValue, styles.usedValue]}>
                                {convertToUnit(used).split(' ')[0]}
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
            </Animated.View>
          </BlurView>
        </GradientCard>
      </View>
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
      
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }
        ]}
      >
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
            data={billings}
            keyExtractor={(item) => item._id}
            renderItem={renderBillingItem}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                colors={[paperTheme.colors.primary]}
                tintColor={paperTheme.colors.primary}
              />
            }
            contentContainerStyle={styles.listContent}
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
  billingCardWrapper: {
    marginBottom: 20,
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
    marginBottom: 16,
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
    paddingTop: 16,
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
});
