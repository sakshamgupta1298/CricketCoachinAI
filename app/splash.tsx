import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    getResponsiveFontSize,
    getResponsiveSize,
    screenWidth
} from '../src/utils/responsive';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Loading Dots Component
const LoadingDots = ({ color, dotSize = 8, gap = 8 }: { color: string; dotSize?: number; gap?: number }) => {
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
    <View style={[styles.loadingDots, { gap }]}>
      <Animated.View style={[
        styles.dot, 
        { 
          backgroundColor: color,
          width: dotSize,
          height: dotSize,
          borderRadius: dotSize / 2,
        }, 
        dot1Style
      ]} />
      <Animated.View style={[
        styles.dot, 
        { 
          backgroundColor: color,
          width: dotSize,
          height: dotSize,
          borderRadius: dotSize / 2,
        }, 
        dot2Style
      ]} />
      <Animated.View style={[
        styles.dot, 
        { 
          backgroundColor: color,
          width: dotSize,
          height: dotSize,
          borderRadius: dotSize / 2,
        }, 
        dot3Style
      ]} />
    </View>
  );
};

export default function SplashScreenComponent() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [imageError, setImageError] = React.useState(false);
  
  // Animation values
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(1); // Start visible
  
  // Responsive dimensions
  const logoSize = getResponsiveSize(150);
  const appNameFontSize = getResponsiveFontSize(32);
  const taglineFontSize = getResponsiveFontSize(16);
  const logoMarginBottom = getResponsiveSize(40);
  const textMarginBottom = getResponsiveSize(60);
  const loadingMarginTop = getResponsiveSize(20);
  const dotSize = Math.max(getResponsiveSize(8), 6); // Minimum 6px
  const dotGap = getResponsiveSize(8);

  useEffect(() => {
    // Hide native splash screen immediately to show our custom one
    SplashScreen.hideAsync();
    // Animate splash icon entrance with bounce effect, then keep it static
    scale.value = withSequence(
      withTiming(0.5, { duration: 0 }), // Start small
      withTiming(1.2, { duration: 1200, easing: Easing.out(Easing.exp) }), // Bounce up
      withTiming(1, { duration: 600, easing: Easing.inOut(Easing.exp) }) // Settle to static
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
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.secondary, theme.colors.tertiary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.content}>
          {/* Splash Icon */}
          <Animated.View 
            style={[
              styles.logoContainer, 
              { marginBottom: logoMarginBottom },
              logoAnimatedStyle
            ]}
            entering={FadeIn.duration(800)}
            exiting={FadeOut.duration(500)}
          >
            <Image
              source={imageError 
                ? require('../assets/images/logo-icon.png')
                : require('../assets/images/splash-icon.png')
              }
              style={[styles.logo, { width: logoSize, height: logoSize }]}
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
            style={[
              styles.textContainer, 
              { marginBottom: textMarginBottom },
              textAnimatedStyle
            ]}
            entering={FadeIn.delay(800).duration(1000)}
            exiting={FadeOut.duration(500)}
          >
            <Text style={[
              styles.appName, 
              { 
                color: '#FFFFFF',
                fontSize: appNameFontSize,
              }
            ]}>
              CricketCoach AI
            </Text>
            <Text style={[
              styles.tagline, 
              { 
                color: '#FFFFFF',
                fontSize: taglineFontSize,
              }
            ]}>
              Your AI-Powered Cricket Coach
            </Text>
          </Animated.View>

          {/* Loading Indicator */}
          <Animated.View 
            style={[
              styles.loadingContainer, 
              { marginTop: loadingMarginTop },
              textAnimatedStyle
            ]}
            entering={FadeIn.delay(1200).duration(1000)}
          >
            <LoadingDots 
              color="#FFFFFF" 
              dotSize={dotSize}
              gap={dotGap}
            />
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
    paddingHorizontal: screenWidth * 0.1, // 10% padding on sides
  },
  logoContainer: {
    // marginBottom is set dynamically
  },
  logo: {
    // width and height are set dynamically
  },
  textContainer: {
    alignItems: 'center',
    // marginBottom is set dynamically
  },
  appName: {
    fontWeight: 'bold',
    marginBottom: 8,
    letterSpacing: 1,
    textAlign: 'center',
    // fontSize is set dynamically
  },
  tagline: {
    fontWeight: '400',
    opacity: 0.9,
    textAlign: 'center',
    // fontSize is set dynamically
  },
  loadingContainer: {
    // marginTop is set dynamically
  },
  loadingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    // width, height, and borderRadius are set dynamically
  },
});

