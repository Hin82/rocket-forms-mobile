import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';

export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#e8622c',
    primaryContainer: '#fff0e8',
    secondary: '#1a1a2e',
    secondaryContainer: '#2d2d44',
    surface: '#ffffff',
    surfaceVariant: '#f5f5f7',
    background: '#fafafa',
    error: '#dc2626',
    onPrimary: '#ffffff',
    onSecondary: '#ffffff',
    onSurface: '#1a1a2e',
    onBackground: '#1a1a2e',
    outline: '#e0e0e0',
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#e8622c',
    primaryContainer: '#3d1a0a',
    secondary: '#e0e0e0',
    secondaryContainer: '#2d2d44',
    surface: '#1e1e2e',
    surfaceVariant: '#2a2a3e',
    background: '#121220',
    error: '#ef4444',
    onPrimary: '#ffffff',
    onSecondary: '#1a1a2e',
    onSurface: '#e8e8f0',
    onBackground: '#e8e8f0',
    outline: '#3a3a4e',
  },
};
