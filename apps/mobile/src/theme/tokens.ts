export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;
  overlay: string;
  timeline: string;
  timelineTrack: string;
  timelineGrid: string;
  video: string;
  audio: string;
  image: string;
  success: string;
}

export const lightColors: ThemeColors = {
  background: '#ffffff',
  foreground: '#0a0a0a',
  card: '#ffffff',
  cardForeground: '#0a0a0a',
  popover: '#ffffff',
  popoverForeground: '#0a0a0a',
  primary: '#171717',
  primaryForeground: '#fafafa',
  secondary: '#f5f5f5',
  secondaryForeground: '#171717',
  muted: '#f5f5f5',
  mutedForeground: '#737373',
  accent: '#f5f5f5',
  accentForeground: '#171717',
  destructive: '#e7000b',
  destructiveForeground: '#ffffff',
  border: '#e5e5e5',
  input: '#e5e5e5',
  ring: '#a1a1a1',
  overlay: 'rgba(0, 0, 0, 0.45)',
  timeline: '#fafafa',
  timelineTrack: '#f5f5f5',
  timelineGrid: '#e5e5e5',
  video: '#3b82f6',
  audio: '#10b981',
  image: '#ec4899',
  success: '#16a34a',
};

export const darkColors: ThemeColors = {
  background: '#0a0a0a',
  foreground: '#fafafa',
  card: '#171717',
  cardForeground: '#fafafa',
  popover: '#171717',
  popoverForeground: '#fafafa',
  primary: '#e5e5e5',
  primaryForeground: '#171717',
  secondary: '#262626',
  secondaryForeground: '#fafafa',
  muted: '#262626',
  mutedForeground: '#a3a3a3',
  accent: '#262626',
  accentForeground: '#fafafa',
  destructive: '#ff6467',
  destructiveForeground: '#1a0505',
  border: 'rgba(255, 255, 255, 0.1)',
  input: 'rgba(255, 255, 255, 0.15)',
  ring: '#737373',
  overlay: 'rgba(0, 0, 0, 0.65)',
  timeline: '#111111',
  timelineTrack: '#171717',
  timelineGrid: 'rgba(255, 255, 255, 0.08)',
  video: '#60a5fa',
  audio: '#34d399',
  image: '#f472b6',
  success: '#22c55e',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 6,
  md: 8,
  lg: 10,
  xl: 16,
  full: 999,
} as const;

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  heading: 'PlayfairDisplay_700Bold',
} as const;

export const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 } as const;
