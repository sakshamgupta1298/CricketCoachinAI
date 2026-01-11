import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Surface, useTheme } from 'react-native-paper';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { borderRadius, shadows } from '../../theme';

interface PremiumCardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined' | 'glass';
  padding?: 'none' | 'small' | 'medium' | 'large';
  style?: ViewStyle;
  onPress?: () => void;
  animated?: boolean;
  delay?: number;
}

const AnimatedSurface = Animated.createAnimatedComponent(Surface);

export const PremiumCard: React.FC<PremiumCardProps> = ({
  children,
  variant = 'default',
  padding = 'medium',
  style,
  onPress,
  animated = true,
  delay = 0,
}) => {
  const theme = useTheme();

  const getVariantStyles = () => {
    switch (variant) {
      case 'elevated':
        return {
          ...shadows.lg,
          borderWidth: 0,
          backgroundColor: theme.colors.surface,
        };
      case 'outlined':
        return {
          ...shadows.none,
          borderWidth: 1,
          borderColor: theme.colors.outline,
          backgroundColor: theme.colors.surface,
        };
      case 'glass':
        return {
          ...shadows.glass,
          borderWidth: 0,
          backgroundColor: theme.colors.surface + 'E6', // 90% opacity
        };
      default:
        return {
          ...shadows.md,
          borderWidth: 0,
          backgroundColor: theme.colors.surface,
        };
    }
  };

  const getPadding = () => {
    switch (padding) {
      case 'none':
        return 0;
      case 'small':
        return 12;
      case 'medium':
        return 20;
      case 'large':
        return 28;
      default:
        return 20;
    }
  };

  const variantStyles = getVariantStyles();
  const cardPadding = getPadding();

  const cardContent = (
    <AnimatedSurface
      style={[
        styles.card,
        {
          borderRadius: borderRadius.xl,
          padding: cardPadding,
          ...variantStyles,
        },
        style,
      ]}
      entering={animated ? FadeInDown.delay(delay).springify() : undefined}
    >
      {children}
    </AnimatedSurface>
  );

  if (onPress) {
    return (
      <Animated.View entering={animated ? FadeInUp.delay(delay).springify() : undefined}>
        {cardContent}
      </Animated.View>
    );
  }

  return cardContent;
};

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
});

