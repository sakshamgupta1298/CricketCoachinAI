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
import { useAuth } from '../src/context/AuthContext';
import {
  getResponsiveFontSize,
  getResponsiveSize,
  screenWidth
} from '../src/utils/responsive';

// Keep the native splash screen visible until *we* hide it.
// Important: always catch here—calling this at module scope can otherwise create
// unhandled promise rejections on reloads / edge cases.
void SplashScreen.preventAutoHideAsync().catch((e) => {
  console.log('⚠️ [SPLASH] preventAutoHideAsync failed (ignored):', (e as any)?.message ?? e);
});

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
    <View style={styles.loadingDots}>
      <Animated.View
        style={[
          styles.dot,
          {
            backgroundColor: color,
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            marginRight: gap,
          },
          dot1Style,
        ]}
      />
      <Animated.View
        style={[
          styles.dot,
          {
            backgroundColor: color,
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            marginRight: gap,
          },
          dot2Style,
        ]}
      />
      <Animated.View
        style={[
          styles.dot,
          {
            backgroundColor: color,
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            marginRight: 0,
          },
          dot3Style,
        ]}
      />
    </View>
  );
};

export default function SplashScreenComponent() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, isLoading } = useAuth();
  const [imageError, setImageError] = React.useState(false);

  // If you don't see this log, the splash route isn't mounting (or is crashing before render).
  console.log('🎬 [SPLASH] Render. isLoading=', isLoading, 'isAuthenticated=', isAuthenticated);
  
  // Animation values
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(1); // Start visible
  
  // Responsive dimensions
  const logoSize = getResponsiveSize(150);
  const appNameFontSize = getResponsiveFontSize(27);
  const taglineFontSize = getResponsiveFontSize(14);
  const logoMarginBottom = getResponsiveSize(40);
  const textMarginBottom = getResponsiveSize(60);
  const loadingMarginTop = getResponsiveSize(20);
  const dotSize = Math.max(getResponsiveSize(8), 6); // Minimum 6px
  const dotGap = getResponsiveSize(8);

  useEffect(() => {
    // Hide native splash screen to show our custom one.
    // Always catch to avoid unhandled promise rejections (can prevent JS from progressing).
    void SplashScreen.hideAsync().catch((e) => {
      console.log('⚠️ [SPLASH] hideAsync failed (ignored):', (e as any)?.message ?? e);
    });
    console.log('🎬 [SPLASH] First effect ran (hideAsync triggered)');
    // Animate splash icon entrance with bounce effect, then keep it static
    scale.value = withSequence(
      withTiming(0.5, { duration: 0 }), // Start small
      withTiming(1.2, { duration: 1200, easing: Easing.out(Easing.exp) }), // Bounce up
      withTiming(1, { duration: 600, easing: Easing.inOut(Easing.exp) }) // Settle to static
    );
    // Keep opacity at 1 (visible)
    opacity.value = 1;
  }, []);

  // Handle navigation after auth state is loaded
  useEffect(() => {
    if (!isLoading) {
      console.log('⏩ [SPLASH] Auth loading finished. isAuthenticated=', isAuthenticated);
      // Wait a bit for animation, then navigate
      const minDisplayTime = 2000; // Minimum 2 seconds for splash
      const timer = setTimeout(() => {
        if (isAuthenticated) {
          console.log('✅ [SPLASH] User is authenticated, navigating to home');
          router.replace('/(tabs)/home');
        } else {
          console.log('ℹ️ [SPLASH] User not authenticated, navigating to landing');
          router.replace('/landing');
        }
      }, minDisplayTime);

      return () => clearTimeout(timer);
    }
  }, [isLoading, isAuthenticated]);

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
  },
  dot: {
    // width, height, and borderRadius are set dynamically
  },
});

