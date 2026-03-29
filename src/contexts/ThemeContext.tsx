import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const THEME_KEY = 'app_theme_mode';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface AppColors {
  background: string;
  surface: string;
  surfaceSecondary: string;
  border: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  accent: string;
  accentLight: string;
  error: string;
  success: string;
  cardBg: string;
  inputBg: string;
  tabBar: string;
  headerBg: string;
}

const darkColors: AppColors = {
  background: '#121220',
  surface: '#1e1e2e',
  surfaceSecondary: '#252540',
  border: '#2d2d44',
  text: '#ffffff',
  textSecondary: '#888888',
  textTertiary: '#555555',
  accent: '#e8622c',
  accentLight: 'rgba(232, 98, 44, 0.12)',
  error: '#cc3333',
  success: '#22c55e',
  cardBg: '#1e1e2e',
  inputBg: '#1e1e2e',
  tabBar: '#1a1a2e',
  headerBg: '#1a1a2e',
};

const lightColors: AppColors = {
  background: '#f5f5f7',
  surface: '#ffffff',
  surfaceSecondary: '#f0f0f2',
  border: '#e5e5ea',
  text: '#1c1c1e',
  textSecondary: '#8e8e93',
  textTertiary: '#aeaeb2',
  accent: '#e8622c',
  accentLight: 'rgba(232, 98, 44, 0.08)',
  error: '#ff3b30',
  success: '#34c759',
  cardBg: '#ffffff',
  inputBg: '#f5f5f7',
  tabBar: '#ffffff',
  headerBg: '#ffffff',
};

interface ThemeState {
  mode: ThemeMode;
  isDark: boolean;
  colors: AppColors;
  setMode: (mode: ThemeMode) => Promise<void>;
}

const ThemeContext = createContext<ThemeState | undefined>(undefined);

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode | undefined>(undefined);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await SecureStore.getItemAsync(THEME_KEY);
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          setModeState(saved);
        } else {
          setModeState('system');
        }
      } catch {
        setModeState('system');
      } finally {
        setIsHydrated(true);
      }
    })();
  }, []);

  const setMode = async (newMode: ThemeMode) => {
    setModeState(newMode);
    try {
      await SecureStore.setItemAsync(THEME_KEY, newMode);
    } catch (err) {
      if (__DEV__) console.warn('Failed to save theme:', err);
    }
  };

  const resolvedMode = mode ?? 'system';
  const isDark = resolvedMode === 'system' ? systemScheme === 'dark' : resolvedMode === 'dark';
  const colors = isDark ? darkColors : lightColors;

  // Prevent flash by not rendering until theme is loaded
  if (!isHydrated) return null;

  return (
    <ThemeContext.Provider value={{ mode: resolvedMode, isDark, colors, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useAppTheme must be used within AppThemeProvider');
  return context;
}
