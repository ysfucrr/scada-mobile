import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card, Chip, IconButton, useTheme } from 'react-native-paper';
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
  
  const isRunning = log.status === 'running';
  const endDate = new Date(log.endDate);
  const isExpired = endDate < new Date();
  
  // Determine status color
  const getStatusColor = () => {
    if (isRunning && !isExpired) return theme.colors.success;
    if (isExpired) return theme.colors.error;
    return theme.colors.outline;
  };

  const statusColor = getStatusColor();

  return (
    <View style={styles.cardWrapper}>
      <Card
        style={styles.registerCard}
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
                {/* Type Badge */}
                <View style={styles.typeBadge}>
                  <MaterialCommunityIcons
                    name={log.isKWHCounter ? 'counter' : 'gauge'}
                    size={14}
                    color={theme.colors.onSurfaceVariant}
                  />
                  <Text style={[styles.typeText, {color: theme.colors.onSurfaceVariant}]}>
                    {log.isKWHCounter ? 'KWH' : log.dataType}
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
  },
  registerCard: {
    marginBottom: 12,
    borderRadius: 10,
    elevation: 2,
  },
  registerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  registerHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
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
  },
  registerBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  },
  valueContent: {
    flex: 1,
  },
  registerName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: 'rgba(0,0,0,0.7)',
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