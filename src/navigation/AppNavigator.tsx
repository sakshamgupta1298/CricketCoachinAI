import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import { ConfigurationModal } from '../components/ConfigurationModal';
import { HomeScreen } from '../screens/HomeScreen';
import { ResultsDashboard } from '../screens/ResultsDashboard';
import { SplashScreen } from '../screens/SplashScreen';
import { UploadProgressScreen } from '../screens/UploadProgressScreen';
import { VideoCaptureScreen } from '../screens/VideoCaptureScreen';

export type RootStackParamList = {
  Splash: undefined;
  Home: undefined;
  VideoCapture: undefined;
  UploadProgress: { videoUri: string };
  Results: { results: any };
  Configuration: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="VideoCapture" component={VideoCaptureScreen} />
        <Stack.Screen name="UploadProgress" component={UploadProgressScreen} />
        <Stack.Screen name="Results" component={ResultsDashboard} />
        <Stack.Screen name="Configuration" component={ConfigurationModal} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
