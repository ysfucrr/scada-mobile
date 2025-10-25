import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
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
  View
} from 'react-native';
import { Card, useTheme as usePaperTheme } from 'react-native-paper';
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
  const [selectedTimeFilter, setSelectedTimeFilter] = useState<'month' | 'year'>('month');
  const [widgetMonthlyData, setWidgetMonthlyData] = useState<Map<string, any>>(new Map());
  const [widgetYearlyData, setWidgetYearlyData] = useState<Map<string, any>>(new Map());
  const [liveValues, setLiveValues] = useState<Map<string, number>>(new Map());
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

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

  // Watch registers for live data when time filter is month
  useEffect(() => {
    const activeCallbacks = new Map<string, (value: any) => void>();
    const activeSubscriptions = new Map<string, any>();
    
    if (wsConnected && selectedTimeFilter === 'month') {
      widgets.forEach(widget => {
        if (widget.trendLogId && widgetMonthlyData.has(widget._id)) {
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
  }, [wsConnected, widgets, widgetMonthlyData, selectedTimeFilter, watchRegister, unwatchRegister]);

  const loadWidgets = async () => {
    try {
      const data = await ApiService.getConsumptionWidgets();
      setWidgets(data);
      
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
    
    // First, get all registers to find register details
    const registers = await ApiService.getRegisters();
    
    for (const widget of widgetsList) {
      if (widget.trendLogId) {
        try {
          // Load monthly data
          const monthlyData = await ApiService.getTrendLogComparison(widget.trendLogId, 'month');
          if (monthlyData && monthlyData.success) {
            // Find the actual register details
            if (monthlyData.trendLog?.registerId) {
              const register = registers.find(r => r._id === monthlyData.trendLog.registerId);
              if (register) {
                monthlyData.registerDetails = register;
              }
            }
            monthlyDataMap.set(widget._id, monthlyData);
          } else if (monthlyData && !monthlyData.success) {
            console.error(`Error loading monthly data for widget ${widget._id}:`, monthlyData.error);
          }

          // Load yearly data
          const yearlyData = await ApiService.getTrendLogComparison(widget.trendLogId, 'year');
          if (yearlyData && yearlyData.success) {
            yearlyDataMap.set(widget._id, yearlyData);
          } else if (yearlyData && !yearlyData.success) {
            console.error(`Error loading yearly data for widget ${widget._id}:`, yearlyData.error);
          }
        } catch (error) {
          console.error(`Error loading data for widget ${widget._id}:`, error);
        }
      }
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

  const handleTimeFilterChange = (filter: 'month' | 'year') => {
    if (filter === selectedTimeFilter) return;
    
    // Simply change the filter, data is already loaded
    setSelectedTimeFilter(filter);
  };

  const formatEnergyValue = (value: number, decimals: number = 1): string => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(decimals)} MWh`;
    } else {
      return `${value.toFixed(decimals)} kWh`;
    }
  };

  const formatDate = (date: Date | string): string => {
    const d = new Date(date);
    if (selectedTimeFilter === 'month') {
      return d.toLocaleDateString('en-US', { month: 'long' });
    } else {
      return d.toLocaleDateString('en-US', { year: 'numeric' });
    }
  };

  const renderConsumptionWidget = ({ item }: { item: ConsumptionWidget }) => {
    // Get data based on selected filter
    const data = selectedTimeFilter === 'month'
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
    const currentValue = liveValue !== undefined && selectedTimeFilter === 'month' 
      ? liveValue 
      : comparison.currentValue;
    
    // Recalculate percentage if using live value
    let percentageChange = comparison.percentageChange ?? 0;
    if (liveValue !== undefined && selectedTimeFilter === 'month' && comparison.previousValue) {
      percentageChange = ((liveValue - comparison.previousValue) / comparison.previousValue) * 100;
    }

    return (
      <View style={styles.widgetWrapper}>
        <GradientCard
          colors={['#1E88E5', '#42A5F5']}
          style={styles.widgetCard}
          mode="elevated"
        >
          <BlurView
            intensity={isDarkMode ? 20 : 15}
            tint={isDarkMode ? "dark" : "light"}
            style={styles.blurContainer}
          >
            <View style={styles.widgetContent}>
              {/* Header */}
              <View style={styles.widgetHeader}>
                <Text style={styles.widgetTitle}>{item.title}</Text>
                <View style={styles.changeIndicator}>
                  <Text style={styles.changeLabel}>
                    {selectedTimeFilter === 'month' ? 'Monthly' : 'Yearly'} Change
                  </Text>
                  <Text style={[
                    styles.changeValue,
                    { color: percentageChange >= 0 ? '#F44336' : '#4CAF50' }
                  ]}>
                    {percentageChange >= 0 ? '+' : ''}{percentageChange.toFixed(1)}%
                  </Text>
                </View>
              </View>

              {/* Time Filter */}
              <View style={styles.filterContainer}>
                <TouchableOpacity
                  style={[
                    styles.filterButton,
                    selectedTimeFilter === 'month' && styles.filterButtonActive
                  ]}
                  onPress={() => handleTimeFilterChange('month')}
                >
                  <Text style={[
                    styles.filterText,
                    selectedTimeFilter === 'month' && styles.filterTextActive
                  ]}>
                    Monthly
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterButton,
                    selectedTimeFilter === 'year' && styles.filterButtonActive
                  ]}
                  onPress={() => handleTimeFilterChange('year')}
                >
                  <Text style={[
                    styles.filterText,
                    selectedTimeFilter === 'year' && styles.filterTextActive
                  ]}>
                    Yearly
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Chart Area */}
              {selectedTimeFilter === 'month' ? (
                // Monthly comparison bars
                <View style={styles.chartContainer}>
                  <View style={styles.barChart}>
                    <View style={styles.barWrapper}>
                      <Text style={styles.barValue}>
                        {formatEnergyValue(comparison.previousValue ?? 0)}
                      </Text>
                      <View style={[styles.bar, styles.previousBar, {
                        height: (comparison.previousValue ?? 0) > 0 ? '60%' : '10%'
                      }]} />
                      <Text style={styles.barLabel}>
                        {formatDate(comparison.previousTimestamp)}
                      </Text>
                    </View>
                    
                    <View style={styles.barWrapper}>
                      <Text style={styles.barValue}>
                        {formatEnergyValue(currentValue ?? 0)}
                      </Text>
                      <View style={[styles.bar, styles.currentBar, {
                        height: (currentValue ?? 0) > 0 ? '80%' : '10%'
                      }]} />
                      <Text style={styles.barLabel}>
                        {formatDate(comparison.currentTimestamp)}
                      </Text>
                    </View>
                  </View>
                </View>
              ) : (
                // Yearly view - show 12 months comparison
                selectedTimeFilter === 'year' && (
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
                {isLoading ? 'Loading...' : 'Pull down to refresh'}
              </Text>
            </View>
          }
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
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
    minHeight: 20,
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