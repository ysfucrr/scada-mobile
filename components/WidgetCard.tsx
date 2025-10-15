import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Chip, Text, useTheme } from 'react-native-paper';
import { useTheme as useAppTheme } from '../context/ThemeContext';
import { AppTheme } from '../theme/theme';
import GradientCard from './GradientCard';

interface RegisterData {
  id: string;
  label: string;
  value: number | string;
  scaleUnit?: string;
  isLive?: boolean;
}

interface WidgetCardProps {
  id: string;
  title: string;
  registers: RegisterData[];
  gradientColors?: readonly [string, string, ...string[]];
  icon?: string;
}

const WidgetCard: React.FC<WidgetCardProps> = ({
  id,
  title,
  registers = [],
  gradientColors = ['#1E88E5', '#42A5F5'],
  icon = 'gauge'
}) => {
  const theme = useTheme() as AppTheme;
  const { isDarkMode } = useAppTheme();
  
  return (
    <View style={styles.cardWrapper}>
      <GradientCard
        colors={gradientColors}
        style={styles.card}
        mode="elevated"
      >
        <BlurView
          intensity={isDarkMode ? 20 : 15}
          tint={isDarkMode ? "dark" : "light"}
          style={styles.blurContainer}
        >
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.iconWrapper}>
                <MaterialCommunityIcons
                  name={icon as any}
                  size={28}
                  color="white"
                  style={styles.iconShadow}
                />
              </View>
              
              <Text variant="titleLarge" style={styles.title}>
                {title}
              </Text>
              
              {registers.length > 0 ? (
                <Chip
                  mode="flat"
                  style={styles.countChip}
                  textStyle={styles.countChipText}
                  icon={() => (
                    <MaterialCommunityIcons name="counter" size={14} color="white" />
                  )}
                >
                  {registers.length}
                </Chip>
              ) : (
                <View style={styles.countChipPlaceholder} />
              )}
            </View>

            {/* Content */}
            {registers.length === 0 ? (
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons
                  name="gauge-empty"
                  size={64}
                  color="rgba(255, 255, 255, 0.3)"
                />
                <Text style={styles.emptyText}>No registers configured</Text>
                <Text style={styles.emptySubtext}>Add registers from web interface</Text>
              </View>
            ) : (
              <View style={styles.registersGrid}>
                {registers.map((register, index) => (
                  <View
                    key={register.id}
                    style={[
                      styles.registerCard,
                      { width: registers.length === 1 ? '100%' :
                        registers.length === 2 ? '48%' :
                        '31%' }
                    ]}
                  >
                    {register.isLive && (
                      <View style={styles.liveIndicator}>
                        <View style={styles.liveDot} />
                      </View>
                    )}
                    
                    <View style={styles.registerContent}>
                      <Text
                        variant="labelSmall"
                        style={styles.registerLabel}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {register.label}
                      </Text>
                      
                      <View style={styles.valueContainer}>
                        <Text
                          style={[
                            styles.registerValue,
                            register.isLive && styles.liveValue
                          ]}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                        >
                          {register.value}
                        </Text>
                        {register.scaleUnit && (
                          <Text style={styles.unit} numberOfLines={1}>
                            {register.scaleUnit}
                          </Text>
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
    </View>
  );
};

const styles = StyleSheet.create({
  cardWrapper: {
    marginBottom: 12,
  },
  card: {
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  blurContainer: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  content: {
    padding: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconWrapper: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 10,
    padding: 8,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
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
  title: {
    fontWeight: '700',
    color: 'white',
    fontSize: 16,
    flex: 1,
    textAlign: 'center',
  },
  countChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    minWidth: 44,
  },
  countChipPlaceholder: {
    width: 44,
  },
  countChipText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  registersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
  },
  registerCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    minHeight: 60,
    position: 'relative',
    overflow: 'hidden',
  },
  liveIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(244, 67, 54, 0.2)',
    borderRadius: 10,
    padding: 3,
  },
  liveDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#F44336',
  },
  registerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
    fontSize: 10,
    marginBottom: 4,
    textAlign: 'center',
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
    justifyContent: 'center',
  },
  registerValue: {
    fontWeight: '800',
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
  },
  liveValue: {
    color: '#F44336',
  },
  unit: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 10,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
  },
  emptySubtext: {
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 4,
    fontSize: 12,
  }
});

export default WidgetCard;