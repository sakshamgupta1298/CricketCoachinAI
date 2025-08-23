// CrickCoach Design System
// Modern, professional, and sports-inspired design system

export const Colors = {
  // Primary Colors
  primary: {
    50: '#E3F2FD',
    100: '#BBDEFB',
    200: '#90CAF9',
    300: '#64B5F6',
    400: '#42A5F5',
    500: '#2196F3', // Primary Blue
    600: '#1E88E5',
    700: '#1976D2',
    800: '#1565C0',
    900: '#0D47A1',
  },
  
  // Secondary Colors (Lime Green)
  secondary: {
    50: '#F1F8E9',
    100: '#DCEDC8',
    200: '#C5E1A5',
    300: '#AED581',
    400: '#9CCC65',
    500: '#8BC34A', // Secondary Green
    600: '#7CB342',
    700: '#689F38',
    800: '#558B2F',
    900: '#33691E',
  },
  
  // Accent Colors (Orange)
  accent: {
    50: '#FFF3E0',
    100: '#FFE0B2',
    200: '#FFCC80',
    300: '#FFB74D',
    400: '#FFA726',
    500: '#FF9800', // Accent Orange
    600: '#FB8C00',
    700: '#F57C00',
    800: '#EF6C00',
    900: '#E65100',
  },
  
  // Neutral Colors
  neutral: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#EEEEEE',
    300: '#E0E0E0',
    400: '#BDBDBD',
    500: '#9E9E9E',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
  },
  
  // Status Colors
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  info: '#2196F3',
  
  // Background Colors
  background: {
    light: '#FFFFFF',
    lightSecondary: '#F8F9FA',
    dark: '#121212',
    darkSecondary: '#1E1E1E',
  },
  
  // Text Colors
  text: {
    primary: '#212121',
    secondary: '#757575',
    disabled: '#BDBDBD',
    inverse: '#FFFFFF',
  },
};

export const Typography = {
  // Font Families
  fontFamily: {
    primary: 'Inter',
    secondary: 'Poppins',
    mono: 'SF Mono',
  },
  
  // Font Sizes
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
  },
  
  // Font Weights
  fontWeight: {
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },
  
  // Line Heights
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
  
  // Letter Spacing
  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
  '4xl': 96,
};

export const BorderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 24, // Primary radius as specified
  '3xl': 32,
  full: 9999,
};

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
};

export const Transitions = {
  fast: 150,
  normal: 300,
  slow: 500,
};

// Component-specific styles
export const ComponentStyles = {
  // Card Styles
  card: {
    backgroundColor: Colors.background.light,
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.lg,
    ...Shadows.md,
  },
  
  // Button Styles
  button: {
    primary: {
      backgroundColor: Colors.primary[500],
      borderRadius: BorderRadius.xl,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.xl,
    },
    secondary: {
      backgroundColor: Colors.secondary[500],
      borderRadius: BorderRadius.xl,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.xl,
    },
    outline: {
      borderWidth: 2,
      borderColor: Colors.primary[500],
      borderRadius: BorderRadius.xl,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.xl,
    },
  },
  
  // Input Styles
  input: {
    backgroundColor: Colors.background.lightSecondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.neutral[300],
  },
  
  // Modal Styles
  modal: {
    backgroundColor: Colors.background.light,
    borderRadius: BorderRadius['2xl'],
    margin: Spacing.lg,
    padding: Spacing.xl,
    ...Shadows.xl,
  },
};

// Dark mode variants
export const DarkColors = {
  ...Colors,
  background: {
    light: Colors.background.dark,
    lightSecondary: Colors.background.darkSecondary,
    dark: Colors.background.light,
    darkSecondary: Colors.background.lightSecondary,
  },
  text: {
    primary: Colors.text.inverse,
    secondary: Colors.neutral[400],
    disabled: Colors.neutral[600],
    inverse: Colors.text.primary,
  },
};

export default {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
  Transitions,
  ComponentStyles,
  DarkColors,
};
