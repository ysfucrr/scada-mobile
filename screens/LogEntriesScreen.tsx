import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Modal,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Text
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  Button,
  Card,
  Chip,
  Divider,
  IconButton,
  useTheme,
  Surface,
  ActivityIndicator,
  Dialog,
  Portal,
  Text as PaperText
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

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
}

export default function LogEntriesScreen({ trendLog, onBack }: LogEntriesScreenProps) {
  const { isConnected } = useConnection();
  const { theme, isDarkMode } = useAppTheme();
  const paperTheme = useTheme() as AppTheme;
  
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  
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

  return (
    <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      
      {/* Modern Floating Header */}
      <View style={[styles.modernHeader, { backgroundColor: 'rgba(33, 150, 243, 0.15)', height: 'auto' }]}>
        <SafeAreaView edges={['top']} style={{ paddingTop: -48 }}>
          <TouchableOpacity
            style={[styles.headerContent, { paddingTop: 1, paddingBottom: 4 }]}
            onPress={onBack}
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
                {trendLog.registerName}
              </Text>
              <Text style={[styles.headerSubtitle, { color: paperTheme.colors.onSurfaceVariant }]}>
                {trendLog.analyzerName} • {trendLog.buildingName}
              </Text>
            </View>
            
            <View style={styles.headerActions}>
              {entries.length > 0 && (
                <View style={[styles.entriesCountBadge, { backgroundColor: paperTheme.colors.primaryContainer }]}>
                  <Text style={[styles.entriesCountText, { color: paperTheme.colors.onPrimaryContainer }]}>
                    {entries.length}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
      
      {/* Date Filter Section */}
      <Surface style={styles.filterSection} elevation={1}>
        <View style={styles.dateFilterRow}>
          <View style={styles.dateInputContainer}>
            <PaperText variant="labelMedium">Start Date:</PaperText>
            <Button
              mode="outlined"
              onPress={() => showDatePicker(true)}
              icon="calendar"
              style={styles.dateButton}
            >
              {formatDate(startDate)}
            </Button>
          </View>
          
          <View style={styles.dateInputContainer}>
            <PaperText variant="labelMedium">End Date:</PaperText>
            <Button
              mode="outlined"
              onPress={() => showDatePicker(false)}
              icon="calendar"
              style={styles.dateButton}
            >
              {formatDate(endDate)}
            </Button>
          </View>
        </View>
        
        <View style={styles.actionButtons}>
          <Button 
            mode="text"
            onPress={resetDates}
            icon="refresh"
          >
            Reset
          </Button>
          
          <Button 
            mode="contained"
            onPress={searchByDateRange}
            icon="magnify"
            loading={isLoading}
            style={{marginLeft: 8}}
          >
            Search
          </Button>
        </View>
      </Surface>
      
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
      <FlatList
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
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[paperTheme.colors.primary]}
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterSection: {
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dateFilterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dateInputContainer: {
    flex: 1,
    marginRight: 8,
  },
  dateButton: {
    marginTop: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
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