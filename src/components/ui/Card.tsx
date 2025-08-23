import { View, ViewStyle } from 'react-native';
import { BorderRadius, Colors, Shadows, Spacing } from '../../design/DesignSystem';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined' | 'flat';
  padding?: 'sm' | 'md' | 'lg' | 'xl';
  margin?: 'sm' | 'md' | 'lg' | 'xl';
  style?: ViewStyle;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'lg',
  margin = 'md',
  style,
}) => {
  const getPadding = () => {
    switch (padding) {
      case 'sm': return Spacing.sm;
      case 'md': return Spacing.md;
      case 'lg': return Spacing.lg;
      case 'xl': return Spacing.xl;
      default: return Spacing.lg;
    }
  };

  const getMargin = () => {
    switch (margin) {
      case 'sm': return Spacing.sm;
      case 'md': return Spacing.md;
      case 'lg': return Spacing.lg;
      case 'xl': return Spacing.xl;
      default: return Spacing.md;
    }
  };

  const getVariantStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: BorderRadius['2xl'],
      padding: getPadding(),
      margin: getMargin(),
    };

    switch (variant) {
      case 'elevated':
        return {
          ...baseStyle,
          backgroundColor: Colors.background.light,
          ...Shadows.lg,
        };
      case 'outlined':
        return {
          ...baseStyle,
          backgroundColor: Colors.background.light,
          borderWidth: 1,
          borderColor: Colors.neutral[300],
        };
      case 'flat':
        return {
          ...baseStyle,
          backgroundColor: Colors.background.lightSecondary,
        };
      default:
        return {
          ...baseStyle,
          backgroundColor: Colors.background.light,
          ...Shadows.md,
        };
    }
  };

  return (
    <View style={[getVariantStyle(), style]}>
      {children}
    </View>
  );
};
