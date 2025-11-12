import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ToastAndroid,
  Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, Card, useTheme as usePaperTheme } from 'react-native-paper';
import GradientCard from '../components/GradientCard';
import { useConnection } from '../context/ConnectionContext';
import { useTheme as useAppTheme } from '../context/ThemeContext';
import { useWebSocket } from '../context/WebSocketContext';
import ApiService from '../services/ApiService';

interface ConsumptionWidget {
  _id: string;
  title: string;
  trendLogId: string | null;
  size: { width: number; height: number } | null;
  appearance: {
    fontFamily: string;
    textColor: string;
    backgroundColor: string;
    opacity: number;
  } | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface ComparisonData {
  previousValue: number;
  currentValue: number;
  previousTimestamp: Date;
  currentTimestamp: Date;
  percentageChange: number;
  timeFilter: string;
}

interface MonthlyData {
  currentYear: Array<{ month: number; value: number; timestamp: Date }>;
  previousYear: Array<{ month: number; value: number; timestamp: Date }>;
  currentYearLabel: number;
  previousYearLabel: number;
}

const { width: screenWidth } = Dimensions.get('window');

export default function ConsumptionScreen() {
  const paperTheme = usePaperTheme();
  const { isDarkMode } = useAppTheme();
  const { isConnected } = useConnection();
  const { isConnected: wsConnected, connect: wsConnect, watchRegister, unwatchRegister } = useWebSocket();
  
  const [widgets, setWidgets] = useState<ConsumptionWidget[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTimeFilters, setSelectedTimeFilters] = useState<Map<string, 'month' | 'year'>>(new Map());
  const [widgetMonthlyData, setWidgetMonthlyData] = useState<Map<string, any>>(new Map());
  const [widgetYearlyData, setWidgetYearlyData] = useState<Map<string, any>>(new Map());
  const [liveValues, setLiveValues] = useState<Map<string, number>>(new Map());
  const [draggedWidgetIndex, setDraggedWidgetIndex] = useState<number | undefined>(undefined);
  const [widgetOrder, setWidgetOrder] = useState<string[]>([]);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const breathingAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entry animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    if (isConnected) {
      loadWidgets();
      if (!wsConnected) {
        wsConnect().catch(console.error);
      }
    } else {
      setWidgets([]);
      setIsLoading(false);
    }
  }, [isConnected, wsConnected]);
  
  // Kullanıcıya widget'ları sürükleme özelliğini bildirmek için
  useEffect(() => {
    if (widgets.length > 1 && !isLoading) {
      // Yalnızca birden fazla widget olduğunda bildirim göster
      showDragInfo();
    }
  }, [widgets.length, isLoading]);

  // Nefes alma animasyonu - widget seçildiğinde başlat
  useEffect(() => {
    if (draggedWidgetIndex !== undefined) {
      // Animasyonu başlat
      const breathingAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(breathingAnim, {
            toValue: 1.05,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(breathingAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      breathingAnimation.start();

      return () => {
        breathingAnimation.stop();
        breathingAnim.setValue(1);
      };
    } else {
      // Animasyonu durdur ve değeri sıfırla
      breathingAnim.setValue(1);
    }
  }, [draggedWidgetIndex]);

  // Watch registers for live data when time filter is month
  useEffect(() => {
    const activeCallbacks = new Map<string, (value: any) => void>();
    const activeSubscriptions = new Map<string, any>();
    
    if (wsConnected) {
      widgets.forEach(widget => {
        // Only watch if this widget has month filter selected
        const widgetFilter = selectedTimeFilters.get(widget._id) || 'month';
        if (widgetFilter === 'month' && widget.trendLogId && widgetMonthlyData.has(widget._id)) {
          const data = widgetMonthlyData.get(widget._id);
          if (data?.registerDetails) {
            const register = data.registerDetails;
            
            // Create proper RegisterSubscription from register details
            const registerSubscription = {
              analyzerId: register.analyzerId,
              address: register.address,
              dataType: register.dataType,
              scale: register.scale,
              byteOrder: register.byteOrder,
              bit: register.bit,
              registerId: register._id
            };
            
            // Create callback for this widget
            const callback = (value: any) => {
              setLiveValues(prev => {
                const newMap = new Map(prev);
                newMap.set(widget._id, value);
                return newMap;
              });
            };
            
            // Watch the register
            watchRegister(registerSubscription, callback);
            
            // Store subscription info and callback for cleanup
            activeSubscriptions.set(widget._id, registerSubscription);
            activeCallbacks.set(widget._id, callback);
          }
        }
      });
    }
    
    return () => {
      // Cleanup subscriptions
      activeSubscriptions.forEach((subscription, widgetId) => {
        const callback = activeCallbacks.get(widgetId);
        if (callback) {
          unwatchRegister(subscription, callback);
        }
      });
      setLiveValues(new Map());
    };
  }, [wsConnected, widgets, widgetMonthlyData, selectedTimeFilters, watchRegister, unwatchRegister]);

  const loadWidgets = async () => {
    try {
      // Consumption widgets ve registers'i paralel çek (eğer registers gerekiyorsa)
      const data = await ApiService.getConsumptionWidgets();
      
      // Kayıtlı widget sıralamasını kontrol et
      try {
        const savedOrder = await AsyncStorage.getItem('consumption_widget_order');
        if (savedOrder) {
          const orderIds = JSON.parse(savedOrder);
          
          // Kaydedilmiş sıralamaya göre widget'ları düzenle
          const orderedWidgets = [...data];
          
          // Önce sıralamayı kaydet
          setWidgetOrder(orderIds);
          
          // Sıralamaya göre düzenleme
          if (orderIds.length > 0) {
            // Sıralı widget listesi oluştur
            const sortedWidgets: ConsumptionWidget[] = [];
            
            // Ordered ID'lere göre widget'ları sırala
            orderIds.forEach((id: string) => {
              const widget = data.find(w => w._id === id);
              if (widget) {
                sortedWidgets.push(widget);
              }
            });
            
            // Sıralamada olmayan widget'ları ekle
            data.forEach(widget => {
              if (!orderIds.includes(widget._id)) {
                sortedWidgets.push(widget);
              }
            });
            
            // Sıralanmış widget'lar varsa güncelle
            if (sortedWidgets.length > 0) {
              setWidgets(sortedWidgets);
            } else {
              setWidgets(data);
            }
          } else {
            setWidgets(data);
          }
        } else {
          // Kaydedilmiş sıralama yoksa varsayılan sıralama kullan
          setWidgets(data);
          setWidgetOrder(data.map(widget => widget._id));
        }
      } catch (error) {
        console.log('Widget sıralaması yüklenirken hata:', error);
        setWidgets(data);
        setWidgetOrder(data.map(widget => widget._id));
      }
      
      // Load both monthly and yearly data for all widgets
      await loadAllWidgetData(data);
    } catch (error) {
      console.error('Error loading consumption widgets:', error);
      Alert.alert(
        'Error',
        'Failed to load consumption widgets. Please check your connection.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const loadAllWidgetData = async (widgetsList: ConsumptionWidget[]) => {
    const monthlyDataMap = new Map<string, any>();
    const yearlyDataMap = new Map<string, any>();
    
    // Get all trend log IDs
    const trendLogIds = widgetsList
      .filter(widget => widget.trendLogId)
      .map(widget => widget.trendLogId!);
    
    if (trendLogIds.length === 0) {
      return;
    }

    try {
      // Get registers and comparisons in parallel
      const [registers, comparisonsResult] = await Promise.all([
        ApiService.getRegisters(),
        ApiService.getConsumptionWidgetComparisons(trendLogIds)
      ]);
      
      if (comparisonsResult.success && comparisonsResult.data) {
        // Process each result
        comparisonsResult.data.forEach((result: any) => {
          if (!result.success) {
            console.error(`Error loading data for trend log ${result.trendLogId}:`, result.error);
            return;
          }

          // Find the widget that matches this trend log
          const widget = widgetsList.find(w => w.trendLogId === result.trendLogId);
          if (!widget) {
            return;
          }

          // Process monthly data
          if (result.monthly) {
            const monthlyData: any = {
              success: true,
              comparison: result.monthly,
              monthlyData: null,
              trendLog: result.trendLog
            };

            // Find the actual register details
            if (result.trendLog?.registerId) {
              const register = registers.find(r => r._id === result.trendLog.registerId);
              if (register) {
                monthlyData.registerDetails = register;
              }
            }

            monthlyDataMap.set(widget._id, monthlyData);
          }

          // Process yearly data
          if (result.yearly) {
            const yearlyData = {
              success: true,
              comparison: result.yearly.comparison,
              monthlyData: result.yearly.monthlyData,
              trendLog: result.trendLog
            };

            yearlyDataMap.set(widget._id, yearlyData);
          }
        });
      } else {
        console.error('Failed to load consumption widget comparisons:', comparisonsResult.error);
      }
    } catch (error) {
      console.error('Error loading all widget data:', error);
    }
    
    setWidgetMonthlyData(monthlyDataMap);
    setWidgetYearlyData(yearlyDataMap);
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
    await loadWidgets();
    setIsRefreshing(false);
  };

  const handleTimeFilterChange = (widgetId: string, filter: 'month' | 'year') => {
    const currentFilter = selectedTimeFilters.get(widgetId) || 'month';
    if (filter === currentFilter) return;
    
    // Update filter for this specific widget
    setSelectedTimeFilters(prev => {
      const newMap = new Map(prev);
      newMap.set(widgetId, filter);
      return newMap;
    });
  };
  
  // Get filter for a specific widget (defaults to 'month')
  const getWidgetFilter = (widgetId: string): 'month' | 'year' => {
    return selectedTimeFilters.get(widgetId) || 'month';
  };
  
  // Widget sürükleme başladığında çağrılır
  const handleWidgetLongPress = useCallback((index: number) => {
    setDraggedWidgetIndex(index);
    
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

  // Widget seçimini kaldır (tek tıklama ile)
  const handleWidgetPress = useCallback((index: number) => {
    // Eğer bu widget zaten seçiliyse, seçimi kaldır
    if (draggedWidgetIndex === index) {
      setDraggedWidgetIndex(undefined);
    }
  }, [draggedWidgetIndex]);
  
  // Widget bırakıldığında çağrılır
  const handleWidgetDrop = useCallback(async (targetIndex: number) => {
    if (draggedWidgetIndex === undefined || draggedWidgetIndex === targetIndex) {
      setDraggedWidgetIndex(undefined);
      return;
    }

    // Sürüklenen widget'ı yeni konumuna taşıma
    const newWidgets = [...widgets];
    const [draggedWidget] = newWidgets.splice(draggedWidgetIndex, 1);
    newWidgets.splice(targetIndex, 0, draggedWidget);
    
    // Yeni widget listesini güncelle
    setWidgets(newWidgets);
    
    // Sıralama için ID listesini güncelle
    const newOrder = newWidgets.map(widget => widget._id);
    setWidgetOrder(newOrder);
    
    // Yeni sıralamayı kalıcı olarak kaydetme
    try {
      await AsyncStorage.setItem('consumption_widget_order', JSON.stringify(newOrder));
    } catch (error) {
      console.error('Widget sıralaması kaydedilirken hata:', error);
    }
    
    // Sürüklemeyi sonlandırma
    setDraggedWidgetIndex(undefined);
  }, [draggedWidgetIndex, widgets]);

  const formatEnergyValue = (value: number, decimals: number = 1): string => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(decimals)} MWh`;
    } else {
      return `${value.toFixed(decimals)} kWh`;
    }
  };

  const formatDate = (date: Date | string, widgetId: string): string => {
    const d = new Date(date);
    const filter = getWidgetFilter(widgetId);
    if (filter === 'month') {
      return d.toLocaleDateString('en-US', { month: 'long' });
    } else {
      return d.toLocaleDateString('en-US', { year: 'numeric' });
    }
  };

  const renderConsumptionWidget = ({ item, index }: { item: ConsumptionWidget, index: number }) => {
    // Get filter for this specific widget
    const widgetFilter = getWidgetFilter(item._id);
    
    // Get data based on selected filter
    const data = widgetFilter === 'month'
      ? widgetMonthlyData.get(item._id)
      : widgetYearlyData.get(item._id);
    const liveValue = liveValues.get(item._id);
    
    if (!data || !data.comparison) {
      return (
        <View style={styles.widgetWrapper}>
          <Card style={styles.widgetCard} mode="elevated">
            <Card.Content>
              <Text style={[styles.widgetTitle, { color: paperTheme.colors.onSurface }]}>
                {item.title}
              </Text>
              <View style={styles.noDataContainer}>
                <MaterialCommunityIcons
                  name="chart-line-variant"
                  size={48}
                  color={paperTheme.colors.outline}
                />
                <Text style={[styles.noDataText, { color: paperTheme.colors.onSurfaceVariant }]}>
                  No data available
                </Text>
              </View>
            </Card.Content>
          </Card>
        </View>
      );
    }

    const comparison = data.comparison;
    const monthlyData = data.monthlyData;
    
    // Update current value with live value if available
    const currentValue = liveValue !== undefined && widgetFilter === 'month' 
      ? liveValue 
      : comparison.currentValue;
    
    // Recalculate percentage if using live value
    let percentageChange = comparison.percentageChange ?? 0;
    if (liveValue !== undefined && widgetFilter === 'month' && comparison.previousValue) {
      percentageChange = ((liveValue - comparison.previousValue) / comparison.previousValue) * 100;
    }

    const gradientColors = isDarkMode ? ['#263238', '#37474F'] as const : ['#1E88E5', '#42A5F5'] as const;
    
    // Seçili widget için animasyonlu scale
    const animatedStyle = draggedWidgetIndex === index
      ? { transform: [{ scale: breathingAnim }] }
      : {};
    
    return (
      <Animated.View style={[styles.widgetWrapper, animatedStyle]}>
        <GradientCard
          colors={gradientColors}
          style={{
            ...styles.widgetCard,
            ...(draggedWidgetIndex === index ? styles.beingDragged : {}),
            ...(draggedWidgetIndex !== undefined && draggedWidgetIndex !== index ? styles.dropTarget : {})
          }}
          mode="elevated"
        >
          <BlurView
            intensity={isDarkMode ? 20 : 15}
            tint={isDarkMode ? "dark" : "light"}
            style={styles.blurContainer}
          >
            <View style={styles.widgetContent}>
              {/* Header - Sadece bu kısmı sürüklenebilir yapıyoruz */}
              <TouchableOpacity
                onLongPress={() => handleWidgetLongPress(index)}
                onPress={() => {
                  // Eğer bu widget seçiliyse, seçimi kaldır
                  if (draggedWidgetIndex === index) {
                    handleWidgetPress(index);
                  } 
                  // Eğer başka bir widget seçiliyse ve bu widget'a drop yapılabilirse, drop yap
                  else if (draggedWidgetIndex !== undefined && draggedWidgetIndex !== index) {
                    handleWidgetDrop(index);
                  }
                }}
                activeOpacity={0.95}
                delayLongPress={500}
              >
                <View style={styles.widgetHeader}>
                  <Text style={styles.widgetTitle}>{item.title}</Text>
                  <View style={styles.changeIndicator}>
                    <Text style={styles.changeLabel}>
                      {widgetFilter === 'month' ? 'Monthly' : 'Yearly'} Change
                    </Text>
                    <Text style={[
                      styles.changeValue,
                      { color: percentageChange >= 0 ? '#F44336' : '#008000' }
                    ]}>
                      {percentageChange >= 0 ? '+' : ''}{percentageChange.toFixed(1)}%
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>

              {/* Time Filter */}
              <View style={styles.filterContainer}>
                <TouchableOpacity
                  style={[
                    styles.filterButton,
                    widgetFilter === 'month' && styles.filterButtonActive
                  ]}
                  onPress={() => handleTimeFilterChange(item._id, 'month')}
                >
                  <Text style={[
                    styles.filterText,
                    widgetFilter === 'month' && styles.filterTextActive
                  ]}>
                    Monthly
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterButton,
                    widgetFilter === 'year' && styles.filterButtonActive
                  ]}
                  onPress={() => handleTimeFilterChange(item._id, 'year')}
                >
                  <Text style={[
                    styles.filterText,
                    widgetFilter === 'year' && styles.filterTextActive
                  ]}>
                    Yearly
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Chart Area */}
              {widgetFilter === 'month' ? (
                // Monthly comparison bars
                <View style={styles.chartContainer}>
                  <View style={styles.barChart}>
                    {(() => {
                      const prevValue = comparison.previousValue ?? 0;
                      const currValue = currentValue ?? 0;
                      const maxValue = Math.max(prevValue, currValue, 1); // En az 1 olmalı, 0'a bölmeyi önlemek için
                      
                      // Yükseklikleri piksel cinsinden hesapla (maksimum yükseklik 150px)
                      const maxBarHeight = 150;
                      const prevBarHeight = prevValue > 0 
                        ? Math.max((prevValue / maxValue) * maxBarHeight, 5) 
                        : 0;
                      const currBarHeight = currValue > 0 
                        ? Math.max((currValue / maxValue) * maxBarHeight, 5) 
                        : 0;
                      
                      return (
                        <>
                          <View style={styles.barWrapper}>
                            <Text style={styles.barValue}>
                              {formatEnergyValue(prevValue)}
                            </Text>
                            <View style={[styles.bar, styles.previousBar, {
                              height: prevBarHeight
                            }]} />
                            <Text style={styles.barLabel}>
                              {formatDate(comparison.previousTimestamp, item._id)}
                            </Text>
                          </View>
                          
                          <View style={styles.barWrapper}>
                            <Text style={styles.barValue}>
                              {formatEnergyValue(currValue)}
                            </Text>
                            <View style={[styles.bar, styles.currentBar, {
                              height: currBarHeight
                            }]} />
                            <Text style={styles.barLabel}>
                              {formatDate(comparison.currentTimestamp, item._id)}
                            </Text>
                          </View>
                        </>
                      );
                    })()}
                  </View>
                </View>
              ) : (
                // Yearly view - show 12 months comparison
                widgetFilter === 'year' && (
                  <View style={styles.yearlyContainer}>
                    {monthlyData ? (
                      <>
                        {/* Year totals */}
                        <View style={styles.yearlyHeader}>
                          <View style={styles.yearTotal}>
                            <Text style={styles.yearLabel}>{monthlyData.previousYearLabel || 'Previous Year'} Total</Text>
                            <Text style={styles.yearTotalValue}>
                              {formatEnergyValue(comparison.previousValue ?? 0)}
                            </Text>
                          </View>
                          <View style={styles.yearTotal}>
                            <Text style={styles.yearLabel}>{monthlyData.currentYearLabel || 'Current Year'} Total</Text>
                            <Text style={[styles.yearTotalValue, { color: '#FFC107' }]}>
                              {formatEnergyValue(comparison.currentValue ?? 0)}
                            </Text>
                          </View>
                        </View>
                        
                        {/* Monthly bars */}
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={styles.monthlyBarsContainer}
                        >
                          {(() => {
                            if (!monthlyData.currentYear || !monthlyData.previousYear) {
                              return null;
                            }
                            
                            // Calculate max value once for all months
                            let maxValue = 1;
                            try {
                              const allValues = [
                                ...monthlyData.currentYear.map((m: any) => m?.value || 0),
                                ...monthlyData.previousYear.map((m: any) => m?.value || 0)
                              ];
                              if (allValues.length > 0) {
                                maxValue = Math.max(...allValues, 1);
                              }
                            } catch (error) {
                              console.error('Error calculating max value:', error);
                              maxValue = 1;
                            }
                            
                            return Array.from({ length: 12 }, (_, monthIndex) => {
                              const currentYearData = monthlyData.currentYear[monthIndex];
                              const previousYearData = monthlyData.previousYear[monthIndex];
                              const currentValue = currentYearData?.value ?? 0;
                              const previousValue = previousYearData?.value ?? 0;
                              
                              // Calculate heights in pixels (max height is 100px)
                              const maxBarHeight = 100;
                              const currentBarHeight = currentValue > 0
                                ? Math.max((currentValue / maxValue) * maxBarHeight, 5)
                                : 0;
                              const previousBarHeight = previousValue > 0
                                ? Math.max((previousValue / maxValue) * maxBarHeight, 5)
                                : 0;
                          
                              return (
                                <View key={monthIndex} style={styles.monthColumn}>
                                  <View style={styles.monthBars}>
                                    {/* Current year bar */}
                                    <View style={styles.monthBarWrapper}>
                                      {currentValue > 0 && (
                                        <Text style={styles.monthBarValue}>
                                          {formatEnergyValue(currentValue, 0)}
                                        </Text>
                                      )}
                                      <View
                                        style={[
                                          styles.monthBar,
                                          styles.currentYearBar,
                                          {
                                            height: currentBarHeight,
                                          }
                                        ]}
                                      />
                                    </View>
                                    
                                    {/* Previous year bar */}
                                    <View style={styles.monthBarWrapper}>
                                      {previousValue > 0 && (
                                        <Text style={styles.monthBarValue}>
                                          {formatEnergyValue(previousValue, 0)}
                                        </Text>
                                      )}
                                      <View
                                        style={[
                                          styles.monthBar,
                                          styles.previousYearBar,
                                          {
                                            height: previousBarHeight,
                                            backgroundColor: previousBarHeight > 0 ? '#9cf990ff' : 'transparent'
                                          }
                                        ]}
                                      />
                                    </View>
                                  </View>
                                  
                                  <Text style={styles.monthLabel}>
                                    {new Date(2024, monthIndex).toLocaleDateString('en-US', { month: 'short' })}
                                  </Text>
                                </View>
                              );
                            });
                          })()}
                    </ScrollView>
                    
                    {/* Legend */}
                    <View style={styles.yearlyLegend}>
                      <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: '#FFC107' }]} />
                        <Text style={styles.legendText}>{monthlyData.currentYearLabel}</Text>
                      </View>
                      <View style={[styles.legendItem, { marginLeft: 20 }]}>
                        <View style={[styles.legendDot, { backgroundColor: '#9cf990ff' }]} />
                        <Text style={styles.legendText}>{monthlyData.previousYearLabel}</Text>
                      </View>
                    </View>
                  </>
                    ) : (
                      // No data state for yearly view
                      <View style={styles.noDataContainer}>
                        <MaterialCommunityIcons
                          name="chart-line"
                          size={48}
                          color="rgba(255,255,255,0.5)"
                        />
                        <Text style={styles.noDataText}>
                          Loading yearly data...
                        </Text>
                      </View>
                    )}
                  </View>
                )
              )}

            </View>
          </BlurView>
        </GradientCard>
      </Animated.View>
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
  // Check if loading or if widgets exist but data hasn't loaded yet
  const hasWidgetData = widgets.length > 0 && (widgetMonthlyData.size > 0 || widgetYearlyData.size > 0);
  const shouldShowLoading = isLoading || (widgets.length > 0 && !hasWidgetData);
  
  if (shouldShowLoading) {
    return (
      <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
        <StatusBar style={isDarkMode ? "light" : "dark"} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={paperTheme.colors.primary} />
          <Text style={[styles.loadingText, { color: paperTheme.colors.onSurface }]}>
            Loading consumption data...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      
      <Animated.View
        style={{
          flex: 1,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
      >
        <FlatList
          data={widgets}
          renderItem={renderConsumptionWidget}
          keyExtractor={(item) => item._id}
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
              <MaterialCommunityIcons
                name="chart-bar"
                size={64}
                color={paperTheme.colors.outline}
                style={styles.emptyIcon}
              />
              <Text style={[styles.emptyText, { color: paperTheme.colors.onSurfaceVariant }]}>
                No consumption widgets found
              </Text>
              <Text style={[styles.emptySubtext, { color: paperTheme.colors.outline }]}>
                Pull down to refresh
              </Text>
            </View>
          }
        />
      </Animated.View>
    </View>
  );
}

// Kullanıcıya widget sürükleme özelliğini bildirmek için toast
const showDragInfo = () => {
  if (Platform.OS === 'android') {
    ToastAndroid.showWithGravityAndOffset(
      "Widgetları sıralamak için uzun basın ve sürükleyin",
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
    elevation: 16,
  },
  dropTarget: {
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    borderStyle: 'dashed',
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
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
  
  // Widget Styles
  widgetWrapper: {
    marginBottom: 16,
  },
  widgetCard: {
    elevation: 3,
    // overflow removed to avoid Surface warning
  },
  blurContainer: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  widgetContent: {
    padding: 16,
  },
  widgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  widgetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
    flex: 1,
  },
  changeIndicator: {
    alignItems: 'flex-end',
  },
  changeLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 2,
  },
  changeValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  
  // Filter Styles
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 2,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  filterTextActive: {
    color: 'white',
  },
  
  // Chart Styles
  chartContainer: {
    height: 200,
    marginTop: 10,
  },
  barChart: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    paddingBottom: 10,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '15%',
    marginVertical: 8,
    borderRadius: 4,
  },
  previousBar: {
    backgroundColor: '#9cf990ff',
  },
  currentBar: {
    backgroundColor: '#FFC107',
  },
  barValue: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
    marginBottom: 8,
  },
  barLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  
  // Yearly View Styles
  yearlyContainer: {
    paddingVertical: 10,
  },
  yearlyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  yearTotal: {
    alignItems: 'center',
  },
  yearLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
  },
  yearTotalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
  },
  monthlyBarsContainer: {
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  monthColumn: {
    alignItems: 'center',
    marginHorizontal: 6,
  },
  monthBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 120,
    marginBottom: 5,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 4,
    padding: 4,
  },
  monthBarWrapper: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginHorizontal: 2,
    flex: 1,
  },
  monthBarValue: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 2,
    textAlign: 'center',
  },
  monthBar: {
    width: 20,
    borderRadius: 4,
    minHeight: 2,
    backgroundColor: '#9cf990ff',
  },
  currentYearBar: {
    backgroundColor: '#FFC107',
  },
  previousYearBar: {
    backgroundColor: '#9cf990ff',
  },
  monthLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  yearlyLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 15,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  yearlyStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  yearStat: {
    alignItems: 'center',
  },
  yearValue: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
  },
  yearDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  
  // Live Indicator Styles
  liveIndicatorContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F44336',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pulseIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'white',
    marginRight: 4,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'white',
  },
  
  // No Data Styles
  noDataContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  noDataText: {
    fontSize: 16,
    marginTop: 12,
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
    paddingVertical: 80,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
  },
});