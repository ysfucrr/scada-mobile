import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
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
  onLongPress?: () => void;
  onPress?: () => void;
  isBeingDragged?: boolean;
  draggedIndex?: number;
  myIndex?: number;
  onDrop?: (index: number) => void;
  noMargin?: boolean; // If true, removes marginBottom from cardWrapper
}

const WidgetCard: React.FC<WidgetCardProps> = ({
  id,
  title,
  registers = [],
  gradientColors,
  icon = 'gauge',
  onLongPress,
  onPress,
  isBeingDragged = false,
  draggedIndex,
  myIndex,
  onDrop,
  noMargin = false
}) => {
  const theme = useTheme() as AppTheme;
  const { isDarkMode } = useAppTheme();
  
  // Professional single color gradient - consistent and serious
  const effectiveGradientColors = gradientColors || (
    isDarkMode 
      ? ['#1E3A5F', '#2D4F7C', '#3A6599'] as [string, string, ...string[]] // Professional dark blue
      : ['#1E88E5', '#42A5F5', '#64B5F6'] as [string, string, ...string[]] // Professional light blue
  );
  
  // Animations - Reanimated 3
  // Always start with visible values to prevent white flash on tab switch or re-render
  const cardOpacity = useSharedValue(1);
  const cardTranslateY = useSharedValue(0);
  const breathingAnim = useSharedValue(1);
  
  // Breathing animation - Reanimated 3
  useEffect(() => {
    if (isBeingDragged) {
      breathingAnim.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    } else {
      breathingAnim.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.ease) });
    }
  }, [isBeingDragged]);

  // Animated styles
  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [
      { translateY: cardTranslateY.value },
      { scale: isBeingDragged ? breathingAnim.value : 1 },
    ],
  }));
  
  
  const canDrop = draggedIndex !== undefined && draggedIndex !== myIndex;
  const isSelected = draggedIndex !== undefined && draggedIndex === myIndex;

  const handlePress = () => {
    // Eğer bu widget seçiliyse, seçimi kaldır
    if (isSelected && onPress) {
      onPress();
    } 
    // Eğer başka bir widget seçiliyse ve bu widget'a drop yapılabilirse, drop yap
    else if (canDrop && onDrop && draggedIndex !== undefined) {
      onDrop(myIndex || 0);
    }
  };

  return (
    <Animated.View
      style={[
        cardStyle,
      ]}
    >
      <TouchableOpacity
        onLongPress={onLongPress}
        onPress={handlePress}
        delayLongPress={500}
        activeOpacity={0.9}
      >
        <Animated.View
            style={[
            styles.cardWrapper,
            noMargin && styles.cardWrapperNoMargin,
            isBeingDragged && styles.beingDragged,
            draggedIndex !== undefined && myIndex !== draggedIndex && styles.dropTarget,
          ]}
        >
          <GradientCard
            colors={effectiveGradientColors}
            style={styles.card}
            mode="elevated"
            onPress={undefined}
          >
        <View style={styles.cardOverflowWrapper}>
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
                  size={24}
                  color="white"
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
                            register.isLive && styles.liveValue,
                          ]}
                          numberOfLines={1}
                          allowFontScaling={false}
                        >
                          {String(register.value)}
                        </Text>
                        {register.scaleUnit && (
                          <Text style={styles.unit} numberOfLines={1} allowFontScaling={false}>
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
        </View>
      </GradientCard>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  beingDragged: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 15,
  },
  dropTarget: {
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    borderStyle: 'dashed',
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardWrapper: {
    marginBottom: 12,
  },
  cardWrapperNoMargin: {
    marginBottom: 0,
  },
  card: {
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    borderRadius: 24,
    overflow: 'hidden',
  },
  cardOverflowWrapper: {
    overflow: 'hidden',
    borderRadius: 20,
  },
  blurContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    padding: 18,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.15)',
  },
  iconWrapper: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 14,
    padding: 10,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontWeight: '700',
    color: 'white',
    fontSize: 18,
    flex: 1,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  countChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderWidth: 0,
    minWidth: 44,
    height: 32,
    borderRadius: 8,
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
    gap: 10,
    justifyContent: 'center',
  },
  registerCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 18,
    padding: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    minHeight: 90,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  liveIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(244, 67, 54, 0.3)',
    borderRadius: 8,
    padding: 4,
    shadowColor: '#F44336',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 3,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F44336',
    shadowColor: '#F44336',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  registerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    minWidth: 0,
  },
  registerLabel: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '600',
    fontSize: 11,
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 0.5,
    width: '100%',
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    justifyContent: 'center',
    width: '100%',
    flexWrap: 'nowrap',
    minWidth: 0,
  },
  registerValue: {
    fontWeight: '800',
    color: '#FFFFFF',
    fontSize: 20,
    letterSpacing: 0.3,
    flexShrink: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  liveValue: {
    color: '#F44336',
  },
  unit: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 2,
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