import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, RefreshControl, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  Surface,
  Text,
  useTheme,
  ActivityIndicator,
  SegmentedButtons,
  IconButton,
  Divider,
  Card,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScrollView } from 'react-native-gesture-handler';

// Components
import StatusCard from '../components/StatusCard';
import DataCard from '../components/DataCard';
import WidgetCard from '../components/WidgetCard';
import GradientCard from '../components/GradientCard';

// Contexts
import { useConnection } from '../context/ConnectionContext';
import { useWebSocket } from '../context/WebSocketContext';
import { useTheme as useAppTheme } from '../context/ThemeContext';

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
  
  // Screen dimensions
  const { width } = useWindowDimensions();
  
  // States
  const [activeTab, setActiveTab] = useState<'overview' | 'system'>('overview');
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [widgets, setWidgets] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('Never');
  const [refreshInterval, setRefreshInterval] = useState(10);
  const [widgetsLoading, setWidgetsLoading] = useState(true);
  const [widgetValues, setWidgetValues] = useState<Map<string, any>>(new Map());
  
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
      setWidgets(data);
      
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
  const OverviewTabScreen = () => {
    return (
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        {/* When widgets are loading */}
        {widgetsLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={paperTheme.colors.primary} />
            <Text variant="bodyLarge" style={styles.loadingText}>Loading widgets...</Text>
          </View>
        ) : widgets.length === 0 ? (
          // When no widgets exist
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
        ) : (
          // Format widgets for display
          <View style={styles.widgetsContainer}>
            {widgets.map((widget) => (
              <WidgetCard
                key={widget._id}
                id={widget._id}
                title={widget.title}
                registers={
                  widget.registers && Array.isArray(widget.registers)
                    ? widget.registers.map((register: any) => {
                        const realTimeValue = widgetValues.get(register.id);
                        const displayValue = realTimeValue !== undefined ? realTimeValue : (register.value || 'N/A');
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
              />
            ))}
          </View>
        )}
      </ScrollView>
    );
  };

  // Render the System Health tab content
  const SystemHealthTabScreen = () => {
    return (
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.systemHealthContainer}>
          {/* Connection Status Card */}
          <StatusCard
            title="Connection Status"
            status={isConnected}
            subtitle={`WebSocket: ${wsConnectionState.charAt(0).toUpperCase() + wsConnectionState.slice(1)}`}
            lastUpdate={lastUpdate}
            additionalInfo={`Real-time Values: ${registerValues.size} active`}
          />
          
          {/* Refresh Controls */}
          <View style={styles.refreshControlsWrapper}>
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

          {/* Memory Usage Card */}
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

          {/* MongoDB Overview Card */}
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

          {/* Top Collections Card */}
          {systemInfo?.mongodb?.collectionStats && systemInfo.mongodb.collectionStats.length > 0 && (
            <DataCard
              title="Top Collections"
              data={systemInfo.mongodb.collectionStats
                .sort((a, b) => b.count - a.count)
                .slice(0, 5)
                .map(collection => ({
                  id: collection.name,
                  label: collection.name,
                  value: collection.count.toLocaleString(),
                  unit: `(${formatBytes(collection.size * 1024 * 1024)})`
                }))}
              icon="folder-multiple"
              gradientColors={['#00BCD4', '#4DD0E1']}
            />
          )}
        </View>
      </ScrollView>
    );
  };
  
  // Render the main tab navigation
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: paperTheme.colors.background }]} edges={['bottom']}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />

      <View style={styles.tabContainer}>
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

        <View style={styles.tabSpacer} />

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
      </View>

      {/* Tab content */}
      {activeTab === 'overview' ? <OverviewTabScreen /> : <SystemHealthTabScreen />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.2)',
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
  },
  loadingText: {
    marginTop: 10,
    opacity: 0.7,
  },
  widgetsContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  emptyWidgetsContainer: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
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
    padding: 16,
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
  widgetCard: {
    marginBottom: 16,
    borderRadius: 12,
  },
  widgetTitle: {
    fontWeight: '600',
  },
  registersContainer: {
    marginTop: 8,
  },
  registerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  registerLabel: {
    flex: 1,
    paddingRight: 8,
  },
  registerValue: {
    fontWeight: '600',
    textAlign: 'right',
  },
  noRegistersText: {
    textAlign: 'center',
    padding: 16,
    opacity: 0.6,
  },
});