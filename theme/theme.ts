import { MD3LightTheme, MD3DarkTheme, configureFonts } from 'react-native-paper';
import { DefaultTheme as NavigationLightTheme, DarkTheme as NavigationDarkTheme } from '@react-navigation/native';

// Brand color: #1E88E5 (Blue 600 in Material palette)
const primaryColor = '#1E88E5';

// Font configuration
const fontConfig = {
  fontFamily: 'System',
  // Medium weight for headings
  headingFontWeight: '500',
};

// Custom light theme
export const lightTheme = {
  ...MD3LightTheme,
  ...NavigationLightTheme,
  colors: {
    ...MD3LightTheme.colors,
    ...NavigationLightTheme.colors,
    primary: primaryColor,
    primaryContainer: '#D0E4FF',
    secondary: '#0D47A1',
    secondaryContainer: '#E3F2FD',
    background: '#F5F8FA',
    surface: '#FFFFFF',
    surfaceVariant: '#F0F4F8',
    error: '#D32F2F',
    onPrimary: '#FFFFFF',
    onBackground: '#202124',
    onSurface: '#202124',
    onSurfaceVariant: '#5F6368',
    outline: '#DADCE0',
    elevation: {
      level0: 'transparent',
      level1: '#F5F8FA',
      level2: '#FFFFFF',
      level3: '#FFFFFF',
      level4: '#FFFFFF',
      level5: '#FFFFFF',
    },
    // Custom colors for SCADA elements
    success: '#4CAF50',
    warning: '#FF9800',
    danger: '#F44336',
    info: '#03A9F4',
    chartBackground: '#F5F8FA',
    chartGrid: '#DADCE0',
  },
  fonts: configureFonts({ config: fontConfig }),
  roundness: 1.5,
};

// Custom dark theme
export const darkTheme = {
  ...MD3DarkTheme,
  ...NavigationDarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    ...NavigationDarkTheme.colors,
    primary: primaryColor,
    primaryContainer: '#1565C0',
    secondary: '#90CAF9',
    secondaryContainer: '#1E3054',
    background: '#121212',
    surface: '#1E1E1E',
    surfaceVariant: '#2D2D2D',
    error: '#EF5350',
    onPrimary: '#FFFFFF',
    onBackground: '#ECEFF1',
    onSurface: '#ECEFF1',
    onSurfaceVariant: '#B0BEC5',
    outline: '#424242',
    elevation: {
      level0: 'transparent',
      level1: '#1E1E1E',
      level2: '#222222',
      level3: '#252525',
      level4: '#272727',
      level5: '#2C2C2C',
    },
    // Custom colors for SCADA elements
    success: '#66BB6A',
    warning: '#FFA726',
    danger: '#EF5350',
    info: '#29B6F6',
    chartBackground: '#1E1E1E',
    chartGrid: '#424242',
  },
  fonts: configureFonts({ config: fontConfig }),
  roundness: 1.5,
};

// Type definitions for our custom theme properties
declare global {
  namespace ReactNativePaper {
    interface ThemeColors {
      success: string;
      warning: string;
      danger: string;
      info: string;
      chartBackground: string;
      chartGrid: string;
    }
  }
}

export type AppTheme = typeof lightTheme;