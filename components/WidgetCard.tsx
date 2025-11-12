import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, TouchableOpacity } from 'react-native';
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
  onDrop
}) => {
  const theme = useTheme() as AppTheme;
  const { isDarkMode } = useAppTheme();
  
  // Set default gradient colors based on dark mode
  const effectiveGradientColors = gradientColors || (isDarkMode ? ['#263238', '#37474F'] as const : ['#1E88E5', '#42A5F5'] as const);
  
  // Animations
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(30)).current;
  const cardScale = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const borderGlowAnim = useRef(new Animated.Value(0)).current;
  const pulseAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  const glowAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  
  useEffect(() => {
    // Card entrance animation
    Animated.parallel([
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(cardTranslateY, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);
  
  // Sürükleme animasyonları - Belirgin pulse ve glow efekti
  useEffect(() => {
    if (isBeingDragged) {
      // Önceki animasyonları durdur
      if (pulseAnimationRef.current) {
        pulseAnimationRef.current.stop();
        pulseAnimationRef.current = null;
      }
      if (glowAnimationRef.current) {
        glowAnimationRef.current.stop();
        glowAnimationRef.current = null;
      }
      
      // Sürükleme başladığında küçültme efekti
      Animated.spring(cardScale, {
        toValue: 0.96,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }).start();
      
      // Nefes alıp verme gibi yumuşak pulse animasyonu
      pulseAnimationRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.94,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.98,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimationRef.current.start();
      
      // Border glow animasyonu - nefes alıp verme gibi yumuşak
      glowAnimationRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(borderGlowAnim, {
            toValue: 1,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
          Animated.timing(borderGlowAnim, {
            toValue: 0,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
        ])
      );
      glowAnimationRef.current.start();
      
      return () => {
        if (pulseAnimationRef.current) {
          pulseAnimationRef.current.stop();
          pulseAnimationRef.current = null;
        }
        if (glowAnimationRef.current) {
          glowAnimationRef.current.stop();
          glowAnimationRef.current = null;
        }
      };
    } else {
      // Sürükleme bittiğinde tüm animasyonları durdur ve normal boyuta dön
      if (pulseAnimationRef.current) {
        pulseAnimationRef.current.stop();
        pulseAnimationRef.current = null;
      }
      if (glowAnimationRef.current) {
        glowAnimationRef.current.stop();
        glowAnimationRef.current = null;
      }
      
      // Tüm animasyon değerlerini reset et
      Animated.parallel([
        Animated.spring(cardScale, {
          toValue: 1,
          tension: 150,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.spring(pulseAnim, {
          toValue: 1,
          tension: 150,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(borderGlowAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }),
      ]).start(() => {
        // Animasyon bittikten sonra değerleri tam olarak reset et
        cardScale.setValue(1);
        pulseAnim.setValue(1);
        borderGlowAnim.setValue(0);
      });
    }
  }, [isBeingDragged]);
  
  
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
    <TouchableOpacity
      onLongPress={onLongPress}
      onPress={handlePress}
      delayLongPress={300}
      activeOpacity={0.9}
    >
      <Animated.View
        style={[
          styles.cardWrapper,
          {
            opacity: cardOpacity,
            transform: [
              { translateY: cardTranslateY },
              { scale: Animated.multiply(cardScale, pulseAnim) },
            ],
          },
          isBeingDragged && styles.beingDragged,
          draggedIndex !== undefined && myIndex !== draggedIndex && styles.dropTarget,
        ]}
      >
        {isBeingDragged && (
          <Animated.View
            style={[
              styles.selectionGlow,
              {
                opacity: borderGlowAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.3, 0.8],
                }),
                borderWidth: borderGlowAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [3, 5],
                }),
              },
            ]}
            pointerEvents="none"
          />
        )}
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
        </View>
      </GradientCard>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  beingDragged: {
    shadowColor: '#2196F3',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.6,
    shadowRadius: 25,
    elevation: 20,
  },
  selectionGlow: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: 23,
    borderColor: '#2196F3',
    borderStyle: 'solid',
    backgroundColor: 'transparent',
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
  card: {
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    borderRadius: 20,
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
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    minHeight: 80,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  liveIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(244, 67, 54, 0.2)',
    borderRadius: 10,
    padding: 4,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F44336',
  },
  registerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerLabel: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '600',
    fontSize: 11,
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    justifyContent: 'center',
  },
  registerValue: {
    fontWeight: '800',
    color: '#FFFFFF',
    fontSize: 20,
    textAlign: 'center',
    letterSpacing: 0.3,
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