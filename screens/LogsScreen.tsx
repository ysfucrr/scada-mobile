import { MaterialCommunityIcons } from '@expo/vector-icons';
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
  View
} from 'react-native';
import { useTheme as usePaperTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

// Components
import AnalyzerCard from '../components/AnalyzerCard';
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

  // Default analyzer view
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
        data={Array.from(groupedLogs.entries())}
        renderItem={({ item }) => {
          const [analyzerId, analyzerLogs] = item;
          const firstLog = analyzerLogs[0];
          
          return (
            <AnalyzerCard
              analyzerId={analyzerId}
              analyzerName={firstLog.analyzerName}
              buildingName={firstLog.buildingName}
              stats={getAnalyzerStats(analyzerId)}
              onPress={() => handleAnalyzerSelect(analyzerId)}
            />
          );
        }}
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