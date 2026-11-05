import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import {
  darkColors,
  lightColors,
  type ThemeColors,
  type ThemeMode,
} from '@/theme/tokens';

interface ThemeContextValue {
  mode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme();
  const isDark = scheme !== 'light';
  const mode: ThemeMode = isDark ? 'dark' : 'light';

  const value = useMemo(
    () => ({ mode, isDark, colors: isDark ? darkColors : lightColors }),
    [isDark, mode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error('useTheme must be used inside AppThemeProvider');
  }
  return value;
}
