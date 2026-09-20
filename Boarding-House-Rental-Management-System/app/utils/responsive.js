import { Dimensions, Platform, StatusBar } from 'react-native';

const { width, height } = Dimensions.get('window');

// Breakpoints
export const BREAKPOINTS = {
  mobile: 480,
  tablet: 768,
  desktop: 1024,
  largeDesktop: 1440,
};

// Check device type
export const isMobile = width < BREAKPOINTS.tablet;
export const isTablet = width >= BREAKPOINTS.tablet && width < BREAKPOINTS.desktop;
export const isDesktop = width >= BREAKPOINTS.desktop;
export const isWeb = Platform.OS === 'web';

// Safe area top padding (accounts for notch/dynamic island)
export const safeAreaTop = Platform.OS === 'android'
  ? (StatusBar.currentHeight || 24)
  : (Platform.OS === 'ios' ? 50 : 0);

// Responsive functions
export const wp = (percentage) => {
  return (width * percentage) / 100;
};

export const hp = (percentage) => {
  return (height * percentage) / 100;
};

// Responsive font scaling (fixed: less aggressive on small phones)
export const fs = (size) => {
  if (width < BREAKPOINTS.mobile) return size * 0.95;
  if (width < BREAKPOINTS.tablet) return size;
  if (width < BREAKPOINTS.desktop) return size * 1.1;
  return size * 1.2;
};

// Responsive spacing
export const spacing = {
  xs: isDesktop ? 6 : 4,
  sm: isDesktop ? 10 : 8,
  md: isDesktop ? 16 : 12,
  lg: isDesktop ? 24 : 16,
  xl: isDesktop ? 32 : 24,
  xxl: isDesktop ? 48 : 32,
};

// Container max width for desktop
export const getContainerWidth = () => {
  if (isDesktop) return Math.min(width * 0.9, 1400);
  return width;
};

// Grid columns (changed mobile from 3 → 2 for better readability)
export const getGridColumns = () => {
  if (width >= BREAKPOINTS.largeDesktop) return 5;
  if (width >= BREAKPOINTS.desktop) return 4;
  if (width >= BREAKPOINTS.tablet) return 3;
  return 2;
};

// Responsive padding
export const getResponsivePadding = () => {
  if (isDesktop) return 40;
  if (isTablet) return 24;
  return 16;
};

// Card shadow (cross-platform)
export const cardShadow = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  android: {
    elevation: 4,
  },
  web: {
    boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
  },
  default: {},
});

// Base card style (colors applied by screens from ThemeContext)
export const cardStyle = {
  borderRadius: 16,
  borderWidth: 1,
  ...cardShadow,
};

// Accent card shadow (for primary/colored cards)
export const accentShadow = Platform.select({
  ios: {
    shadowColor: '#ff6347',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  android: {
    elevation: 6,
  },
  web: {
    boxShadow: '0 4px 16px rgba(255,99,71,0.25)',
  },
  default: {},
});
