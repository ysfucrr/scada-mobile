import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, useCallback } from 'react';
import {
  BackHandler,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  withSpring,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import SwipeGestureRecognizer from 'react-native-swipe-gestures';
import {
  ActivityIndicator,
  Button,
  Dialog,
  Divider,
  IconButton,
  Text as PaperText,
  Portal,
  Surface,
  useTheme
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

// Components
import LogEntryCard from '../components/LogEntryCard';

// Contexts
import { useConnection } from '../context/ConnectionContext';
import { useTheme as useAppTheme } from '../context/ThemeContext';

// Services
import ApiService from '../services/ApiService';
import { TrendLogData } from './LogsScreen';

// Types
import { AppTheme } from '../theme/theme';

interface LogEntry {
  _id: string;
  value: number;
  timestamp: string;
  timestampMs: number;
}

// Compact format definition [timestamp, value]
type CompactLogEntry = [number, number];

interface LogEntriesScreenProps {
  trendLog: TrendLogData;
  onBack: () => void;
  onTitleChange?: (title: string | null) => void;
}

export default function LogEntriesScreen({ trendLog, onBack, onTitleChange }: LogEntriesScreenProps) {
  const { isConnected } = useConnection();
  const { theme, isDarkMode } = useAppTheme();
  const paperTheme = useTheme() as AppTheme;
  
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Android back button handler
  useEffect(() => {
    if (Platform.OS === 'android') {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        onBack();
        return true;
      });

      return () => backHandler.remove();
    }
  }, [onBack]);

  // Swipe gesture handlers
  const onSwipeRight = useCallback(() => {
    if (Platform.OS === 'ios') {
      onBack();
    }
  }, [onBack]);
  
  // Dialog state
  const [errorDialogVisible, setErrorDialogVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [noDataDialogVisible, setNoDataDialogVisible] = useState(false);
  const [missingStartDateDialogVisible, setMissingStartDateDialogVisible] = useState(false);
  
  // Date filtering states
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [isSelectingStartDate, setIsSelectingStartDate] = useState(true);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Scroll animation for filter section
  const scrollY = useSharedValue(0);
  const lastScrollY = useSharedValue(0);
  const filterTranslateY = useSharedValue(0);
  const targetTranslateY = useSharedValue(0);
  
  // Load log entries
  const loadEntries = async () => {
    try {
      let options: any = {};
      
      // Include date range if selected
      if (startDate) {
        options.startDate = startDate.toISOString();
      }
      
      if (endDate) {
        options.endDate = endDate.toISOString();
      }
      
      const data = await ApiService.getTrendLogEntries(trendLog._id, options);
      
      if (data && data.success) {
        // Process compact format if available
        if (data.dataFormat === "compact" && Array.isArray(data.entries)) {
          // Convert compact format to standard format
          const processedEntries: LogEntry[] = data.entries.map((entry: CompactLogEntry, index: number) => {
            const timestamp = new Date(entry[0]);
            return {
              _id: `entry-${index}-${entry[0]}`, // Create unique ID
              value: entry[1],
              timestamp: timestamp.toISOString(),
              timestampMs: entry[0]
            };
          });
          
          // Sort by timestamp (newest first)
          const sortedEntries = processedEntries.sort((a: LogEntry, b: LogEntry) => b.timestampMs - a.timestampMs);
          setEntries(sortedEntries);
        }
        // Support legacy format as well
        else if (data.entries) {
          const sortedEntries = data.entries.sort((a: LogEntry, b: LogEntry) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
          setEntries(sortedEntries);
        } else {
          setEntries([]);
        }
      } else {
        setEntries([]);
      }
    } catch (error) {
      console.error('Error loading log entries:', error);
      setErrorMessage('Failed to load log entries. Please check your connection.');
      setErrorDialogVisible(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    
    if (!dataLoaded) {
      setNoDataDialogVisible(true);
      setIsRefreshing(false);
      return;
    }
    
    await loadEntries();
    setIsRefreshing(false);
  };
  
  // Apply date filter
  const applyDateFilter = () => {
    // Close date picker
    setDatePickerVisible(false);
  };
  
  // Load entries based on date range
  const searchByDateRange = () => {
    if (!startDate) {
      setMissingStartDateDialogVisible(true);
      return;
    }
    
    // Set end date to end of day if not provided
    let effectiveEndDate = endDate;
    if (!effectiveEndDate && startDate) {
      effectiveEndDate = new Date(startDate);
      effectiveEndDate.setHours(23);
      effectiveEndDate.setMinutes(59);
      effectiveEndDate.setSeconds(59);
      setEndDate(effectiveEndDate);
    }
    
    // Log search params
    console.log("Search with date range:", {
      startDate: startDate ? startDate.toISOString() : null,
      endDate: effectiveEndDate ? effectiveEndDate.toISOString() : null
    });
    
    setIsLoading(true);
    loadEntries().then(() => {
      setDataLoaded(true);
      setIsLoading(false);
    });
  };

  // Helper functions for date selection
  const formatDate = (date: Date | null): string => {
    if (!date) return 'Not Selected';
    return date.toLocaleDateString();
  };
  
  const showDatePicker = (isStart: boolean) => {
    setIsSelectingStartDate(isStart);
    setDatePickerVisible(true);
  };
  
  const handleDateSelect = (date: Date) => {
    // Set hours for start/end dates
    if (isSelectingStartDate) {
      // Start date: beginning of day (00:00:00)
      date.setHours(0);
      date.setMinutes(0);
      date.setSeconds(0);
      setStartDate(date);
    } else {
      // End date: end of day (23:59:59)
      date.setHours(23);
      date.setMinutes(59);
      date.setSeconds(59);
      setEndDate(date);
    }
  };
  
  // Generate calendar days
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Get day of week for first day (0 = Sunday)
    const firstDayOfWeek = firstDay.getDay();
    
    // Generate previous month days
    const prevMonthDays = [];
    const prevMonthTotalDays = new Date(year, month, 0).getDate();
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      prevMonthDays.push({
        day: prevMonthTotalDays - i,
        month: month - 1,
        year: month === 0 ? year - 1 : year,
        isCurrentMonth: false
      });
    }
    
    // Generate current month days
    const currentMonthDays = [];
    for (let i = 1; i <= daysInMonth; i++) {
      currentMonthDays.push({
        day: i,
        month: month,
        year: year,
        isCurrentMonth: true
      });
    }
    
    // Generate next month days to fill calendar
    const totalDaysShown = 42; // 6 rows of 7 days
    const nextMonthDays = [];
    const daysFromPrevAndCurrent = prevMonthDays.length + currentMonthDays.length;
    const nextMonthDaysToShow = totalDaysShown - daysFromPrevAndCurrent;
    
    for (let i = 1; i <= nextMonthDaysToShow; i++) {
      nextMonthDays.push({
        day: i,
        month: month + 1,
        year: month === 11 ? year + 1 : year,
        isCurrentMonth: false
      });
    }
    
    // Combine all days
    return [...prevMonthDays, ...currentMonthDays, ...nextMonthDays];
  };
  
  // Change month in calendar
  const changeMonth = (increment: number) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + increment);
    setCurrentMonth(newMonth);
  };
  
  // Check if a day is selected
  const isSelectedDay = (day: number, month: number, year: number) => {
    if (isSelectingStartDate && startDate) {
      return startDate.getDate() === day &&
             startDate.getMonth() === month &&
             startDate.getFullYear() === year;
    } else if (!isSelectingStartDate && endDate) {
      return endDate.getDate() === day &&
             endDate.getMonth() === month &&
             endDate.getFullYear() === year;
    }
    return false;
  };
  
  // Format month year for display
  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };
  
  // Reset date filters
  const resetDates = () => {
    setStartDate(null);
    setEndDate(null);
    setDataLoaded(false);
    setEntries([]);
  };

  // Update title when component mounts or trendLog changes
  useEffect(() => {
    if (onTitleChange) {
      const title = `${trendLog.registerName} • ${trendLog.analyzerName}`;
      onTitleChange(title);
    }
    
    return () => {
      // Cleanup: reset title when component unmounts
      if (onTitleChange) {
        onTitleChange(null);
      }
    };
  }, [trendLog, onTitleChange]);

  // Auto-load today's data on mount
  useEffect(() => {
    const today = new Date();
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);
    
    setStartDate(todayStart);
    setEndDate(todayEnd);
    
    // Load entries with today's date
    setIsLoading(true);
    const loadTodayEntries = async () => {
      try {
        const data = await ApiService.getTrendLogEntries(trendLog._id, {
          startDate: todayStart.toISOString(),
          endDate: todayEnd.toISOString()
        });
        
        if (data && data.success) {
          // Process compact format if available
          if (data.dataFormat === "compact" && Array.isArray(data.entries)) {
            // Convert compact format to standard format
            const processedEntries: LogEntry[] = data.entries.map((entry: CompactLogEntry, index: number) => {
              const timestamp = new Date(entry[0]);
              return {
                _id: `entry-${index}-${entry[0]}`,
                value: entry[1],
                timestamp: timestamp.toISOString(),
                timestampMs: entry[0]
              };
            });
            
            // Sort by timestamp (newest first)
            const sortedEntries = processedEntries.sort((a: LogEntry, b: LogEntry) => b.timestampMs - a.timestampMs);
            setEntries(sortedEntries);
          }
          // Support legacy format as well
          else if (data.entries) {
            const sortedEntries = data.entries.sort((a: LogEntry, b: LogEntry) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );
            setEntries(sortedEntries);
          } else {
            setEntries([]);
          }
          setDataLoaded(true);
        } else {
          setEntries([]);
          setDataLoaded(true);
        }
      } catch (error) {
        console.error('Error loading today log entries:', error);
        setEntries([]);
        setDataLoaded(true);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadTodayEntries();
  }, [trendLog._id]); // Only run once when component mounts

  // Scroll handler for hiding/showing filter section
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      const currentScrollY = event.contentOffset.y;
      
      // Threshold values for showing/hiding filter section
      const hideThreshold = 100; // Hide when scrolled down more than 100px
      const showThreshold = 50; // Show when scrolled up to less than 50px
      
      // Determine target translateY value based on scroll position
      let newTarget = targetTranslateY.value;
      
      if (currentScrollY <= 0) {
        newTarget = 0;
      } else if (currentScrollY > hideThreshold) {
        newTarget = -200; // Hide filter section (adjust based on filter height)
      } else if (currentScrollY < showThreshold) {
        newTarget = 0;
      } else {
        // Between thresholds - keep current target to avoid jitter
        newTarget = targetTranslateY.value;
      }
      
      // Only start new animation if target changed (with small threshold to avoid jitter)
      const targetDiff = Math.abs(newTarget - targetTranslateY.value);
      if (targetDiff > 1) {
        targetTranslateY.value = newTarget;
        
        // Use spring animation for smooth transition
        filterTranslateY.value = withSpring(newTarget, {
          damping: 30,
          stiffness: 120,
          mass: 0.5,
        });
      }
      
      scrollY.value = currentScrollY;
      lastScrollY.value = currentScrollY;
    },
  });

  // Animated style for filter section
  const filterSectionStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      filterTranslateY.value,
      [-200, 0],
      [0, 1],
      'clamp'
    );
    return {
      transform: [{ translateY: filterTranslateY.value }],
      opacity,
    };
  });

  // Animated style for scroll spacer (to prevent dead space when filter is hidden)
  const scrollSpacerStyle = useAnimatedStyle(() => {
    const height = interpolate(
      filterTranslateY.value,
      [-200, 0],
      [0, 150], // Approximate height of filter section + spacing
      'clamp'
    );
    return {
      height,
    };
  });

  const swipeConfig = {
    velocityThreshold: 0.3,
    directionalOffsetThreshold: 80,
    gestureIsClickThreshold: 5,
  };

  return (
    <SwipeGestureRecognizer
      onSwipeRight={onSwipeRight}
      config={swipeConfig}
      style={{ flex: 1 }}
    >
      <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
        <StatusBar style={isDarkMode ? "light" : "dark"} />
        <LinearGradient
          colors={isDarkMode 
            ? ['#0D1B2A', '#1B263B', '#415A77'] 
            : ['#E3F2FD', '#BBDEFB', '#90CAF9']}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        {/* Date Filter Section */}
      <Animated.View style={[styles.filterSectionWrapper, filterSectionStyle]}>
        <BlurView
          intensity={isDarkMode ? 30 : 20}
          tint={isDarkMode ? "dark" : "light"}
          style={styles.filterSection}
        >
          <View style={styles.filterContent}>
            <View style={styles.dateFilterRow}>
              <View style={styles.dateInputContainer}>
                <View style={styles.dateLabelContainer}>
                  <PaperText variant="labelMedium" style={styles.dateLabel}>
                    Start Date
                  </PaperText>
                </View>
                <TouchableOpacity
                  onPress={() => showDatePicker(true)}
                  style={[
                    styles.dateButton,
                    { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.9)' }
                  ]}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name="calendar"
                    size={20}
                    color={isDarkMode ? '#64B5F6' : '#1976D2'}
                  />
                  <PaperText
                    variant="bodyMedium"
                    style={[
                      styles.dateButtonText,
                      { color: isDarkMode ? '#E3F2FD' : '#1976D2' }
                    ]}
                  >
                    {formatDate(startDate)}
                  </PaperText>
                </TouchableOpacity>
              </View>
              
              <View style={styles.dateInputContainer}>
                <View style={styles.dateLabelContainer}>
                  <PaperText variant="labelMedium" style={styles.dateLabel}>
                    End Date
                  </PaperText>
                </View>
                <TouchableOpacity
                  onPress={() => showDatePicker(false)}
                  style={[
                    styles.dateButton,
                    { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.9)' }
                  ]}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name="calendar"
                    size={20}
                    color={isDarkMode ? '#64B5F6' : '#1976D2'}
                  />
                  <PaperText
                    variant="bodyMedium"
                    style={[
                      styles.dateButtonText,
                      { color: isDarkMode ? '#E3F2FD' : '#1976D2' }
                    ]}
                  >
                    {formatDate(endDate)}
                  </PaperText>
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.actionButtons}>
              <TouchableOpacity
                onPress={resetDates}
                style={[
                  styles.resetButton,
                  { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.7)' }
                ]}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name="refresh"
                  size={20}
                  color={isDarkMode ? '#90CAF9' : '#1976D2'}
                />
                <PaperText
                  variant="labelLarge"
                  style={[
                    styles.resetButtonText,
                    { color: isDarkMode ? '#E3F2FD' : '#1976D2' }
                  ]}
                >
                  Reset
                </PaperText>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={searchByDateRange}
                style={[
                  styles.searchButton,
                  {
                    backgroundColor: isDarkMode ? '#1976D2' : '#1976D2',
                    opacity: isLoading ? 0.7 : 1
                  }
                ]}
                activeOpacity={0.8}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <MaterialCommunityIcons
                    name="magnify"
                    size={20}
                    color="#FFFFFF"
                  />
                )}
                <PaperText
                  variant="labelLarge"
                  style={styles.searchButtonText}
                >
                  {isLoading ? 'Searching...' : 'Search'}
                </PaperText>
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </Animated.View>
      
      {/* Calendar Modal */}
      <Modal
        visible={isDatePickerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDatePickerVisible(false)}
      >
        <View style={styles.modalContainer}>
          <Surface style={styles.calendarContainer} elevation={5}>
            <View style={styles.calendarHeader}>
              <IconButton 
                icon="chevron-left"
                onPress={() => changeMonth(-1)}
                size={24}
              />
              
              <PaperText variant="titleLarge" style={styles.calendarTitle}>
                {formatMonthYear(currentMonth)}
              </PaperText>
              
              <IconButton 
                icon="chevron-right"
                onPress={() => changeMonth(1)}
                size={24}
              />
            </View>
            
            {/* Weekday Headers */}
            <View style={styles.weekdayHeader}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                <PaperText key={index} style={styles.weekdayText}>
                  {day}
                </PaperText>
              ))}
            </View>
            
            {/* Calendar Grid */}
            <View style={styles.calendarGrid}>
              {generateCalendarDays().map((dateInfo, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.calendarDay,
                    !dateInfo.isCurrentMonth && styles.otherMonthDay,
                    isSelectedDay(dateInfo.day, dateInfo.month, dateInfo.year) && 
                      { backgroundColor: paperTheme.colors.primary }
                  ]}
                  onPress={() => {
                    const selectedDate = new Date(dateInfo.year, dateInfo.month, dateInfo.day);
                    handleDateSelect(selectedDate);
                  }}
                >
                  <PaperText
                    style={[
                      styles.calendarDayText,
                      !dateInfo.isCurrentMonth && { color: paperTheme.colors.onSurfaceVariant },
                      isSelectedDay(dateInfo.day, dateInfo.month, dateInfo.year) &&
                        { color: paperTheme.colors.onPrimary }
                    ]}
                  >
                    {dateInfo.day}
                  </PaperText>
                </TouchableOpacity>
              ))}
            </View>
            
            {/* Time explanation */}
            <PaperText variant="bodySmall" style={styles.timeInfoText}>
              {isSelectingStartDate
                ? "Start date will be set to beginning of day (00:00:00)"
                : "End date will be set to end of day (23:59:59)"}
            </PaperText>
            
            <Divider style={{marginVertical: 16}} />
            
            {/* Action buttons */}
            <View style={styles.modalActions}>
              <Button 
                mode="text"
                onPress={() => setDatePickerVisible(false)}
              >
                Cancel
              </Button>
              <Button 
                mode="contained"
                onPress={applyDateFilter}
              >
                Apply
              </Button>
            </View>
          </Surface>
        </View>
      </Modal>
      
      {/* Log Entries List */}
      <Animated.FlatList
        data={entries}
        renderItem={({ item, index }) => (
          <LogEntryCard
            value={item.value}
            timestamp={item.timestamp}
            timestampMs={item.timestampMs}
            unit={trendLog.unit}
            index={index}
            totalEntries={entries.length}
          />
        )}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        ListHeaderComponent={<Animated.View style={scrollSpacerStyle} />}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[paperTheme.colors.primary]}
            progressViewOffset={170}
            tintColor={paperTheme.colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            {isLoading ? (
              <>
                <ActivityIndicator size="large" color={paperTheme.colors.primary} />
                <PaperText variant="bodyLarge" style={styles.loadingText}>
                  Loading data...
                </PaperText>
              </>
            ) : (
              <>
                <MaterialCommunityIcons
                  name="file-search-outline"
                  size={64}
                  color={paperTheme.colors.primary}
                />
                <PaperText variant="titleMedium" style={styles.emptyText}>
                  No log entries found
                </PaperText>
                <PaperText variant="bodySmall" style={styles.emptySubtext}>
                  {!dataLoaded
                    ? 'Select date range and press Search button to view entries'
                    : 'Pull down to refresh'}
                </PaperText>
              </>
            )}
          </View>
        }
      />

      {/* Dialogs */}
      <Portal>
        <Dialog visible={errorDialogVisible} onDismiss={() => setErrorDialogVisible(false)}>
          <Dialog.Title>Error</Dialog.Title>
          <Dialog.Content>
            <PaperText variant="bodyMedium">{errorMessage}</PaperText>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setErrorDialogVisible(false)}>OK</Button>
          </Dialog.Actions>
        </Dialog>
        
        <Dialog visible={noDataDialogVisible} onDismiss={() => setNoDataDialogVisible(false)}>
          <Dialog.Title>No Data Loaded</Dialog.Title>
          <Dialog.Content>
            <PaperText variant="bodyMedium">Please select a date range and apply filter first.</PaperText>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setNoDataDialogVisible(false)}>OK</Button>
          </Dialog.Actions>
        </Dialog>
        
        <Dialog visible={missingStartDateDialogVisible} onDismiss={() => setMissingStartDateDialogVisible(false)}>
          <Dialog.Title>Missing Start Date</Dialog.Title>
          <Dialog.Content>
            <PaperText variant="bodyMedium">Please select a start date first.</PaperText>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setMissingStartDateDialogVisible(false)}>OK</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      </View>
    </SwipeGestureRecognizer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterSectionWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  filterSection: {
    padding: 16,
    paddingBottom: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    overflow: 'hidden',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  filterContent: {
    backgroundColor: 'transparent',
  },
  dateFilterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  dateInputContainer: {
    flex: 1,
  },
  dateLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateLabel: {
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  dateButtonText: {
    flex: 1,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  resetButtonText: {
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#1976D2',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  listContent: {
    padding: 16,
    paddingTop: 24,
    flexGrow: 1,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  calendarContainer: {
    width: '90%',
    borderRadius: 12,
    padding: 16,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  calendarTitle: {
    textAlign: 'center',
  },
  weekdayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  weekdayText: {
    width: 40,
    textAlign: 'center',
    fontWeight: '500',
    opacity: 0.7,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  calendarDay: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 2,
    borderRadius: 20,
  },
  calendarDayText: {
    fontSize: 16,
  },
  otherMonthDay: {
    opacity: 0.5,
  },
  timeInfoText: {
    textAlign: 'center',
    marginTop: 16,
    opacity: 0.7,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    minHeight: 300,
  },
  emptyText: {
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    marginTop: 8,
    textAlign: 'center',
    opacity: 0.6,
  },
  loadingText: {
    marginTop: 16,
    opacity: 0.7,
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
    flexDirection: 'row',
    alignItems: 'center',
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
  entriesCountBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  entriesCountText: {
    fontSize: 14,
    fontWeight: '700',
  },
});