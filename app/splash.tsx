import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import Animated, {
    Easing,
    FadeIn,
    FadeOut,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withTiming
} from 'react-native-reanimated';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Loading Dots Component
const LoadingDots = ({ color }: { color: string }) => {
  const dot1Opacity = useSharedValue(0.3);
  const dot2Opacity = useSharedValue(0.3);
  const dot3Opacity = useSharedValue(0.3);

  useEffect(() => {
    dot1Opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 600 }),
        withTiming(0.3, { duration: 600 })
      ),
      -1,
      false
    );
    
    dot2Opacity.value = withRepeat(
      withSequence(
        withDelay(200, withTiming(1, { duration: 600 })),
        withTiming(0.3, { duration: 600 })
      ),
      -1,
      false
    );
    
    dot3Opacity.value = withRepeat(
      withSequence(
        withDelay(400, withTiming(1, { duration: 600 })),
        withTiming(0.3, { duration: 600 })
      ),
      -1,
      false
    );
  }, []);

  const dot1Style = useAnimatedStyle(() => ({
    opacity: dot1Opacity.value,
  }));

  const dot2Style = useAnimatedStyle(() => ({
    opacity: dot2Opacity.value,
  }));

  const dot3Style = useAnimatedStyle(() => ({
    opacity: dot3Opacity.value,
  }));

  return (
    <View style={styles.loadingDots}>
      <Animated.View style={[styles.dot, { backgroundColor: color }, dot1Style]} />
      <Animated.View style={[styles.dot, { backgroundColor: color }, dot2Style]} />
      <Animated.View style={[styles.dot, { backgroundColor: color }, dot3Style]} />
    </View>
  );
};

export default function SplashScreenComponent() {
  const theme = useTheme();
  const [imageError, setImageError] = React.useState(false);
  
  // Animation values
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(1); // Start visible

  useEffect(() => {
    // Hide native splash screen immediately to show our custom one
    SplashScreen.hideAsync();
    // Animate splash icon entrance with bounce effect, then continuous pulsing
    scale.value = withSequence(
      withTiming(0.5, { duration: 0 }), // Start small
      withTiming(1.2, { duration: 1200, easing: Easing.out(Easing.exp) }), // Bounce up (slower)
      withTiming(1, { duration: 600, easing: Easing.inOut(Easing.exp) }), // Settle (slower)
      // Then start continuous pulsing animation
      withRepeat(
        withSequence(
          withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
          withTiming(1.05, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
          withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      )
    );
    // Keep opacity at 1 (visible)
    opacity.value = 1;

    // Simulate loading time (4 seconds)
    const timer = setTimeout(() => {
      // Navigate to landing after fade out animation
      setTimeout(() => {
        router.replace('/landing');
      }, 500);
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  const logoAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scale.value }
      ],
      opacity: opacity.value,
    };
  });

  const textAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: 1, // Always visible
    };
  });

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.secondary, theme.colors.tertiary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.content}>
          {/* Splash Icon */}
          <Animated.View 
            style={[styles.logoContainer, logoAnimatedStyle]}
            entering={FadeIn.duration(800)}
            exiting={FadeOut.duration(500)}
          >
            <Image
              source={imageError 
                ? require('../assets/images/logo-icon.png')
                : require('../assets/images/splash-icon.png')
              }
              style={styles.logo}
              contentFit="contain"
              onError={(error) => {
                console.error('Image load error:', error);
                setImageError(true);
              }}
              onLoad={() => {
                console.log('Splash icon loaded successfully');
              }}
            />
          </Animated.View>

          {/* App Name */}
          <Animated.View 
            style={[styles.textContainer, textAnimatedStyle]}
            entering={FadeIn.delay(800).duration(1000)}
            exiting={FadeOut.duration(500)}
          >
            <Text style={[styles.appName, { color: '#FFFFFF' }]}>
              CricketCoach AI
            </Text>
            <Text style={[styles.tagline, { color: '#FFFFFF' }]}>
              Your AI-Powered Cricket Coach
            </Text>
          </Animated.View>

          {/* Loading Indicator */}
          <Animated.View 
            style={[styles.loadingContainer, textAnimatedStyle]}
            entering={FadeIn.delay(1200).duration(1000)}
          >
            <LoadingDots color="#FFFFFF" />
          </Animated.View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    marginBottom: 40,
  },
  logo: {
    width: 150,
    height: 150,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 16,
    fontWeight: '400',
    opacity: 0.9,
  },
  loadingContainer: {
    marginTop: 20,
  },
  loadingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

