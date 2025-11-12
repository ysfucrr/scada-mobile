import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
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
  Modal,
  ScrollView
} from 'react-native';
import { ActivityIndicator, useTheme as usePaperTheme } from 'react-native-paper';
import GradientCard from '../components/GradientCard';
import { useConnection } from '../context/ConnectionContext';
import { useTheme as useAppTheme } from '../context/ThemeContext';
import ApiService from '../services/ApiService';

interface PeriodicReportType {
  _id: string;
  description: string;
  frequency: string; // daily, weekly, monthly
  schedule: {
    dayOfWeek?: number; // 0-6 (Sunday-Saturday) for weekly
    dayOfMonth?: number; // 1-31 for monthly
    hour: number; // 0-23
    minute: number; // 0-59
  };
  format: 'pdf';
  last24HoursOnly?: boolean;
  trendLogs: { id: string; label: string }[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
  lastSent?: string | null;
}

export default function PeriodicReportsScreen() {
  const paperTheme = usePaperTheme();
  const { isDarkMode } = useAppTheme();
  const { isConnected } = useConnection();

  const [reports, setReports] = useState<PeriodicReportType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedReport, setExpandedReport] = useState<string | null>(null);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [selectedReport, setSelectedReport] = useState<PeriodicReportType | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<{
    subject: string;
    html: string;
    recipients: string[];
    trendLogs?: Array<{
      title: string;
      entries: Array<{
        timestamp: string;
        value: number;
      }>;
    }>;
    date?: string;
  } | null>(null);
  const [generatingReport, setGeneratingReport] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const expandAnims = useRef(new Map<string, Animated.Value>()).current;

