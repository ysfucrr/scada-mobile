import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Text, useTheme, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppTheme } from '../theme/theme';

interface LogEntryProps {
  value: number;
  timestamp: string;
  timestampMs: number;
  unit: string;
  index: number;
  totalEntries: number;
}

const LogEntryCard: React.FC<LogEntryProps> = ({
  value,
  timestamp,
  timestampMs,
  unit,
  index,
  totalEntries
}) => {
  const theme = useTheme() as AppTheme;
  const date = new Date(timestamp);
  const isRecent = Date.now() - timestampMs < 300000; // Last 5 minutes
  
  // Format time with seconds
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };
  
  // Format date
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  return (
    <View style={styles.cardWrapper}>
      <Card 
        style={[
          styles.card,
          isRecent && styles.recentCard
        ]} 
        mode="elevated"
      >
        <Card.Content>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.indexBadge}>
              <Text style={[styles.indexText, {color: theme.colors.primary}]}>
                #{totalEntries - index}
              </Text>
            </View>
            
            {isRecent && (
              <View style={styles.recentBadge}>
                <View style={styles.pulseIndicator} />
                <Text style={styles.recentText}>RECENT</Text>
              </View>
            )}
          </View>
          
          {/* Value Container */}
          <View style={[styles.valueContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
            <View style={styles.valueContent}>
              <View style={styles.valueRow}>
                <Text 
                  style={[
                    styles.value, 
                    {color: isRecent ? theme.colors.success : theme.colors.onSurface}
                  ]}
                >
                  {value.toFixed(2)}
                </Text>
                <Text style={[styles.unit, {color: theme.colors.onSurfaceVariant}]}>
                  {unit}
                </Text>
              </View>
              
              <View style={styles.timestampRow}>
                <View style={styles.timeInfo}>
                  <MaterialCommunityIcons
                    name="clock-outline"
                    size={14}
                    color={theme.colors.onSurfaceVariant}
                    style={styles.icon}
                  />
                  <Text style={[styles.timeText, {color: theme.colors.onSurfaceVariant}]}>
                    {formatTime(date)}
                  </Text>
                </View>
                
                <View style={styles.dateInfo}>
                  <MaterialCommunityIcons
                    name="calendar-outline"
                    size={14}
                    color={theme.colors.onSurfaceVariant}
                    style={styles.icon}
                  />
                  <Text style={[styles.dateText, {color: theme.colors.onSurfaceVariant}]}>
                    {formatDate(date)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </Card.Content>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  cardWrapper: {
    marginVertical: 4,
  },
  card: {
    borderRadius: 10,
    elevation: 2,
  },
  recentCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  indexBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  indexText: {
    fontSize: 12,
    fontWeight: '700',
  },
  recentBadge: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  pulseIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'white',
    marginRight: 4,
  },
  recentText: {
    fontSize: 9,
    fontWeight: '700',
    color: 'white',
  },
  valueContainer: {
    borderRadius: 10,
    padding: 12,
  },
  valueContent: {
    flex: 1,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 8,
  },
  value: {
    fontSize: 28,
    fontWeight: '800',
    marginRight: 6,
  },
  unit: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  timestampRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 4,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  dateText: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default LogEntryCard;