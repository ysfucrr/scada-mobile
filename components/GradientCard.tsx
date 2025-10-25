import { LinearGradient } from 'expo-linear-gradient';
import React, { useRef } from 'react';
import { Animated, StyleSheet, TouchableWithoutFeedback, View, ViewStyle } from 'react-native';
import { Card } from 'react-native-paper';

interface GradientCardProps {
  children: React.ReactNode;
  colors?: readonly [string, string, ...string[]];
  style?: ViewStyle;
  onPress?: () => void;
  mode?: 'elevated' | 'outlined' | 'contained';
}

const GradientCard: React.FC<GradientCardProps> = ({
  children,
  colors = ['#1E88E5', '#42A5F5'],
  style,
  onPress,
  mode = 'elevated'
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();
  };
  
  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 5,
    }).start();
  };
  
  if (onPress) {
    return (
      <Animated.View
        style={{
          transform: [{ scale: scaleAnim }],
        }}
      >
        <TouchableWithoutFeedback
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          <View>
            <Card style={[styles.card, style]} mode={mode}>
              <View style={styles.overflowWrapper}>
                <LinearGradient
                  colors={colors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.gradient}
                >
                  {children}
                </LinearGradient>
              </View>
            </Card>
          </View>
        </TouchableWithoutFeedback>
      </Animated.View>
    );
  }
  
  return (
    <Card style={[styles.card, style]} mode={mode}>
      <View style={styles.overflowWrapper}>
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {children}
        </LinearGradient>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    // Don't set overflow on the Card/Surface itself
  },
  overflowWrapper: {
    overflow: 'hidden',
    borderRadius: 16,
  },
  gradient: {
    flex: 1,
  },
});

export default GradientCard;