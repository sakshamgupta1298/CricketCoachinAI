import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Provider as PaperProvider } from 'react-native-paper';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

// Import context
import { AuthProvider } from '../src/context/AuthContext';
import { UploadProvider } from '../src/context/UploadContext';

// Import theme
import { theme } from '../src/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <AuthProvider>
          <UploadProvider>
            <Stack
              screenOptions={{
                headerShown: false,
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
            <StatusBar style="auto" />
          </UploadProvider>
        </AuthProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
