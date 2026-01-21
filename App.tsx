import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

// Import screens
import HistoryScreen from './src/screens/HistoryScreen';
import HomeScreen from './src/screens/HomeScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ResultsScreen from './src/screens/ResultsScreen';
import UploadScreen from './src/screens/UploadScreen';

// Import components
import CustomTabBar from './src/components/CustomTabBar';

// Import context
import { AuthProvider } from './src/context/AuthContext';
import { UploadProvider } from './src/context/UploadContext';

// Import services
import apiService from './src/services/api';

// Import theme
import { theme } from './src/theme';

const Stack = createBottomTabNavigator();

// Show notifications when app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

async function registerForPushNotificationsAsync(): Promise<string | null> {
  try {
    // Android notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('🔕 [NOTIFICATIONS] Permission not granted');
      return null;
    }

    // In SDK 53+, projectId is needed for getExpoPushTokenAsync
    const projectId =
      (Constants as any).expoConfig?.extra?.eas?.projectId ||
      (Constants as any).easConfig?.projectId;

    if (!projectId) {
      console.log('⚠️ [NOTIFICATIONS] Missing EAS projectId. Push token may not work in Expo Go.');
    }

    const tokenResponse = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();

    console.log('🔔 [NOTIFICATIONS] Expo push token:', tokenResponse.data);
    return tokenResponse.data;
  } catch (e: any) {
    console.log('❌ [NOTIFICATIONS] Failed to register:', e?.message || e);
    return null;
  }
}

function TabNavigator() {
  return (
    <Stack.Navigator
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
        }}
      />
      <Stack.Screen 
        name="Upload" 
        component={UploadScreen}
        options={{
          tabBarLabel: 'Upload',
        }}
      />
      <Stack.Screen 
        name="History" 
        component={HistoryScreen}
        options={{
          tabBarLabel: 'History',
        }}
      />
      <Stack.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
        }}
      />
    </Stack.Navigator>
  );
}

export default function App() {
  const navigationRef = React.useRef<any>(null);

  useEffect(() => {
    console.log('🚀 [APP] CrickCoach App starting...');
    console.log('🔧 [APP] Development mode:', __DEV__);
    
    // Initialize API service
    apiService.initialize();

    // Register for push notifications and store token for upload requests
    registerForPushNotificationsAsync().then(async (token) => {
      if (token) {
        console.log('✅ [NOTIFICATIONS] Expo push token acquired');
        await apiService.storePushToken(token);
      }
    });

    // When user taps notification, fetch job result and navigate to Results
    const responseSub = Notifications.addNotificationResponseReceivedListener(async (response) => {
      try {
        const data: any = response.notification.request.content.data || {};
        const jobId = data.job_id || data.jobId;
        if (!jobId) return;

        console.log('📩 [NOTIFICATIONS] Notification tapped, jobId:', jobId);
        const jobResp = await apiService.getJobResult(String(jobId));
        const jobData: any = jobResp.success ? jobResp.data : null;

        if (jobData?.status === 'completed' && jobData.result) {
          navigationRef.current?.navigate('Results', { result: jobData.result });
        } else {
          Toast.show({
            type: 'info',
            text1: 'Analysis still processing',
            text2: 'Please wait a moment and try again.',
          });
        }
      } catch (e: any) {
        console.log('❌ [NOTIFICATIONS] Failed handling notification tap:', e?.message || e);
      }
    });
    
    console.log('✅ [APP] App initialization complete');

    return () => {
      responseSub.remove();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <AuthProvider>
          <UploadProvider>
            <NavigationContainer ref={navigationRef}>
              <Stack.Navigator
                screenOptions={{
                  headerShown: false,
                }}
              >
                <Stack.Screen name="Main" component={TabNavigator} />
                <Stack.Screen 
                  name="Results" 
                  component={ResultsScreen}
                  options={{
                    headerShown: true,
                    title: 'Analysis Results',
                  }}
                />
              </Stack.Navigator>
            </NavigationContainer>
            <Toast />
            <StatusBar style="auto" />
          </UploadProvider>
        </AuthProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
} 