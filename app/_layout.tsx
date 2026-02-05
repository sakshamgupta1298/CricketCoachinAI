import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import * as SplashScreen from 'expo-splash-screen';
import React from 'react';

// Import context
import { AuthProvider } from '../src/context/AuthContext';
import { UploadProvider } from '../src/context/UploadContext';

// Import theme
import { darkTheme, lightTheme } from '../src/theme';

function ThemedApp() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

  // Useful startup breadcrumb: confirms expo-router RootLayout is mounted
  console.log('🧭 [ROUTER] RootLayout mounted. initialRouteName=splash');

  // Never let iOS sit on the native splash if our custom splash route doesn't mount for some reason.
  React.useEffect(() => {
    void SplashScreen.hideAsync().catch((e) => {
      console.log('⚠️ [ROUTER] hideAsync failed (ignored):', (e as any)?.message ?? e);
    });
  }, []);

  return (
    <PaperProvider theme={theme}>
      <AuthProvider>
        <UploadProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: theme.colors.background },
            }}
            initialRouteName="splash"
          >
            <Stack.Screen 
              name="splash" 
              options={{ 
                headerShown: false,
                gestureEnabled: false,
              }} 
            />
            <Stack.Screen 
              name="landing" 
              options={{ 
                headerShown: false,
                gestureEnabled: false,
              }} 
            />
            <Stack.Screen 
              name="login" 
              options={{ 
                headerShown: false,
                gestureEnabled: false,
              }} 
            />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen 
              name="results" 
              options={{
                headerShown: true,
                title: 'Analysis Results',
                headerBackTitle: 'Back',
                headerStyle: { backgroundColor: theme.colors.surface },
                headerTintColor: theme.colors.onSurface,
              }}
            />
            <Stack.Screen 
              name="training-plan" 
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen 
              name="change-password" 
              options={{
                headerShown: true,
                title: 'Change Password',
                headerBackTitle: 'Back',
                headerStyle: { backgroundColor: theme.colors.surface },
                headerTintColor: theme.colors.onSurface,
              }}
            />
            <Stack.Screen 
              name="privacy-policy" 
              options={{
                headerShown: true,
                title: 'Privacy Policy',
                headerBackTitle: 'Back',
                headerStyle: { backgroundColor: theme.colors.surface },
                headerTintColor: theme.colors.onSurface,
              }}
            />
            <Stack.Screen 
              name="about" 
              options={{
                headerShown: true,
                title: 'About Us',
                headerBackTitle: 'Back',
                headerStyle: { backgroundColor: theme.colors.surface },
                headerTintColor: theme.colors.onSurface,
              }}
            />
            <Stack.Screen 
              name="help-and-support" 
              options={{
                headerShown: true,
                title: 'Help & Support',
                headerBackTitle: 'Back',
                headerStyle: { backgroundColor: theme.colors.surface },
                headerTintColor: theme.colors.onSurface,
              }}
            />
          </Stack>
          <Toast />
          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        </UploadProvider>
      </AuthProvider>
    </PaperProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemedApp />
    </SafeAreaProvider>
  );
}
