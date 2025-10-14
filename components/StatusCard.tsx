import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { AppTheme } from '../theme/theme';
import GradientCard from './GradientCard';

interface StatusCardProps {
  title: string;
  status: boolean | 'connecting';
  subtitle?: string;
  lastUpdate?: string;
  additionalInfo?: string;
}

const StatusCard: React.FC<StatusCardProps> = ({
  title,
  status,
  subtitle,
  lastUpdate,
  additionalInfo
}) => {
  const theme = useTheme() as AppTheme;

  const getGradientColors = (): [string, string] => {
    if (status === true) return ['#4CAF50', '#66BB6A'];
    if (status === 'connecting') return ['#FF9800', '#FFB74D'];
    return ['#F44336', '#EF5350'];
  };

  const getStatusText = () => {
    if (status === true) return 'Connected';
    if (status === 'connecting') return 'Connecting...';
    return 'Disconnected';
  };

  const getIconName = () => {
    if (status === true) return 'check-circle';
    if (status === 'connecting') return 'loading';
    return 'alert-circle';
  };

  return (
    <View style={styles.cardWrapper}>
      <GradientCard
        colors={getGradientColors()}
        style={styles.card}
        mode="elevated"
      >
        <BlurView intensity={10} tint="light" style={styles.blurContainer}>
          <View style={styles.content}>
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <MaterialCommunityIcons
                  name={getIconName()}
                  size={48}
                  color="white"
                  style={styles.iconShadow}
                />
              </View>
              
              <View style={styles.titleContainer}>
                <Text variant="headlineSmall" style={styles.title}>
                  {title}
                </Text>
                <Chip
                  mode="flat"
                  style={styles.statusChip}
                  textStyle={styles.chipText}
                  icon={status === 'connecting' ? 'loading' : undefined}
                >
                  {getStatusText()}
                </Chip>
              </View>
            </View>

            {subtitle && (
              <Text variant="bodyLarge" style={styles.subtitle}>
                {subtitle}
              </Text>
            )}

            {(lastUpdate || additionalInfo) && (
              <View style={styles.infoContainer}>
                {lastUpdate && (
                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons
                      name="clock-outline"
                      size={18}
                      color="white"
                      style={styles.infoIcon}
                    />
                    <Text variant="bodyMedium" style={styles.infoText}>
                      Last update: {lastUpdate}
                    </Text>
                  </View>
                )}
                
                {additionalInfo && (
                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons
                      name="information-outline"
                      size={18}
                      color="white"
                      style={styles.infoIcon}
                    />
                    <Text variant="bodyMedium" style={styles.infoText}>
                      {additionalInfo}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </BlurView>
      </GradientCard>
    </View>
  );
};

const styles = StyleSheet.create({
  cardWrapper: {
    marginBottom: 16,
  },
  card: {
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  blurContainer: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    marginRight: 16,
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
  },
  iconShadow: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontWeight: '700',
    color: 'white',
    marginBottom: 8,
  },
  statusChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    alignSelf: 'flex-start',
  },
  chipText: {
    color: 'white',
    fontWeight: '600',
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 12,
  },
  infoContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  infoIcon: {
    marginRight: 8,
  },
  infoText: {
    color: 'white',
    fontWeight: '500',
  },
});

export default StatusCard;