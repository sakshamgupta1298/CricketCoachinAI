import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
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
  useEffect(() => {
    console.log('🚀 [APP] CrickCoach App starting...');
    console.log('🔧 [APP] Development mode:', __DEV__);
    
    // Initialize API service
    apiService.initialize();
    
    console.log('✅ [APP] App initialization complete');
  }, []);

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <AuthProvider>
          <UploadProvider>
            <NavigationContainer>
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