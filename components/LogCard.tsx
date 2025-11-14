import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from 'react-native-paper';
import GradientCard from './GradientCard';
import { useOrientation } from '../context/OrientationContext';
import { useTheme as useAppTheme } from '../context/ThemeContext';
import { TrendLogData } from '../screens/LogsScreen';
import { AppTheme } from '../theme/theme';

interface LogCardProps {
  log: TrendLogData;
  onPress: () => void;
}

const LogCard: React.FC<LogCardProps> = ({
  log,
  onPress
}) => {
  const theme = useTheme() as AppTheme;
  const { isDarkMode } = useAppTheme();
  const { isLandscape, screenWidth, numColumns } = useOrientation();
  
  const isRunning = log.status === 'running';
  const endDate = new Date(log.endDate);
  const isExpired = endDate < new Date();
  
  // Calculate card width based on numColumns
  const logCardWidth = numColumns > 1
    ? (screenWidth - 24 - (12 * (numColumns - 1))) / numColumns
    : undefined;
  
  // Determine status color
  const getStatusColor = () => {
    if (isRunning && !isExpired) return '#4CAF50';
    if (isExpired) return '#F44336';
    return theme.colors.outline;
  };

  const statusColor = getStatusColor();
  
  // Gradient colors for card - matching page background but slightly lighter/darker for contrast
  const gradientColors = isDarkMode 
    ? ['#1B263B', '#263850', '#2D4A6B'] as [string, string, ...string[]]
    : ['#F5F9FC', '#E8F4F8', '#DBEFF4'] as [string, string, ...string[]];

  return (
    <TouchableOpacity
      style={[
        styles.cardWrapper,
        isLandscape && logCardWidth !== undefined && { width: logCardWidth },
        isLandscape && { marginBottom: 0, flex: 1, minWidth: 0 }
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <GradientCard
        colors={gradientColors}
        style={StyleSheet.flatten([
          styles.registerCard,
          isLandscape ? { marginBottom: 0, flex: 1, minWidth: 0 } : undefined
        ])}
        mode="elevated"
      >
        <BlurView
          intensity={isDarkMode ? 20 : 10}
          tint={isDarkMode ? "dark" : "light"}
          style={styles.blurContainer}
        >
          <View style={styles.cardContent}>
            {/* Header */}
            <View style={styles.registerHeader}>
              <View style={styles.registerHeaderLeft}>
                <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
                <Text style={[
                  styles.registerAddress,
                  { color: isDarkMode ? '#B0BEC5' : '#546E7A' }
                ]}>
                  Address: {log.registerAddress}
                </Text>
              </View>
              
              <View style={styles.registerBadges}>
                {log.dataType && (
                  <View style={[
                    styles.typeBadge,
                    { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
                  ]}>
                    <Text style={[
                      styles.typeText,
                      { color: isDarkMode ? '#CFD8DC' : '#546E7A' }
                    ]}>
                      {log.dataType.toUpperCase()}
                    </Text>
                  </View>
                )}
                {isRunning && !isExpired && (
                  <View style={styles.liveBadgeSmall}>
                    <View style={styles.pulseIndicatorSmall} />
                    <Text style={styles.liveTextSmall}>RUNNING</Text>
                  </View>
                )}
                {isExpired && (
                  <View style={styles.expiredBadge}>
                    <Text style={styles.expiredText}>EXPIRED</Text>
                  </View>
                )}
              </View>
            </View>
            
            {/* Value Display */}
            <View style={styles.registerValueContainer}>
              <View style={styles.valueContent}>
                <Text style={[
                  styles.registerName,
                  { color: isDarkMode ? '#E0E0E0' : '#424242' }
                ]}>
                  {log.registerName}
                </Text>
                <View style={styles.valueRow}>
                  <View style={styles.intervalInfo}>
                    <Text style={[
                      styles.intervalText,
                      { color: isDarkMode ? '#FFFFFF' : '#1976D2' }
                    ]}>
                      {log.interval} {log.period}
                    </Text>
                    <Text style={[
                      styles.endDateText,
                      { color: isDarkMode ? '#B0BEC5' : '#757575' }
                    ]}>
                      Until {endDate.toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
            
            {/* Footer */}
            <View style={styles.registerFooter}>
              <Text style={[
                styles.lastUpdate,
                { color: isDarkMode ? '#B0BEC5' : '#757575' }
              ]}>
                Created: {new Date(log.createdAt).toLocaleDateString()}
              </Text>
              
              <TouchableOpacity
                onPress={onPress}
                style={[
                  styles.viewButton,
                  { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(25,118,210,0.1)' }
                ]}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name="chart-line"
                  size={20}
                  color={isDarkMode ? '#64B5F6' : '#1976D2'}
                />
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </GradientCard>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardWrapper: {
    marginVertical: 4,
    marginHorizontal: 0,
    flex: 1,
    minWidth: 0,
  },
  registerCard: {
    marginBottom: 12,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    flex: 1,
    marginHorizontal: 0,
    minWidth: 0,
    overflow: 'hidden',
  },
  blurContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  cardContent: {
    padding: 16,
  },
  registerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 8,
  },
  registerHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  registerAddress: {
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
    letterSpacing: 0.3,
  },
  registerBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    flexShrink: 0,
  },
  liveBadgeSmall: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    shadowColor: '#4CAF50',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  pulseIndicatorSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'white',
    marginRight: 5,
  },
  liveTextSmall: {
    fontSize: 10,
    fontWeight: '700',
    color: 'white',
    letterSpacing: 0.5,
  },
  expiredBadge: {
    backgroundColor: '#F44336',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    shadowColor: '#F44336',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  expiredText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'white',
    letterSpacing: 0.5,
  },
  registerValueContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    width: '100%',
    backgroundColor: 'transparent',
  },
  valueContent: {
    flex: 1,
  },
  registerName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
    flexWrap: 'wrap',
    letterSpacing: 0.2,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  intervalInfo: {
    flex: 1,
  },
  intervalText: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
    flexWrap: 'wrap',
    letterSpacing: 0.3,
  },
  endDateText: {
    fontSize: 12,
    letterSpacing: 0.2,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  registerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  lastUpdate: {
    fontSize: 12,
    letterSpacing: 0.2,
  },
  viewButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
});

export default LogCard;