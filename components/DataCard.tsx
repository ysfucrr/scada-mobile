import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { MotiView } from 'moti';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Divider, IconButton, Text, useTheme } from 'react-native-paper';
import { useTheme as useAppTheme } from '../context/ThemeContext';
import { AppTheme } from '../theme/theme';
import GradientCard from './GradientCard';

interface DataItem {
  id: string;
  label: string;
  value: string | number;
  unit?: string;
  isLive?: boolean;
}

interface DataCardProps {
  title: string;
  data: DataItem[];
  icon?: string;
  onRefresh?: () => void;
  isLoading?: boolean;
  gradientColors?: readonly [string, string, ...string[]];
}

const DataCard: React.FC<DataCardProps> = ({
  title,
  data,
  icon,
  onRefresh,
  isLoading = false,
  gradientColors
}) => {
  const theme = useTheme() as AppTheme;
  const { isDarkMode } = useAppTheme();
  
  const effectiveGradientColors = gradientColors || (isDarkMode ? ['#263238', '#37474F'] as const : ['#1E88E5', '#42A5F5'] as const);

  return (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'spring', damping: 12, stiffness: 100 }}
      style={styles.cardWrapper}
    >
      <GradientCard
        colors={effectiveGradientColors}
        style={styles.card}
        mode="elevated"
      >
        <BlurView intensity={isDarkMode ? 20 : 15} tint={isDarkMode ? "dark" : "light"} style={styles.blurContainer}>
          <View style={styles.content}>
            <View style={styles.header}>
              <View style={styles.titleContainer}>
                {icon && (
                  <View style={styles.iconWrapper}>
                    <MaterialCommunityIcons
                      name={icon as any}
                      size={24}
                      color="white"
                      style={styles.icon}
                    />
                  </View>
                )}
                <Text variant="titleLarge" style={styles.title}>
                  {title}
                </Text>
              </View>
              
              {onRefresh && (
                <IconButton
                  icon="refresh"
                  size={24}
                  iconColor="white"
                  onPress={onRefresh}
                  disabled={isLoading}
                  style={styles.refreshButton}
                />
              )}
            </View>
            
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator animating={true} color="white" />
              </View>
            ) : data.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No data available</Text>
              </View>
            ) : (
              <View style={styles.dataContainer}>
                {data.map((item, index) => (
                  <View key={item.id || index}>
                    {index > 0 && <Divider style={styles.divider} />}
                    <View style={styles.dataRow}>
                      <View style={styles.labelContainer}>
                        <Text variant="bodyMedium" style={styles.label}>
                          {item.label}
                        </Text>
                      </View>
                      <View style={styles.valueContainer}>
                        <Text
                          variant="titleMedium"
                          style={[
                            styles.value,
                            item.isLive && styles.liveValue
                          ]}
                        >
                          {item.value}
                        </Text>
                        {item.unit && (
                          <Text variant="bodySmall" style={styles.unit}>
                            {item.unit}
                          </Text>
                        )}
                        {item.isLive && (
                          <View style={styles.liveIndicator}>
                            <MaterialCommunityIcons
                              name="circle"
                              size={8}
                              color="#4CAF50"
                            />
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </BlurView>
      </GradientCard>
    </MotiView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconWrapper: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    padding: 8,
    marginRight: 12,
  },
  icon: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  title: {
    fontWeight: '700',
    color: 'white',
  },
  refreshButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontStyle: 'italic',
  },
  dataContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 12,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  labelContainer: {
    flex: 1,
    paddingRight: 12,
  },
  label: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  value: {
    fontWeight: '700',
    color: 'white',
  },
  liveValue: {
    color: '#4CAF50',
    textShadowColor: 'rgba(76, 175, 80, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  unit: {
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 4,
  },
  liveIndicator: {
    marginLeft: 8,
    shadowColor: '#4CAF50',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 5,
  },
  divider: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginVertical: 4,
  },
});

export default DataCard;