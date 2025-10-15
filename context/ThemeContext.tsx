import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { AppTheme, darkTheme, lightTheme } from '../theme/theme';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: AppTheme;
  themeMode: ThemeMode;
  isDarkMode: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const colorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');
  
  // Determine if dark mode based on theme mode and system preference
  const isDarkMode = 
    themeMode === 'dark' || (themeMode === 'system' && colorScheme === 'dark');
  
  const theme = isDarkMode ? darkTheme : lightTheme;

  // Load saved theme mode from storage on initial mount
  useEffect(() => {
    const loadThemeMode = async () => {
      try {
        const savedThemeMode = await AsyncStorage.getItem('themeMode');
        if (savedThemeMode && (savedThemeMode === 'light' || savedThemeMode === 'dark' || savedThemeMode === 'system')) {
          setThemeMode(savedThemeMode as ThemeMode);
        }
      } catch (error) {
        console.error('Failed to load theme mode:', error);
      }
    };

    loadThemeMode();
  }, []);

  // Save theme mode to storage when it changes
  useEffect(() => {
    const saveThemeMode = async () => {
      try {
        await AsyncStorage.setItem('themeMode', themeMode);
      } catch (error) {
        console.error('Failed to save theme mode:', error);
      }
    };

    saveThemeMode();
  }, [themeMode]);

  // Toggle between light and dark theme
  const toggleTheme = () => {
    if (themeMode === 'system') {
      // If system, set to opposite of system preference
      setThemeMode(colorScheme === 'dark' ? 'light' : 'dark');
    } else {
      // If manually set, toggle between light and dark
      setThemeMode(themeMode === 'dark' ? 'light' : 'dark');
    }
  };

  const contextValue: ThemeContextType = {
    theme,
    themeMode,
    isDarkMode,
    setThemeMode,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};