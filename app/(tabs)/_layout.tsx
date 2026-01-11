import { Tabs } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { useTheme } from 'react-native-paper';
import { borderRadius, shadows } from '../../src/theme';

export default function TabLayout() {
  const theme = useTheme();

  const TabBarIcon = ({ name, color, focused }: { name: string; color: string; focused: boolean }) => {
    const getIcon = () => {
      switch (name) {
        case 'home': return '🏠';
        case 'upload': return '📤';
        case 'history': return '📋';
        case 'profile': return '👤';
        default: return '📱';
      }
    };

    return (
      <Text 
        style={[
          styles.icon, 
          { 
            color, 
            fontSize: focused ? 24 : 22,
            transform: [{ scale: focused ? 1.1 : 1 }],
          }
        ]}
      >
        {getIcon()}
      </Text>
    );
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopWidth: 0,
          height: 70,
          paddingBottom: 10,
          paddingTop: 10,
          ...shadows.lg,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 4,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => <TabBarIcon name="home" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="upload"
        options={{
          title: 'Upload',
          tabBarIcon: ({ color, focused }) => <TabBarIcon name="upload" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, focused }) => <TabBarIcon name="history" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => <TabBarIcon name="profile" color={color} focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  icon: {
    textAlign: 'center',
  },
});
