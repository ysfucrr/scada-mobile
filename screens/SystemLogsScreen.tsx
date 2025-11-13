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
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  Modal
} from 'react-native';
import { ActivityIndicator, Card, Chip, useTheme as usePaperTheme } from 'react-native-paper';
import GradientCard from '../components/GradientCard';
import { useConnection } from '../context/ConnectionContext';
import { useTheme as useAppTheme } from '../context/ThemeContext';
import ApiService from '../services/ApiService';

interface LogMessage {
  timestamp: string;
  level: 'ERROR' | 'WARNING' | 'INFO' | 'DEBUG';
  message: string;
  source: string;
  details?: Record<string, unknown> | null;
}

interface SystemLogsResponse {
  logs: LogMessage[];
  total: number;
  filtered: number;
  returned: number;
}

type LogLevel = 'ALL' | 'ERROR' | 'WARNING' | 'INFO' | 'DEBUG';

const POLL_INTERVAL = 3000; // 3 saniyede bir güncelle

export default function SystemLogsScreen() {
  const paperTheme = usePaperTheme();
  const { isDarkMode } = useAppTheme();
  const { isConnected } = useConnection();
  
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<{
    level: LogLevel;
    source: string;
    search: string;
  }>({
    level: 'ALL',
    source: '',
    search: ''
  });
  const [isPaused, setIsPaused] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLog, setSelectedLog] = useState<LogMessage | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
      loadLogs();
      if (!isPaused) {
        startPolling();
      }
    } else {
      setLogs([]);
      setIsLoading(false);
    }

    return () => {
      stopPolling();
    };
  }, [isConnected]);

  useEffect(() => {
    if (!isPaused && isConnected) {
      startPolling();
    } else {
      stopPolling();
    }
  }, [isPaused, filter, isConnected]);

  const startPolling = () => {
    stopPolling();
    if (isPaused) return;
    
    pollIntervalRef.current = setInterval(() => {
      loadLogs(true);
    }, POLL_INTERVAL);
  };

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  const loadLogs = async (silent: boolean = false) => {
    try {
      if (!silent) {
        setIsLoading(true);
      }
      
      const response = await ApiService.getSystemLogs({
        level: filter.level !== 'ALL' ? filter.level : undefined,
        source: filter.source || undefined,
        search: filter.search || undefined,
        limit: 500, // Son 500 log
      });
      
      if (response && response.logs) {
        setLogs(response.logs);
      }
    } catch (error) {
      console.error('Error loading system logs:', error);
      if (!silent) {
        Alert.alert(
          'Error',
          'Failed to load system logs. Please check your connection.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
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
    await loadLogs();
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const formatDate = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  };

  const getLevelColor = (level: string): string => {
    switch (level) {
      case 'ERROR': return '#F44336';
      case 'WARNING': return '#FF9800';
      case 'INFO': return '#2196F3';
      case 'DEBUG': return '#757575';
      default: return '#757575';
    }
  };

  const getLevelIcon = (level: string): string => {
    switch (level) {
      case 'ERROR': return 'alert-circle';
      case 'WARNING': return 'alert';
      case 'INFO': return 'information';
      case 'DEBUG': return 'bug';
      default: return 'information';
    }
  };

  const renderLogItem = ({ item, index }: { item: LogMessage; index: number }) => {
    const levelColor = getLevelColor(item.level);
    const isToday = formatDate(item.timestamp) === formatDate(new Date().toISOString());
    
    return (
      <TouchableOpacity
        onPress={() => {
          if (item.details) {
            setSelectedLog(item);
            setShowDetailsModal(true);
          }
        }}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.logItem,
            {
              backgroundColor: paperTheme.colors.surface,
              borderLeftColor: levelColor,
              borderLeftWidth: 4,
            }
          ]}
        >
          <View style={styles.logHeader}>
            <View style={[styles.levelBadge, { backgroundColor: `${levelColor}20` }]}>
              <MaterialCommunityIcons
                name={getLevelIcon(item.level) as any}
                size={16}
                color={levelColor}
              />
              <Text style={[styles.levelText, { color: levelColor }]}>
                {item.level}
              </Text>
            </View>
            <Text style={[styles.timestamp, { color: paperTheme.colors.onSurfaceVariant }]}>
              {isToday ? formatTimestamp(item.timestamp) : formatDate(item.timestamp)}
            </Text>
          </View>
          
          <View style={styles.logContent}>
            <Text style={[styles.sourceText, { color: paperTheme.colors.primary }]}>
              {item.source}
            </Text>
            <Text style={[styles.messageText, { color: paperTheme.colors.onSurface }]} numberOfLines={2}>
              {item.message}
            </Text>
          </View>
          
          {item.details && (
            <View style={styles.detailsIndicator}>
              <MaterialCommunityIcons
                name="code-json"
                size={14}
                color={paperTheme.colors.onSurfaceVariant}
              />
              <Text style={[styles.detailsText, { color: paperTheme.colors.onSurfaceVariant }]}>
                Tap to view details
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
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

  return (
    <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      
      {/* Header Controls */}
      <View style={[styles.headerControls, { backgroundColor: paperTheme.colors.surface }]}>
        <View style={styles.controlsRow}>
          <TouchableOpacity
            onPress={togglePause}
            style={[
              styles.controlButton,
              { backgroundColor: isPaused ? '#4CAF50' : '#FF9800' }
            ]}
          >
            <MaterialCommunityIcons
              name={isPaused ? 'play' : 'pause'}
              size={20}
              color="#FFFFFF"
            />
            <Text style={styles.controlButtonText}>
              {isPaused ? 'Resume' : 'Pause'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => setShowFilters(!showFilters)}
            style={[
              styles.controlButton,
              { backgroundColor: paperTheme.colors.primary }
            ]}
          >
            <MaterialCommunityIcons
              name="filter"
              size={20}
              color="#FFFFFF"
            />
            <Text style={styles.controlButtonText}>Filters</Text>
          </TouchableOpacity>
        </View>
        
        {showFilters && (
          <View style={[styles.filtersContainer, { backgroundColor: paperTheme.colors.surfaceVariant }]}>
            {/* Level Filter */}
            <View style={styles.filterRow}>
              <Text style={[styles.filterLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                Level:
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chipContainer}>
                  {(['ALL', 'ERROR', 'WARNING', 'INFO', 'DEBUG'] as LogLevel[]).map((level) => (
                    <TouchableOpacity
                      key={level}
                      onPress={() => setFilter({ ...filter, level })}
                      style={[
                        styles.filterChip,
                        filter.level === level && {
                          backgroundColor: paperTheme.colors.primary,
                        }
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          filter.level === level && { color: '#FFFFFF' }
                        ]}
                      >
                        {level}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
            
            {/* Source Filter */}
            <View style={styles.filterInputContainer}>
              <Text style={[styles.filterLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                Source:
              </Text>
              <TextInput
                style={[
                  styles.filterInput,
                  {
                    backgroundColor: paperTheme.colors.surface,
                    color: paperTheme.colors.onSurface,
                    borderColor: paperTheme.colors.outline,
                  }
                ]}
                value={filter.source}
                onChangeText={(text) => setFilter({ ...filter, source: text })}
                placeholder="Filter by source"
                placeholderTextColor={paperTheme.colors.onSurfaceVariant}
              />
            </View>
            
            {/* Search Filter */}
            <View style={styles.filterInputContainer}>
              <Text style={[styles.filterLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                Search:
              </Text>
              <TextInput
                style={[
                  styles.filterInput,
                  {
                    backgroundColor: paperTheme.colors.surface,
                    color: paperTheme.colors.onSurface,
                    borderColor: paperTheme.colors.outline,
                  }
                ]}
                value={filter.search}
                onChangeText={(text) => setFilter({ ...filter, search: text })}
                placeholder="Search in logs"
                placeholderTextColor={paperTheme.colors.onSurfaceVariant}
              />
            </View>
          </View>
        )}
        
        <View style={styles.statsRow}>
          <Text style={[styles.statsText, { color: paperTheme.colors.onSurfaceVariant }]}>
            {logs.length} logs
          </Text>
          <View style={[styles.statusIndicator, { backgroundColor: isPaused ? '#FF9800' : '#4CAF50' }]} />
          <Text style={[styles.statsText, { color: paperTheme.colors.onSurfaceVariant }]}>
            {isPaused ? 'Paused' : 'Live'}
          </Text>
        </View>
      </View>
      
      {/* Logs List */}
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }
        ]}
      >
        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={paperTheme.colors.primary} />
            <Text style={[styles.loadingText, { color: paperTheme.colors.onSurface }]}>
              Loading logs...
            </Text>
          </View>
        ) : logs.length === 0 ? (
          <View style={styles.centerContainer}>
            <MaterialCommunityIcons
              name="file-document-outline"
              size={64}
              color={paperTheme.colors.onSurfaceVariant}
            />
            <Text style={[styles.emptyText, { color: paperTheme.colors.onSurface }]}>
              No logs found
            </Text>
            <Text style={[styles.emptySubtext, { color: paperTheme.colors.onSurfaceVariant }]}>
              {filter.level !== 'ALL' || filter.source || filter.search
                ? 'Try adjusting your filters'
                : 'Logs will appear here when available'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={logs}
            keyExtractor={(item, index) => `${item.timestamp}-${index}`}
            renderItem={renderLogItem}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                colors={[paperTheme.colors.primary]}
                tintColor={paperTheme.colors.primary}
              />
            }
            contentContainerStyle={styles.listContent}
            inverted={false}
          />
        )}
      </Animated.View>
      
      {/* Details Modal */}
      <Modal
        visible={showDetailsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDetailsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: paperTheme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: paperTheme.colors.onSurface }]}>
                Log Details
              </Text>
              <TouchableOpacity
                onPress={() => setShowDetailsModal(false)}
                style={styles.modalCloseButton}
              >
                <MaterialCommunityIcons
                  name="close"
                  size={24}
                  color={paperTheme.colors.onSurface}
                />
              </TouchableOpacity>
            </View>
            
            {selectedLog && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                    Level:
                  </Text>
                  <Text style={[styles.detailValue, { color: getLevelColor(selectedLog.level) }]}>
                    {selectedLog.level}
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                    Source:
                  </Text>
                  <Text style={[styles.detailValue, { color: paperTheme.colors.onSurface }]}>
                    {selectedLog.source}
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                    Timestamp:
                  </Text>
                  <Text style={[styles.detailValue, { color: paperTheme.colors.onSurface }]}>
                    {new Date(selectedLog.timestamp).toLocaleString()}
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                    Message:
                  </Text>
                  <Text style={[styles.detailValue, { color: paperTheme.colors.onSurface }]}>
                    {selectedLog.message}
                  </Text>
                </View>
                
                {selectedLog.details && (
                  <View style={styles.detailSection}>
                    <Text style={[styles.detailLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                      Details:
                    </Text>
                    <View style={[styles.jsonContainer, { backgroundColor: paperTheme.colors.surfaceVariant }]}>
                      <Text style={[styles.jsonText, { color: paperTheme.colors.onSurface }]}>
                        {JSON.stringify(selectedLog.details, null, 2)}
                      </Text>
                    </View>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
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
  headerControls: {
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  controlButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  controlButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  filtersContainer: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  filterRow: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  filterInputContainer: {
    marginBottom: 12,
  },
  filterInput: {
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statsText: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  listContent: {
    padding: 16,
  },
  logItem: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  levelText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timestamp: {
    fontSize: 11,
    fontWeight: '500',
  },
  logContent: {
    marginBottom: 8,
  },
  sourceText: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  detailsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  detailsText: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalCloseButton: {
    padding: 8,
  },
  modalBody: {
    padding: 20,
  },
  detailRow: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 14,
    lineHeight: 20,
  },
  detailSection: {
    marginTop: 8,
  },
  jsonContainer: {
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  jsonText: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
});

