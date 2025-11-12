import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card, Chip, IconButton, useTheme } from 'react-native-paper';
import { useOrientation } from '../context/OrientationContext';
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
    if (isRunning && !isExpired) return theme.colors.success;
    if (isExpired) return theme.colors.error;
    return theme.colors.outline;
  };

  const statusColor = getStatusColor();

  return (
    <View style={[
      styles.cardWrapper,
      isLandscape && logCardWidth !== undefined && { width: logCardWidth },
      isLandscape && { marginBottom: 0, flex: 1, minWidth: 0 }
    ]}>
      <Card
        style={[
          styles.registerCard,
          isLandscape && { marginBottom: 0, flex: 1, minWidth: 0 }
        ]}
        mode="elevated"
        onPress={onPress}
      >
        <Card.Content>
          {/* Header */}
          <View style={styles.registerHeader}>
            <View style={styles.registerHeaderLeft}>
              <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
              <Text style={[styles.registerAddress, {color: theme.colors.onSurfaceVariant}]}>
                Address: {log.registerAddress}
              </Text>
            </View>
            
            <View style={styles.registerBadges}>
              {log.dataType && (
                <View style={styles.typeBadge}>
                  <Text style={[styles.typeText, {color: theme.colors.onSurfaceVariant}]}>
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
                <Chip 
                  mode="flat"
                  style={[styles.expiredChip]}
                  textStyle={styles.chipText}
                >
                  EXPIRED
                </Chip>
              )}
            </View>
          </View>
          
          {/* Value Display */}
          <View style={[styles.registerValueContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
            <View style={styles.valueContent}>
              <Text style={styles.registerName}>
                {log.registerName}
              </Text>
              <View style={styles.valueRow}>
                <View style={styles.intervalInfo}>
                  <Text style={[styles.intervalText, {color: theme.colors.onSurface}]}>
                    {log.interval} {log.period}
                  </Text>
                  <Text style={[styles.endDateText, {color: theme.colors.onSurfaceVariant}]}>
                    Until {endDate.toLocaleDateString()}
                  </Text>
                </View>
              </View>
            </View>
          </View>
          
          {/* Footer */}
          <View style={styles.registerFooter}>
            <Text style={[styles.lastUpdate, {color: theme.colors.onSurfaceVariant}]}>
              Created: {new Date(log.createdAt).toLocaleDateString()}
            </Text>
            
            <IconButton
              icon="chart-line"
              iconColor={theme.colors.primary}
              size={20}
              onPress={onPress}
              style={styles.viewButton}
            />
          </View>
        </Card.Content>
      </Card>
    </View>
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
    borderRadius: 10,
    elevation: 2,
    flex: 1,
    marginHorizontal: 0,
    minWidth: 0,
  },
  registerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
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
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  registerAddress: {
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
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
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
  },
  pulseIndicatorSmall: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'white',
    marginRight: 3,
  },
  liveTextSmall: {
    fontSize: 9,
    fontWeight: '700',
    color: 'white',
  },
  expiredChip: {
    backgroundColor: '#F44336',
    height: 20,
  },
  chipText: {
    fontSize: 9,
    fontWeight: '700',
    color: 'white',
  },
  registerValueContainer: {
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    width: '100%',
  },
  valueContent: {
    flex: 1,
  },
  registerName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: 'rgba(0,0,0,0.7)',
    flexWrap: 'wrap',
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
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
    flexWrap: 'wrap',
  },
  endDateText: {
    fontSize: 11,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  registerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  lastUpdate: {
    fontSize: 11,
  },
  viewButton: {
    margin: -6,
  },
});

export default LogCard;