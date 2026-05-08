import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from 'react-native-paper';
import { borderRadius, colors, spacing } from '../theme';

const CustomTabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  const theme = useTheme();

  const getIconName = (routeName: string) => {
    switch (routeName) {
      case 'Home':
        return '🏠';
      case 'Upload':
        return '📤';
      case 'Camera':
        return '📷';
      case 'History':
        return '📋';
      case 'Profile':
        return '👤';
      default:
        return '📱';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel || options.title || route.name;
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            style={[
              styles.tab,
              isFocused && { backgroundColor: theme.colors.primaryContainer },
            ]}
            onPress={onPress}
            activeOpacity={0.7}
          >
            <Text style={[styles.icon, { fontSize: 20 }]}>
              {getIconName(route.name)}
            </Text>
            <Text
              style={[
                styles.label,
                {
                  color: isFocused ? theme.colors.primary : theme.colors.onSurfaceVariant,
                  fontSize: 12,
                },
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingBottom: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
    ...shadows.small,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.xs,
  },
  icon: {
    marginBottom: spacing.xs,
  },
  label: {
    fontWeight: '500',
  },
});

export default CustomTabBar; 