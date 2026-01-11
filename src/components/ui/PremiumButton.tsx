import React from 'react';
import { StyleSheet, TouchableOpacity, ViewStyle, ActivityIndicator, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { borderRadius, spacing } from '../../theme';

interface PremiumButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  style?: ViewStyle;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export const PremiumButton: React.FC<PremiumButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  icon,
  fullWidth = false,
  style,
}) => {
  const theme = useTheme();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
    opacity.value = withTiming(0.8, { duration: 100 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    opacity.value = withTiming(1, { duration: 100 });
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: theme.colors.primary,
          borderColor: 'transparent',
          textColor: theme.colors.onPrimary,
        };
      case 'secondary':
        return {
          backgroundColor: theme.colors.secondary,
          borderColor: 'transparent',
          textColor: theme.colors.onSecondary,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderColor: theme.colors.primary,
          textColor: theme.colors.primary,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          borderColor: 'transparent',
          textColor: theme.colors.primary,
        };
      default:
        return {
          backgroundColor: theme.colors.primary,
          borderColor: 'transparent',
          textColor: theme.colors.onPrimary,
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
          fontSize: 14,
          minHeight: 36,
        };
      case 'large':
        return {
          paddingVertical: spacing.md + 4,
          paddingHorizontal: spacing.xl,
          fontSize: 18,
          minHeight: 56,
        };
      default:
        return {
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          fontSize: 16,
          minHeight: 48,
        };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  return (
    <AnimatedTouchable
      style={[
        styles.button,
        {
          backgroundColor: variantStyles.backgroundColor,
          borderColor: variantStyles.borderColor,
          borderWidth: variant === 'outline' ? 2 : 0,
          borderRadius: borderRadius.lg,
          minHeight: sizeStyles.minHeight,
          paddingVertical: sizeStyles.paddingVertical,
          paddingHorizontal: sizeStyles.paddingHorizontal,
          opacity: disabled ? 0.5 : 1,
          width: fullWidth ? '100%' : 'auto',
        },
        animatedStyle,
        style,
      ]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      activeOpacity={0.9}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variantStyles.textColor} />
      ) : (
        <View style={styles.content}>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <Text
            style={[
              styles.text,
              {
                color: variantStyles.textColor,
                fontSize: sizeStyles.fontSize,
                fontWeight: '600',
              },
            ]}
          >
            {title}
          </Text>
        </View>
      )}
    </AnimatedTouchable>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: spacing.xs,
  },
  text: {
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});

