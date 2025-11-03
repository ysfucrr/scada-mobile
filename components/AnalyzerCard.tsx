import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from 'react-native-paper';
import { useTheme as useAppTheme } from '../context/ThemeContext';
import { AppTheme } from '../theme/theme';
import GradientCard from './GradientCard';

interface AnalyzerStats {
  total: number;
  running: number;
}

interface AnalyzerCardProps {
  analyzerId: string;
  analyzerName: string;
  buildingName: string;
  stats: AnalyzerStats;
  onPress: () => void;
}

const AnalyzerCard: React.FC<AnalyzerCardProps> = ({
  analyzerId,
  analyzerName,
  buildingName,
  stats,
  onPress
}) => {
  const theme = useTheme() as AppTheme;
  const { isDarkMode } = useAppTheme();
  
  const gradientColors = isDarkMode ? ['#263238', '#37474F'] as const : ['#1E88E5', '#42A5F5'] as const;
  
  return (
    <View style={styles.cardWrapper}>
      <GradientCard
        colors={gradientColors}
        style={styles.analyzerCard}
        mode="elevated"
        onPress={onPress}
      >
        <BlurView
          intensity={isDarkMode ? 20 : 15}
          tint={isDarkMode ? "dark" : "light"}
          style={styles.blurContainer}
        >
          <View style={styles.analyzerContent}>
            {/* Header */}
            <View style={styles.analyzerHeader}>
              <View style={styles.iconWrapper}>
                <MaterialCommunityIcons
                  name="chart-line"
                  size={24}
                  color="white"
                />
              </View>
              <View style={styles.analyzerInfo}>
                <Text style={styles.analyzerName}>
                  {analyzerName || `Analyzer ${analyzerId}`}
                </Text>
                <Text style={styles.buildingName}>
                  {buildingName || 'Unknown Building'}
                </Text>
              </View>
              {stats.running > 0 && (
                <View style={styles.liveBadge}>
                  <View style={styles.pulseIndicator} />
                  <Text style={styles.liveText}>RUNNING</Text>
                </View>
              )}
            </View>
            
            {/* Stats */}
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>
                  {stats.total}
                </Text>
                <Text style={styles.statLabel}>
                  Total Logs
                </Text>
              </View>
              
              <View style={[styles.statCard, stats.running > 0 && styles.liveStatCard]}>
                <Text style={[styles.statValue, stats.running > 0 && styles.liveStatValue]}>
                  {stats.running}
                </Text>
                <Text style={styles.statLabel}>
                  Running
                </Text>
              </View>
            </View>
            
            {/* Footer */}
            <View style={styles.analyzerFooter}>
              <Text style={styles.tapHint}>View logs</Text>
              <MaterialCommunityIcons
                name="chevron-right"
                size={18}
                color="rgba(255,255,255,0.8)"
              />
            </View>
          </View>
        </BlurView>
      </GradientCard>
    </View>
  );
};

const styles = StyleSheet.create({
  cardWrapper: {
    marginVertical: 4,
    marginHorizontal: 0,
  },
  analyzerCard: {
    elevation: 3,
    marginBottom: 12,
  },
  blurContainer: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  analyzerContent: {
    padding: 16,
  },
  analyzerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconWrapper: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 8,
    marginRight: 12,
  },
  analyzerInfo: {
    flex: 1,
  },
  analyzerName: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
    marginBottom: 2,
  },
  buildingName: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  liveBadge: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pulseIndicator: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'white',
    marginRight: 3,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'white',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  liveStatCard: {
    backgroundColor: 'rgba(76, 175, 80, 0.25)',
    borderColor: 'rgba(76, 175, 80, 0.5)',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: 'white',
    marginBottom: 2,
  },
  liveStatValue: {
    color: '#dfe4e0ff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    fontWeight: '600',
  },
  analyzerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  tapHint: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
});

export default AnalyzerCard;