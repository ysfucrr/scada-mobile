import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState, useCallback } from 'react';
import { RefreshControl, ScrollView, StyleSheet, useWindowDimensions, View, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ActivityIndicator,
  IconButton,
  SegmentedButtons,
  Text,
  useTheme
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

// Components
import DataCard from '../components/DataCard';
import GradientCard from '../components/GradientCard';
import StatusCard from '../components/StatusCard';
import WidgetCard from '../components/WidgetCard';

// Contexts
import { useConnection } from '../context/ConnectionContext';
import { useOrientation } from '../context/OrientationContext';
import { useTheme as useAppTheme } from '../context/ThemeContext';
import { useWebSocket } from '../context/WebSocketContext';

// Services
import ApiService from '../services/ApiService';

// Types
import { AppTheme } from '../theme/theme';

interface SystemInfo {
  mongodb: {
    dbStats: {
      db: string;
      collections: number;
      views: number;
      objects: number;
      dataSize: number;
      storageSize: number;
      indexes: number;
      indexSize: number;
    };
    collectionStats: Array<{
      name: string;
      size: number;
      count: number;
    }>;
  };
  system: {
    totalMemory: string;
    freeMemory: string;
    usedMemory: string;
    memoryUsagePercent: string;
    cpuCount: number;
    cpuModel: string;
    uptime: number;
    platform: string;
    hostname: string;
    diskIOSpeeds: {
      read: number;
      write: number;
    };
  };
}

interface HomeScreenProps {
  isActive?: boolean;
}

export default function HomeScreen({ isActive = true }: HomeScreenProps) {
  // Contexts
  const { isConnected, refreshData } = useConnection();
  const {
    isConnected: wsConnected,
    connectionState: wsConnectionState,
    registerValues,
    watchRegister,
    unwatchRegister
  } = useWebSocket();
  const { theme, isDarkMode } = useAppTheme();
  const paperTheme = useTheme() as AppTheme;
  const { isLandscape, screenWidth, numColumns: orientationNumColumns, isTablet } = useOrientation();
  
  // Screen dimensions
  const { width, height } = useWindowDimensions();
  
  // Calculate number of columns for widgets based on orientation and device type
  // Use OrientationContext's numColumns directly for tablets (already optimized)
  // For phones, use optimized values:
  // Phone Portrait: 1 column (full width)
  // Phone Landscape: 2 columns
  // Tablet Portrait (810x1080): 2 columns (from OrientationContext)
  // Tablet Landscape (1080x810): 3 columns (from OrientationContext)
  const numColumns = isTablet 
    ? orientationNumColumns  // Use OrientationContext's optimized value for tablets
    : (isLandscape ? 2 : 1); // Phone: 2 columns landscape, 1 column portrait
  
  // Calculate system card width and columns for system health cards
  // Tablet Landscape: 2 columns
  // Tablet Portrait: 1 column (full width for better readability)
  // Phone: 1 column (full width)
  const systemNumColumns = isTablet && isLandscape ? 2 : 1;
  // Calculate padding based on device type and orientation
  const horizontalPadding = isTablet ? (isLandscape ? 16 : 20) : 16;
  const cardGap = isTablet ? (isLandscape ? 16 : 12) : 12;
  const systemCardWidth = systemNumColumns > 1 
    ? (screenWidth - (horizontalPadding * 2) - (cardGap * (systemNumColumns - 1))) / systemNumColumns 
    : undefined;
  
  // States
  const [activeTab, setActiveTab] = useState<'overview' | 'system'>('overview');
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [widgets, setWidgets] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('Never');
  const [refreshInterval, setRefreshInterval] = useState(10);
  const [widgetsLoading, setWidgetsLoading] = useState(true);
  const [widgetValues, setWidgetValues] = useState<Map<string, any>>(new Map());
  const [draggedWidgetIndex, setDraggedWidgetIndex] = useState<number | undefined>(undefined);
  
  // Callbacks ref
  const callbacksMapRef = useRef(new Map<string, (value: any) => void>());

  // Load appropriate data based on active tab
  useEffect(() => {
    if (isConnected) {
      if (activeTab === 'overview') {
        loadWidgets();
      } else if (activeTab === 'system') {
        loadSystemInfo();
        const intervalId = setInterval(loadSystemInfo, refreshInterval * 1000);
        return () => clearInterval(intervalId);
      }
    }
  }, [activeTab, isConnected, refreshInterval]);

  // Load widgets data
  const loadWidgets = async () => {
    try {
      setWidgetsLoading(true);
      const data = await ApiService.getWidgets();
      
      // API'den gelen widget'ları almak
      let orderedWidgets = [...data];
      
      // Kayıtlı widget sıralamasını kontrol et
      try {
        const savedOrder = await AsyncStorage.getItem('widget_order');
        if (savedOrder) {
          const orderIds = JSON.parse(savedOrder);
          
          // Kaydedilmiş sıralamaya göre widget'ları düzenle
          if (Array.isArray(orderIds) && orderIds.length > 0) {
            // Mevcut widget'ların id'lerini kontrol et ve sırala
            const orderedWidgetsList: any[] = [];
            
            // Önce kayıtlı sıraya göre widget'ları ekle
            orderIds.forEach((id: string) => {
              const widget = data.find((w) => w._id === id);
              if (widget) {
                orderedWidgetsList.push(widget);
              }
            });
            
            // Kayıtlı sırada olmayan widget'ları sonuna ekle
            data.forEach(widget => {
              if (!orderIds.includes(widget._id)) {
                orderedWidgetsList.push(widget);
              }
            });
            
            if (orderedWidgetsList.length > 0) {
              orderedWidgets = orderedWidgetsList;
            }
          }
        }
      } catch (error) {
        console.log('Widget sıralaması yüklenirken hata:', error);
      }
      
      setWidgets(orderedWidgets);
      
      // Subscribe to widget registers via WebSocket - only when overview tab is active
      if (wsConnected && data.length > 0 && activeTab === 'overview' && isActive) {
        subscribeToWidgetRegisters(data);
      }
    } catch (error) {
      console.error('Error loading widgets:', error);
    } finally {
      setWidgetsLoading(false);
    }
  };

  // WebSocket subscriptions
  const subscribeToWidgetRegisters = (widgetList: any[]) => {
    console.log('[HomeScreen] Subscribing to widget registers');
    
    widgetList.forEach(widget => {
      if (widget.registers && Array.isArray(widget.registers)) {
        widget.registers.forEach((register: any) => {
          // Check existing callback
          let callback = callbacksMapRef.current.get(register.id);
          
          // Create new callback if needed
          if (!callback) {
            callback = (value: any) => {
              setWidgetValues(prev => {
                const newMap = new Map(prev);
                newMap.set(register.id, value);
                return newMap;
              });
            };
            
            // Store callback for later cleanup
            callbacksMapRef.current.set(register.id, callback);
            
            console.log(`[HomeScreen] Created new callback for register: ${register.id}`);
          }
          
          const registerKey = `${register.analyzerId}-${register.address}${register.bit !== undefined ? `-bit${register.bit}` : ''}`;
          console.log(`[HomeScreen] Watching register: ${registerKey}, id: ${register.id}`);

          watchRegister({
            analyzerId: register.analyzerId,
            address: register.address,
            dataType: register.dataType,
            bit: register.bit,
            registerId: register.id,
          }, callback);
        });
      }
    });
  };
  
  // Unsubscribe all widget registers
  const unsubscribeAllWidgetRegisters = () => {
    console.log('[HomeScreen] Unsubscribing from all widget registers');
    
    // Counters for callback tracking
    let beforeCount = callbacksMapRef.current.size;
    let unsubscribedCount = 0;
    
    // Clear all registered callbacks
    widgets.forEach(widget => {
      if (widget.registers && Array.isArray(widget.registers)) {
        widget.registers.forEach((register: any) => {
          const callback = callbacksMapRef.current.get(register.id);
          if (callback) {
            const registerKey = `${register.analyzerId}-${register.address}${register.bit !== undefined ? `-bit${register.bit}` : ''}`;
            console.log(`[HomeScreen] Unwatching widget register: ${registerKey}, id: ${register.id}`);
            
            unwatchRegister({
              analyzerId: register.analyzerId,
              address: register.address,
              dataType: register.dataType,
              bit: register.bit
            }, callback);
            
            // Remove callback from map
            callbacksMapRef.current.delete(register.id);
            unsubscribedCount++;
          }
        });
      }
    });
    
    // Clear real-time values
    setWidgetValues(new Map());
    
    console.log(`[HomeScreen] Unsubscribed ${unsubscribedCount} widgets. Before: ${beforeCount}, After: ${callbacksMapRef.current.size}`);
  };

  // Handle WebSocket connection and widget subscriptions
  useEffect(() => {
    if (wsConnected && widgets.length > 0 && activeTab === 'overview' && isActive) {
      console.log('[HomeScreen] Conditions met, subscribing to widget registers');
      subscribeToWidgetRegisters(widgets);
    }
    
    // Cleanup function
    return () => {
      if (activeTab === 'overview' || !isActive) {
        console.log('[HomeScreen] Cleanup triggered - unsubscribing from widget registers');
        unsubscribeAllWidgetRegisters();
      }
    };
  }, [wsConnected, widgets, activeTab, isActive, watchRegister]);
  
  // Manage register subscriptions when tab changes or screen becomes active/inactive
  useEffect(() => {
    console.log(`[HomeScreen] Tab: ${activeTab}, Active: ${isActive ? 'YES' : 'NO'}`);
    
    if (wsConnected) {
      if (isActive && activeTab === 'overview') {
        // Start monitoring registers when overview tab is active
        if (widgets.length > 0) {
          console.log('[HomeScreen] Tab is overview and screen is active, subscribing to widget registers');
          subscribeToWidgetRegisters(widgets);
        }
      } else {
        // Stop monitoring when leaving overview tab or screen becomes inactive
        console.log(`[HomeScreen] Tab is ${activeTab} or screen is inactive, unsubscribing from widget registers`);
        unsubscribeAllWidgetRegisters();
      }
    }
    
    // Cleanup on unmount
    return () => {
      if (!isActive || activeTab !== 'overview') {
        console.log('[HomeScreen] Component cleanup - unsubscribing all widget registers');
        unsubscribeAllWidgetRegisters();
      }
    };
  }, [activeTab, isActive, wsConnected, widgets.length, unwatchRegister]);

  // Load system information
  const loadSystemInfo = async () => {
    try {
      const data = await ApiService.getSystemInfo();
      if (data) {
        setSystemInfo(data as any);
        setLastUpdate(new Date().toLocaleTimeString());
      }
    } catch (error) {
      console.error('Error loading system info:', error);
    }
  };

  // Handle pull-to-refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (activeTab === 'overview') {
        await loadWidgets();
      } else {
        await loadSystemInfo();
      }
      setLastUpdate(new Date().toLocaleTimeString());
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Widget sürükleme başladığında çağrılır
  const handleWidgetLongPress = useCallback((index: number) => {
    setDraggedWidgetIndex(index);
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
    
    // Widget'ların yeni sıralamasını güncelleme
    setWidgets(newWidgets);
    
    // Yeni sıralamayı kalıcı olarak kaydetme
    try {
      const widgetOrder = newWidgets.map(widget => widget._id);
      await AsyncStorage.setItem('widget_order', JSON.stringify(widgetOrder));
    } catch (error) {
      console.error('Widget sıralaması kaydedilirken hata:', error);
    }
    
    // Sürüklemeyi sonlandırma
    setDraggedWidgetIndex(undefined);
  }, [draggedWidgetIndex, widgets]);

  // Format bytes to human-readable format
  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + " " + sizes[i];
  };

  // Format seconds to days, hours, minutes
  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  // Render the Overview tab content
  const renderOverviewContent = () => {
    if (widgetsLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={paperTheme.colors.primary} />
          <Text variant="bodyLarge" style={styles.loadingText}>Loading widgets...</Text>
        </View>
      );
    }

    if (widgets.length === 0) {
      return (
        <View style={styles.emptyWidgetsContainer}>
          <GradientCard
            colors={isDarkMode ? ['#263238', '#37474F'] : ['#E3F2FD', '#BBDEFB']}
            style={styles.emptyCard}
          >
            <View style={styles.emptyContent}>
              <MaterialCommunityIcons
                name="view-dashboard-outline"
                size={80}
                color={isDarkMode ? '#64B5F6' : '#1976D2'}
              />
              <Text variant="headlineSmall" style={[styles.emptyWidgetsText, { color: isDarkMode ? '#E3F2FD' : '#0D47A1' }]}>
                No widgets configured
              </Text>
              <Text variant="bodyLarge" style={[styles.emptyWidgetsSubtext, { color: isDarkMode ? '#B3E5FC' : '#01579B' }]}>
                Add widgets from the web dashboard to monitor your registers in real-time
              </Text>
            </View>
          </GradientCard>
        </View>
      );
    }

    // Calculate padding and gap for widgets container based on device type
    const containerPadding = isTablet ? (isLandscape ? 16 : 20) : 16;
    const widgetGap = isTablet ? (isLandscape ? 16 : 12) : 12;
    
    return (
      <View style={[
        styles.widgetsContainer,
        numColumns > 1 ? styles.widgetsContainerLandscape : undefined,
        {
          paddingHorizontal: containerPadding,
          gap: numColumns > 1 ? widgetGap : undefined,
        }
      ]}>
        {widgets.map((widget, index) => (
          <WidgetCard
            key={widget._id}
            id={widget._id}
            title={widget.title}
            registers={
              widget.registers && Array.isArray(widget.registers)
                ? widget.registers.map((register: any) => {
                    const realTimeValue = widgetValues.get(register.id);
                    let displayValue = realTimeValue !== undefined ? realTimeValue : (register.value || 'N/A');
                    
                    // Boolean değerleri ON/OFF'e çevir
                    if (displayValue !== 'N/A' && displayValue !== null && displayValue !== undefined) {
                      const isBooleanType = register.dataType?.toUpperCase() === 'BOOL' || 
                                            register.dataType?.toUpperCase() === 'BOOLEAN';
                      
                      const isBooleanValue = displayValue === 1 || displayValue === 0 || 
                                             displayValue === true || displayValue === false ||
                                             displayValue === '1' || displayValue === '0' ||
                                             displayValue === 'true' || displayValue === 'false';
                      
                      if (isBooleanType || isBooleanValue) {
                        if (displayValue === 1 || displayValue === true || displayValue === '1' || displayValue === 'true') {
                          displayValue = 'ON';
                        } else if (displayValue === 0 || displayValue === false || displayValue === '0' || displayValue === 'false') {
                          displayValue = 'OFF';
                        }
                      }
                    }
                    
                    const isLive = realTimeValue !== undefined;
                    
                    return {
                      id: register.id,
                      label: register.label,
                      value: displayValue,
                      scaleUnit: register.scaleUnit,
                      isLive
                    };
                  })
                : []
            }
            onLongPress={() => handleWidgetLongPress(index)}
            onPress={() => handleWidgetPress(index)}
            isBeingDragged={draggedWidgetIndex === index}
            draggedIndex={draggedWidgetIndex}
            myIndex={index}
            onDrop={handleWidgetDrop}
          />
        ))}
      </View>
    );
  };

  // Render the System Health tab content
  const renderSystemContent = () => {
    // Calculate padding and gap for system health container based on device type
    const systemContainerPadding = isTablet ? (isLandscape ? 16 : 20) : 16;
    const systemCardGap = isTablet ? (isLandscape ? 16 : 12) : 12;
    
    return (
      <View style={[
        styles.systemHealthContainer,
        isLandscape ? styles.systemHealthContainerLandscape : undefined,
        {
          paddingHorizontal: systemContainerPadding,
          gap: isLandscape && systemNumColumns > 1 ? systemCardGap : undefined,
        }
      ]}>
        {/* Connection Status Card */}
        <View style={systemCardWidth ? { width: systemCardWidth, marginBottom: 0 } : undefined}>
          <StatusCard
            title="Connection Status"
            status={isConnected}
            subtitle={`WebSocket: ${wsConnectionState.charAt(0).toUpperCase() + wsConnectionState.slice(1)}`}
            lastUpdate={lastUpdate}
            additionalInfo={`Real-time Values: ${registerValues.size} active`}
          />
        </View>
        
        {/* Refresh Controls */}
        <View style={[
          styles.refreshControlsWrapper,
          systemCardWidth ? { width: systemCardWidth, marginBottom: 0 } : undefined
        ]}>
          <GradientCard
            colors={isDarkMode ? ['#263238', '#37474F'] : ['#E3F2FD', '#BBDEFB']}
            style={styles.refreshControlsCard}
            mode="elevated"
          >
            <View style={styles.refreshControlsContent}>
              <View style={styles.refreshHeader}>
                <MaterialCommunityIcons
                  name="refresh-circle"
                  size={24}
                  color={isDarkMode ? '#64B5F6' : '#1976D2'}
                  style={styles.refreshIcon}
                />
                <Text variant="titleMedium" style={[styles.refreshTitle, { color: isDarkMode ? '#E3F2FD' : '#0D47A1' }]}>
                  Auto-refresh Settings
                </Text>
              </View>
              
              <View style={styles.segmentedButtonsWrapper}>
                <SegmentedButtons
                  value={refreshInterval.toString()}
                  onValueChange={value => setRefreshInterval(parseInt(value))}
                  buttons={[
                    {
                      value: '5',
                      label: '5s',
                      icon: 'timer-sand',
                    },
                    {
                      value: '10',
                      label: '10s',
                      icon: 'timer',
                    },
                    {
                      value: '30',
                      label: '30s',
                      icon: 'timer-outline',
                    },
                  ]}
                  style={[
                    styles.segmentedButtons,
                    { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
                  ]}
                  density="regular"
                />
              </View>
              
              <View style={styles.lastUpdateContainer}>
                <MaterialCommunityIcons
                  name="clock-check-outline"
                  size={16}
                  color={isDarkMode ? '#90CAF9' : '#1565C0'}
                  style={styles.clockIcon}
                />
                <Text variant="bodySmall" style={[styles.lastUpdateText, { color: isDarkMode ? '#B3E5FC' : '#01579B' }]}>
                  Last update: {lastUpdate}
                </Text>
              </View>
            </View>
          </GradientCard>
        </View>

        {/* System Overview Card */}
        <View style={systemCardWidth ? { width: systemCardWidth, marginBottom: 0 } : undefined}>
          <DataCard
            title="System Overview"
            data={systemInfo?.system
              ? [
                  { id: 'platform', label: 'Platform', value: systemInfo.system.platform },
                  { id: 'hostname', label: 'Hostname', value: systemInfo.system.hostname },
                  { id: 'cpu', label: 'CPU Cores', value: systemInfo.system.cpuCount },
                  { id: 'uptime', label: 'Uptime', value: formatUptime(systemInfo.system.uptime) },
                ]
              : []}
            icon="server"
            onRefresh={() => loadSystemInfo()}
            isLoading={isRefreshing}
          />
        </View>

        {/* Memory Usage Card */}
        <View style={systemCardWidth ? { width: systemCardWidth, marginBottom: 0 } : undefined}>
          <DataCard
            title="Memory Usage"
            data={systemInfo?.system
              ? [
                  { id: 'total', label: 'Total Memory', value: systemInfo.system.totalMemory, unit: 'GB' },
                  { id: 'used', label: 'Used Memory', value: systemInfo.system.usedMemory, unit: 'GB' },
                  { id: 'free', label: 'Free Memory', value: systemInfo.system.freeMemory, unit: 'GB' },
                  { id: 'usage', label: 'Usage', value: systemInfo.system.memoryUsagePercent, unit: '%' },
                ]
              : []}
            icon="memory"
            onRefresh={() => loadSystemInfo()}
            isLoading={isRefreshing}
            gradientColors={['#9C27B0', '#BA68C8']}
          />
        </View>

        {/* MongoDB Overview Card */}
        <View style={systemCardWidth ? { width: systemCardWidth, marginBottom: 0 } : undefined}>
          <DataCard
            title="MongoDB Overview"
            data={systemInfo?.mongodb?.dbStats
              ? [
                  { id: 'db', label: 'Database', value: systemInfo.mongodb.dbStats.db },
                  { id: 'collections', label: 'Collections', value: systemInfo.mongodb.dbStats.collections },
                  { id: 'documents', label: 'Documents', value: systemInfo.mongodb.dbStats.objects.toLocaleString() },
                  { id: 'size', label: 'Data Size', value: formatBytes(systemInfo.mongodb.dbStats.dataSize * 1024 * 1024) },
                ]
              : []}
            icon="database"
            onRefresh={() => loadSystemInfo()}
            isLoading={isRefreshing}
            gradientColors={['#FF6F00', '#FFA726']}
          />
        </View>

        {/* Top Collections Card */}
        {systemInfo?.mongodb?.collectionStats && systemInfo.mongodb.collectionStats.length > 0 && (
          <View style={systemCardWidth ? { width: systemCardWidth, marginBottom: 0 } : undefined}>
            <DataCard
              title="Top Collections"
              data={systemInfo.mongodb.collectionStats
                .sort((a, b) => b.count - a.count)
                .slice(0, 5)
                .map(collection => ({
                  id: collection.name,
                  label: collection.name,
                  value: collection.count.toLocaleString()
                }))}
              icon="folder-multiple"
              gradientColors={['#00BCD4', '#4DD0E1']}
            />
          </View>
        )}
      </View>
    );
  };
  
  // Render the main tab navigation
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: paperTheme.colors.background }]} edges={[]}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('overview')}
          activeOpacity={0.7}
        >
          <IconButton
            icon="view-dashboard-outline"
            iconColor={activeTab === 'overview' ? paperTheme.colors.primary : paperTheme.colors.onSurfaceVariant}
            size={24}
            onPress={() => setActiveTab('overview')}
            mode={activeTab === 'overview' ? 'contained' : 'outlined'}
            containerColor={activeTab === 'overview' ? paperTheme.colors.primaryContainer : undefined}
            style={styles.tabButton}
          />
          <Text style={[
            styles.tabLabel,
            { color: activeTab === 'overview' ? paperTheme.colors.primary : paperTheme.colors.onSurfaceVariant }
          ]}>
            Overview
          </Text>
        </TouchableOpacity>

        <View style={styles.tabSpacer} />

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('system')}
          activeOpacity={0.7}
        >
          <IconButton
            icon="server"
            iconColor={activeTab === 'system' ? paperTheme.colors.primary : paperTheme.colors.onSurfaceVariant}
            size={24}
            onPress={() => setActiveTab('system')}
            mode={activeTab === 'system' ? 'contained' : 'outlined'}
            containerColor={activeTab === 'system' ? paperTheme.colors.primaryContainer : undefined}
            style={styles.tabButton}
          />
          <Text style={[
            styles.tabLabel,
            { color: activeTab === 'system' ? paperTheme.colors.primary : paperTheme.colors.onSurfaceVariant }
          ]}>
            System Health
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab content with simple ScrollView */}
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={false}
      >
        {activeTab === 'overview' ? renderOverviewContent() : renderSystemContent()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 0,
  },
  tabContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabButton: {
    margin: 0,
  },
  tabLabel: {
    marginLeft: 4,
    fontWeight: '500',
  },
  tabSpacer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    minHeight: 300,
  },
  loadingText: {
    marginTop: 10,
    opacity: 0.7,
  },
  widgetsContainer: {
    paddingTop: 16,
    paddingBottom: 16,
  },
  widgetsContainerLandscape: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  emptyWidgetsContainer: {
    padding: 16,
    justifyContent: 'center',
    minHeight: 400,
  },
  emptyCard: {
    elevation: 4,
  },
  emptyContent: {
    padding: 48,
    alignItems: 'center',
  },
  emptyWidgetsText: {
    marginTop: 24,
    marginBottom: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyWidgetsSubtext: {
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  systemHealthContainer: {
    paddingTop: 16,
    paddingBottom: 16,
  },
  systemHealthContainerLandscape: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  refreshControlsWrapper: {
    marginBottom: 16,
  },
  refreshControlsCard: {
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  refreshControlsContent: {
    padding: 0,
  },
  refreshHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  refreshIcon: {
    marginRight: 8,
  },
  refreshTitle: {
    fontWeight: '600',
  },
  segmentedButtonsWrapper: {
    marginBottom: 16,
  },
  segmentedButtons: {
    borderRadius: 12,
  },
  lastUpdateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.2)',
  },
  clockIcon: {
    marginRight: 6,
  },
  lastUpdateText: {
    fontWeight: '500',
  },
});