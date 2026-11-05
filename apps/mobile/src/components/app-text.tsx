import { StyleSheet, Text, type TextProps } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';

export type TextVariant =
  | 'body'
  | 'small'
  | 'caption'
  | 'label'
  | 'title'
  | 'heading'
  | 'mono';

interface AppTextProps extends TextProps {
  variant?: TextVariant;
  muted?: boolean;
  color?: string;
}

export function AppText({
  variant = 'body',
  muted = false,
  color,
  style,
  ...props
}: AppTextProps) {
  const { colors } = useTheme();

  return (
    <Text
      {...props}
      style={[
        styles.base,
        styles[variant],
        { color: color ?? (muted ? colors.mutedForeground : colors.foreground) },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    fontFamily: fonts.regular,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
  },
  small: {
    fontSize: 13,
    lineHeight: 18,
  },
  caption: {
    fontSize: 11,
    lineHeight: 15,
    fontFamily: fonts.medium,
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: fonts.semibold,
    letterSpacing: 0.2,
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
    fontFamily: fonts.semibold,
  },
  heading: {
    fontSize: 30,
    lineHeight: 36,
    fontFamily: fonts.heading,
  },
  mono: {
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 16,
    fontVariant: ['tabular-nums'],
  },
});
