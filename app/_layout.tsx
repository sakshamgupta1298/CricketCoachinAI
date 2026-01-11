import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Provider as PaperProvider, useTheme as usePaperTheme } from 'react-native-paper';
import { useColorScheme } from 'react-native';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

// Import context
import { AuthProvider } from '../src/context/AuthContext';
import { UploadProvider } from '../src/context/UploadContext';

// Import theme
import { lightTheme, darkTheme } from '../src/theme';

function ThemedApp() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

  return (
    <PaperProvider theme={theme}>
      <AuthProvider>
        <UploadProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: theme.colors.background },
            }}
            initialRouteName="landing"
          >
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