  useEffect(() => {
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
      loadReports();
    } else {
      setReports([]);
      setIsLoading(false);
    }
  }, [isConnected]);

  const loadReports = async () => {
    if (!isConnected) return;
    setIsLoading(true);
    try {
      const data = await ApiService.getPeriodicReports();
      setReports(data);
      
      // Initialize expand animations for each report
      data.forEach(report => {
        if (!expandAnims.has(report._id)) {
          expandAnims.set(report._id, new Animated.Value(0));
        }
      });
    } catch (error) {
      console.error('Error loading periodic reports:', error);
      Alert.alert('Error', 'Failed to load periodic reports');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    if (!isConnected) {
      Alert.alert('Not Connected', 'Please connect to the server first from the Settings tab.');
      return;
    }
    setIsRefreshing(true);
    loadReports();
  };

  const toggleReport = (reportId: string) => {
    const isExpanding = expandedReport !== reportId;
    setExpandedReport(isExpanding ? reportId : null);
    
    // Animate expansion/collapse
    const animValue = expandAnims.get(reportId);
    if (animValue) {
      Animated.spring(animValue, {
        toValue: isExpanding ? 1 : 0,
        useNativeDriver: false,
        tension: 65,
        friction: 11,
      }).start();
    }
  };

  const formatFrequency = (report: PeriodicReportType) => {
    const { frequency, schedule } = report;
    
    if (frequency === 'daily') {
      return `Daily at ${schedule.hour}:${schedule.minute.toString().padStart(2, '0')}`;
    } else if (frequency === 'weekly') {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const day = days[schedule.dayOfWeek || 0];
      return `Weekly on ${day} at ${schedule.hour}:${schedule.minute.toString().padStart(2, '0')}`;
    } else if (frequency === 'monthly') {
      return `Monthly on day ${schedule.dayOfMonth} at ${schedule.hour}:${schedule.minute.toString().padStart(2, '0')}`;
    }
    
    return frequency;
  };

  const handlePreview = async (report: PeriodicReportType) => {
    try {
      setSelectedReport(report);
      setPreviewModalVisible(true);
      setPreviewLoading(true);
      setPreviewData(null);

      // Demo modu kontrolü
      const demoMode = await AsyncStorage.getItem('demoMode');
      if (demoMode === 'true') {
        // Demo modunda sahte preview verisi
        const now = new Date();
        const entries = [];
        // Son 24 saat için örnek veriler
        for (let i = 0; i < 24; i++) {
          entries.push({
            timestamp: new Date(now.getTime() - i * 60 * 60 * 1000).toISOString(),
            value: Math.round((850 + Math.random() * 200) * 10) / 10, // 850-1050 kWh arası
          });
        }
        
        setPreviewData({
          subject: `${report.description} - ${new Date().toLocaleDateString()}`,
          html: '<p>Demo preview content</p>',
          recipients: ['demo@example.com', 'admin@example.com'],
          trendLogs: [
            {
              title: 'Demo Energy Meter',
              entries: entries.reverse(), // En eski tarihten en yeniye
            },
          ],
          date: now.toISOString(),
        });
        setPreviewLoading(false);
        return;
      }

      await ApiService.initialize();
      const apiService = ApiService as any;
      
      let data;
      if (apiService.useCloudBridge) {
        data = await apiService.fetchViaCloudBridge(`/periodic-reports/${report._id}/preview`);
      } else {
        const response = await fetch(`${apiService.baseUrl}/api/periodic-reports/${report._id}/preview`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch preview');
        }

        data = await response.json();
      }

      if (data.success && data.preview) {
        setPreviewData(data.preview);
      } else {
        throw new Error('Invalid preview data');
      }
    } catch (error) {
      console.error('Error previewing report:', error);
      Alert.alert('Error', 'Failed to load report preview');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleGenerate = async (report: PeriodicReportType) => {
    try {
      setGeneratingReport(report._id);
      
      // Demo modu kontrolü
      const demoMode = await AsyncStorage.getItem('demoMode');
      if (demoMode === 'true') {
        // Demo modunda sahte başarı mesajı
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simüle edilmiş gecikme
        Alert.alert('Success', 'Report generated and sent successfully (Demo Mode)');
        setGeneratingReport(null);
        return;
      }
      
      await ApiService.initialize();
      const apiService = ApiService as any;
      
      let response: any;
      if (apiService.useCloudBridge) {
        response = await apiService.fetchViaCloudBridge(`/periodic-reports/${report._id}/generate`, 'POST');
      } else {
        const fetchResponse = await fetch(`${apiService.baseUrl}/api/mobile/periodic-reports/${report._id}/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!fetchResponse.ok) {
          const errorData = await fetchResponse.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to generate report');
        }
        
        response = await fetchResponse.json();
      }

      // Check if response indicates success
      if (response && response.success === false) {
        throw new Error(response.error || 'Failed to generate report');
      }

      Alert.alert('Success', 'Report generated and sent successfully');
      loadReports(); // Refresh to update lastSent
    } catch (error: any) {
      console.error('Error generating report:', error);
      const errorMessage = error.message || 'Failed to generate report';
      Alert.alert(
        'Error', 
        errorMessage.includes('Mail service is not configured') 
          ? 'Mail service is not configured. Please configure mail settings in the admin panel to send reports.'
          : errorMessage
      );
    } finally {
      setGeneratingReport(null);
    }
  };

  const renderReportItem = ({ item: report }: { item: PeriodicReportType }) => {
    const isExpanded = expandedReport === report._id;
    const expandAnim = expandAnims.get(report._id) || new Animated.Value(0);
    const rotateAnim = expandAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '180deg'],
    });

    const maxHeight = expandAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 200],
    });

    const isGenerating = generatingReport === report._id;

    return (
      <GradientCard
        colors={isDarkMode ? ['#263238', '#37474F'] : ['#1E88E5', '#42A5F5']}
        style={styles.reportCard}
        mode="elevated"
      >
        <BlurView
          intensity={isDarkMode ? 30 : 20}
          tint={isDarkMode ? "dark" : "light"}
          style={styles.blurContainer}
        >
          {/* Header */}
          <TouchableOpacity
            onPress={() => toggleReport(report._id)}
            activeOpacity={0.9}
            style={styles.reportHeader}
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
                <Text style={styles.reportDescription}>{report.description || 'Periodic Report'}</Text>
                <View style={styles.badgeContainer}>
                  <View style={[styles.badge, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
                    <Text style={styles.badgeText}>{report.format.toUpperCase()}</Text>
                  </View>
                  {report.active ? (
                    <View style={[styles.badge, { backgroundColor: 'rgba(76, 175, 80, 0.3)' }]}>
                      <Text style={[styles.badgeText, { color: '#4CAF50' }]}>Active</Text>
                    </View>
                  ) : (
                    <View style={[styles.badge, { backgroundColor: 'rgba(158, 158, 158, 0.3)' }]}>
                      <Text style={[styles.badgeText, { color: '#9E9E9E' }]}>Inactive</Text>
                    </View>
                  )}
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
                height: maxHeight,
                opacity: expandAnim,
              }
            ]}
          >
            <View style={styles.contentInner}>
              {/* Schedule Info */}
              <View style={styles.infoSection}>
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons
                    name="calendar-clock"
                    size={18}
                    color="#FFFFFF"
                  />
                  <Text style={styles.infoLabel}>Schedule:</Text>
                  <Text style={styles.infoValue}>{formatFrequency(report)}</Text>
                </View>
                
                {report.lastSent && (
                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons
                      name="clock-outline"
                      size={18}
                      color="#FFFFFF"
                    />
                    <Text style={styles.infoLabel}>Last Sent:</Text>
                    <Text style={styles.infoValue}>
                      {new Date(report.lastSent).toLocaleDateString()}
                    </Text>
                  </View>
                )}

                <View style={styles.infoRow}>
                  <MaterialCommunityIcons
                    name="chart-line"
                    size={18}
                    color="#FFFFFF"
                  />
                  <Text style={styles.infoLabel}>Trend Logs:</Text>
                  <Text style={styles.infoValue}>{report.trendLogs.length}</Text>
                </View>
              </View>

              {/* Actions */}
              <View style={styles.actionsContainer}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.previewButton]}
                  onPress={() => handlePreview(report)}
                  disabled={previewLoading}
                >
                  <MaterialCommunityIcons
                    name="eye-outline"
                    size={20}
                    color="#FFFFFF"
                  />
                  <Text style={styles.actionButtonText}>Preview</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.generateButton]}
                  onPress={() => handleGenerate(report)}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <MaterialCommunityIcons
                      name="file-document-outline"
                      size={20}
                      color="#FFFFFF"
                    />
                  )}
                  <Text style={styles.actionButtonText}>
                    {isGenerating ? 'Generating...' : 'Generate'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </BlurView>
      </GradientCard>
    );
  };

  if (isLoading && reports.length === 0) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: paperTheme.colors.background }]}>
        <StatusBar style={isDarkMode ? "light" : "dark"} />
        <ActivityIndicator size="large" color={paperTheme.colors.primary} />
        <Text style={[styles.loadingText, { color: paperTheme.colors.onSurface }]}>
          Loading periodic reports...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <FlatList
          data={reports}
          renderItem={renderReportItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={paperTheme.colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons
                name="file-document-outline"
                size={64}
                color={paperTheme.colors.onSurfaceVariant}
              />
              <Text style={[styles.emptyText, { color: paperTheme.colors.onSurfaceVariant }]}>
                No periodic reports found
              </Text>
            </View>
          }
        />
      </Animated.View>

      {/* Preview Modal */}
      <Modal
        visible={previewModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setPreviewModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: paperTheme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: paperTheme.colors.onSurface }]}>
                Report Preview
              </Text>
              <TouchableOpacity
                onPress={() => setPreviewModalVisible(false)}
                style={styles.closeButton}
              >
                <MaterialCommunityIcons
                  name="close"
                  size={24}
                  color={paperTheme.colors.onSurface}
                />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {previewLoading ? (
                <View style={styles.modalLoading}>
                  <ActivityIndicator size="large" color={paperTheme.colors.primary} />
                  <Text style={[styles.modalLoadingText, { color: paperTheme.colors.onSurfaceVariant }]}>
                    Loading preview...
                  </Text>
                </View>
              ) : previewData ? (
                <View>
                  <View style={styles.previewSection}>
                    <Text style={[styles.previewLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                      Subject:
                    </Text>
                    <Text style={[styles.previewValue, { color: paperTheme.colors.onSurface }]}>
                      {previewData.subject}
                    </Text>
                  </View>

                  <View style={styles.previewSection}>
                    <Text style={[styles.previewLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                      Recipients:
                    </Text>
                    <Text style={[styles.previewValue, { color: paperTheme.colors.onSurface }]}>
                      {Array.isArray(previewData.recipients) && previewData.recipients.length > 0
                        ? previewData.recipients.join(', ')
                        : 'No recipients configured'}
                    </Text>
                  </View>

                  {/* Trend Logs Data */}
                  {previewData.trendLogs && previewData.trendLogs.length > 0 ? (
                    <View style={styles.previewSection}>
                      <Text style={[styles.previewLabel, { color: paperTheme.colors.onSurfaceVariant, marginBottom: 12 }]}>
                        Report Content:
                      </Text>
                      {previewData.trendLogs.map((section, sectionIndex) => (
                        <View 
                          key={sectionIndex} 
                          style={[styles.trendLogSection, { backgroundColor: paperTheme.colors.surfaceVariant, marginBottom: 16 }]}
                        >
                          <View style={styles.trendLogHeader}>
                            <MaterialCommunityIcons
                              name="chart-line"
                              size={20}
                              color={paperTheme.colors.primary}
                            />
                            <Text style={[styles.trendLogTitle, { color: paperTheme.colors.onSurface }]}>
                              {section.title}
                            </Text>
                          </View>
                          <Text style={[styles.trendLogEntriesCount, { color: paperTheme.colors.onSurfaceVariant }]}>
                            {section.entries.length} entries
                          </Text>
                          
                          <View style={styles.trendLogTable}>
                            <View style={[styles.tableHeader, { backgroundColor: paperTheme.colors.primaryContainer }]}>
                              <Text style={[styles.tableHeaderText, { color: paperTheme.colors.onPrimaryContainer, flex: 2 }]}>
                                Timestamp
                              </Text>
                              <Text style={[styles.tableHeaderText, { color: paperTheme.colors.onPrimaryContainer, flex: 1 }]}>
                                Value
                              </Text>
                            </View>
                            <ScrollView style={styles.tableBody} nestedScrollEnabled>
                              {section.entries.map((entry, entryIndex) => (
                                <View 
                                  key={entryIndex}
                                  style={[
                                    styles.tableRow,
                                    entryIndex % 2 === 0 && { backgroundColor: paperTheme.colors.surface }
                                  ]}
                                >
                                  <Text style={[styles.tableCell, { color: paperTheme.colors.onSurface, flex: 2 }]}>
                                    {new Date(entry.timestamp).toLocaleString()}
                                  </Text>
                                  <Text style={[styles.tableCell, { color: paperTheme.colors.onSurface, flex: 1, fontWeight: '600' }]}>
                                    {entry.value}
                                  </Text>
                                </View>
                              ))}
                            </ScrollView>
                          </View>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <View style={styles.previewSection}>
                      <Text style={[styles.previewLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                        Content:
                      </Text>
                      <View style={[styles.htmlPreview, { backgroundColor: paperTheme.colors.surfaceVariant }]}>
                        <Text style={[styles.htmlText, { color: paperTheme.colors.onSurface }]}>
                          No trend log data available
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              ) : (
                <Text style={[styles.modalError, { color: paperTheme.colors.error }]}>
                  Failed to load preview
                </Text>
              )}
            </ScrollView>
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
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  reportCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  blurContainer: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
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
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  reportDescription: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  expandedContent: {
    overflow: 'hidden',
  },
  contentInner: {
    padding: 16,
    paddingTop: 0,
  },
  infoSection: {
    marginBottom: 16,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    minWidth: 100,
  },
  infoValue: {
    fontSize: 14,
    color: '#FFFFFF',
    flex: 1,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  previewButton: {
    backgroundColor: 'rgba(66, 111, 245, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(66, 165, 245, 0.7)',
  },
  generateButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 16,
  },
  modalLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  modalLoadingText: {
    marginTop: 16,
    fontSize: 14,
  },
  previewSection: {
    marginBottom: 16,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  previewValue: {
    fontSize: 14,
    lineHeight: 20,
  },
  htmlPreview: {
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    maxHeight: 300,
  },
  htmlText: {
    fontSize: 12,
    lineHeight: 18,
  },
  trendLogSection: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  trendLogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  trendLogTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  trendLogEntriesCount: {
    fontSize: 12,
    marginBottom: 12,
  },
  trendLogTable: {
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  tableHeaderText: {
    fontSize: 14,
    fontWeight: '700',
    paddingHorizontal: 8,
  },
  tableBody: {
    maxHeight: 300,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  tableCell: {
    fontSize: 13,
    paddingHorizontal: 8,
  },
  modalError: {
    textAlign: 'center',
    fontSize: 14,
    paddingVertical: 32,
  },
});

