import { Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base width for scaling (iPhone X standard - 375px)
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

/**
 * Get responsive size based on screen width
 * @param size - Base size to scale
 * @returns Scaled size
 */
export const getResponsiveSize = (size: number): number => {
  const scale = SCREEN_WIDTH / BASE_WIDTH;
  return size * scale;
};

/**
 * Get responsive font size based on screen width
 * Caps scaling at 1.3x to prevent oversized text on tablets
 * @param size - Base font size
 * @returns Scaled font size
 */
export const getResponsiveFontSize = (size: number): number => {
  const scale = Math.min(SCREEN_WIDTH / BASE_WIDTH, 1.3);
  return Math.round(size * scale);
};

/**
 * Get responsive height based on screen height
 * @param size - Base height to scale
 * @returns Scaled height
 */
export const getResponsiveHeight = (size: number): number => {
  const scale = SCREEN_HEIGHT / BASE_HEIGHT;
  return size * scale;
};

/**
 * Get percentage of screen width
 * @param percentage - Percentage (0-100)
 * @returns Width in pixels
 */
export const getWidthPercentage = (percentage: number): number => {
  return (SCREEN_WIDTH * percentage) / 100;
};

/**
 * Get percentage of screen height
 * @param percentage - Percentage (0-100)
 * @returns Height in pixels
 */
export const getHeightPercentage = (percentage: number): number => {
  return (SCREEN_HEIGHT * percentage) / 100;
};

/**
 * Check if device is a tablet
 * @returns true if device width >= 768px
 */
export const isTablet = (): boolean => {
  return SCREEN_WIDTH >= 768;
};

/**
 * Check if device is a small phone
 * @returns true if device width < 360px
 */
export const isSmallPhone = (): boolean => {
  return SCREEN_WIDTH < 360;
};

/**
 * Get responsive padding/margin
 * Scales spacing values proportionally
 * @param size - Base spacing size
 * @returns Scaled spacing
 */
export const getResponsiveSpacing = (size: number): number => {
  return getResponsiveSize(size);
};

// Export screen dimensions for direct use
export const screenWidth = SCREEN_WIDTH;
export const screenHeight = SCREEN_HEIGHT;

