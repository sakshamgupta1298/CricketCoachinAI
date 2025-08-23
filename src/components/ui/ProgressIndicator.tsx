import React, { useEffect, useRef } from 'react';
import { Animated, Text, View, ViewStyle } from 'react-native';
import { Colors, Typography } from '../../design/DesignSystem';

interface ProgressIndicatorProps {
  progress: number; // 0 to 100
  size?: number;
  strokeWidth?: number;
  showPercentage?: boolean;
  color?: string;
  backgroundColor?: string;
  style?: ViewStyle;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  progress,
  size = 120,
  strokeWidth = 8,
  showPercentage = true,
  color = Colors.primary[500],
  backgroundColor = Colors.neutral[200],
  style,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: progress,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  return (
    <View style={[{ alignItems: 'center', justifyContent: 'center' }, style]}>
      <View style={{ position: 'relative', width: size, height: size }}>
        {/* Background circle */}
        <View
          style={{
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: backgroundColor,
          }}
        />
        
        {/* Progress circle */}
        <Animated.View
          style={{
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: color,
            borderTopColor: 'transparent',
            borderRightColor: 'transparent',
            transform: [{ rotate: '-90deg' }],
            strokeDasharray: circumference,
            strokeDashoffset: strokeDashoffset,
          }}
        />
        
        {/* Center content */}
        {showPercentage && (
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                fontFamily: Typography.fontFamily.primary,
                fontSize: Typography.fontSize['2xl'],
                fontWeight: Typography.fontWeight.bold,
                color: Colors.text.primary,
              }}
            >
              {Math.round(progress)}%
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};
