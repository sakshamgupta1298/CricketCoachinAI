import { MD3LightTheme, MD3DarkTheme, configureFonts } from 'react-native-paper';
import { useColorScheme } from 'react-native';

// Premium Typography Configuration
const fontConfig = {
  displayLarge: {
    fontFamily: 'System',
    fontSize: 57,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
    lineHeight: 64,
  },
  displayMedium: {
    fontFamily: 'System',
    fontSize: 45,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
    lineHeight: 52,
  },
  displaySmall: {
    fontFamily: 'System',
    fontSize: 36,
    fontWeight: '600' as const,
    letterSpacing: 0,
    lineHeight: 44,
  },
  headlineLarge: {
    fontFamily: 'System',
    fontSize: 32,
    fontWeight: '700' as const,
    letterSpacing: 0,
    lineHeight: 40,
  },
  headlineMedium: {
    fontFamily: 'System',
    fontSize: 28,
    fontWeight: '600' as const,
    letterSpacing: 0,
    lineHeight: 36,
  },
  headlineSmall: {
    fontFamily: 'System',
    fontSize: 24,
    fontWeight: '600' as const,
    letterSpacing: 0,
    lineHeight: 32,
  },
  titleLarge: {
    fontFamily: 'System',
    fontSize: 22,
    fontWeight: '600' as const,
    letterSpacing: 0,
    lineHeight: 28,
  },
  titleMedium: {
    fontFamily: 'System',
    fontSize: 18,
    fontWeight: '600' as const,
    letterSpacing: 0.15,
    lineHeight: 24,
  },
  titleSmall: {
    fontFamily: 'System',
    fontSize: 16,
    fontWeight: '600' as const,
    letterSpacing: 0.1,
    lineHeight: 20,
  },
  labelLarge: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: '600' as const,
    letterSpacing: 0.1,
    lineHeight: 20,
  },
  labelMedium: {
    fontFamily: 'System',
    fontSize: 12,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
    lineHeight: 16,
  },
  labelSmall: {
    fontFamily: 'System',
    fontSize: 11,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
    lineHeight: 16,
  },
  bodyLarge: {
    fontFamily: 'System',
    fontSize: 16,
    fontWeight: '400' as const,
    letterSpacing: 0.15,
    lineHeight: 24,
  },
  bodyMedium: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: '400' as const,
    letterSpacing: 0.25,
    lineHeight: 20,
  },
  bodySmall: {
    fontFamily: 'System',
    fontSize: 12,
    fontWeight: '400' as const,
    letterSpacing: 0.4,
    lineHeight: 16,
  },
};

// Premium Color Palette - Light Mode
const lightColors = {
  primary: '#0066FF', // Vibrant blue - performance & tech
  primaryContainer: '#E3F2FD',
  secondary: '#00C896', // Premium teal - growth & progress
  secondaryContainer: '#E0F7F4',
  tertiary: '#FF6B35', // Energetic orange - action & intensity
  tertiaryContainer: '#FFE8E0',
  surface: '#FFFFFF',
  surfaceVariant: '#F8F9FA',
  background: '#FAFBFC',
  error: '#FF3B30',
  errorContainer: '#FFEBEE',
  onPrimary: '#FFFFFF',
  onSecondary: '#FFFFFF',
  onTertiary: '#FFFFFF',
  onSurface: '#1A1A1A',
  onSurfaceVariant: '#6B7280',
  onBackground: '#1A1A1A',
  onError: '#FFFFFF',
  outline: '#E5E7EB',
  outlineVariant: '#F3F4F6',
  shadow: '#000000',
  scrim: '#000000',
  inverseSurface: '#1A1A1A',
  inverseOnSurface: '#FFFFFF',
  inversePrimary: '#0066FF',
  elevation: {
    level0: 'transparent',
    level1: '#FFFFFF',
    level2: '#FFFFFF',
    level3: '#FFFFFF',
    level4: '#FFFFFF',
    level5: '#FFFFFF',
  },
};

// Premium Color Palette - Dark Mode
const darkColors = {
  primary: '#3B82F6', // Brighter blue for dark mode
  primaryContainer: '#1E3A5F',
  secondary: '#10B981', // Brighter teal for dark mode
  secondaryContainer: '#064E3B',
  tertiary: '#F97316', // Brighter orange for dark mode
  tertiaryContainer: '#7C2D12',
  surface: '#1F2937',
  surfaceVariant: '#374151',
  background: '#111827',
  error: '#EF4444',
  errorContainer: '#7F1D1D',
  onPrimary: '#FFFFFF',
  onSecondary: '#FFFFFF',
  onTertiary: '#FFFFFF',
  onSurface: '#F9FAFB',
  onSurfaceVariant: '#D1D5DB',
  onBackground: '#F9FAFB',
  onError: '#FFFFFF',
  outline: '#4B5563',
  outlineVariant: '#374151',
  shadow: '#000000',
  scrim: '#000000',
  inverseSurface: '#F9FAFB',
  inverseOnSurface: '#111827',
  inversePrimary: '#3B82F6',
  elevation: {
    level0: 'transparent',
    level1: '#1F2937',
    level2: '#1F2937',
    level3: '#1F2937',
    level4: '#1F2937',
    level5: '#1F2937',
  },
};

export const lightTheme = {
  ...MD3LightTheme,
  fonts: configureFonts({ config: fontConfig }),
  colors: lightColors,
};

export const darkTheme = {
  ...MD3DarkTheme,
  fonts: configureFonts({ config: fontConfig }),
  colors: darkColors,
};

// Default to light theme
export const theme = lightTheme;

// Premium Color System
export const colors = {
  // Primary Brand Colors
  primary: {
    main: '#0066FF',
    light: '#3B82F6',
    dark: '#0052CC',
    container: '#E3F2FD',
  },
  secondary: {
    main: '#00C896',
    light: '#10B981',
    dark: '#059669',
    container: '#E0F7F4',
  },
  accent: {
    main: '#FF6B35',
    light: '#F97316',
    dark: '#EA580C',
    container: '#FFE8E0',
  },
  // Status Colors
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  // Neutral Colors
  white: '#FFFFFF',
  black: '#000000',
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
  // Cricket Colors
  cricket: {
    green: '#10B981',
    red: '#EF4444',
    blue: '#3B82F6',
    yellow: '#FBBF24',
    orange: '#F97316',
  },
};

// Enhanced Spacing System
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

// Premium Border Radius System
export const borderRadius = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  round: 9999,
};

// Enhanced Shadow System with Premium Depth
export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  xs: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 10,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.20,
    shadowRadius: 24,
    elevation: 15,
  },
  // Glassmorphism shadows
  glass: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
};

// Animation Timing
export const animations = {
  fast: 150,
  normal: 250,
  slow: 350,
  slower: 500,
  // Easing functions
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
}; 