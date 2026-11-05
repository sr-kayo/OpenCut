import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { AppText } from '@/components/app-text';
import { useTheme } from '@/theme/ThemeProvider';
import { HIT_SLOP, fonts, radius, spacing } from '@/theme/tokens';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  accessibilityLabel,
  testID,
}: ButtonProps) {
  const { colors } = useTheme();
  const isDisabled = disabled || loading;

  const palette: Record<ButtonVariant, { background: string; foreground: string; border: string }> = {
    primary: {
      background: colors.primary,
      foreground: colors.primaryForeground,
      border: colors.primary,
    },
    secondary: {
      background: colors.secondary,
      foreground: colors.secondaryForeground,
      border: colors.secondary,
    },
    outline: {
      background: 'transparent',
      foreground: colors.foreground,
      border: colors.border,
    },
    ghost: {
      background: 'transparent',
      foreground: colors.foreground,
      border: 'transparent',
    },
    destructive: {
      background: colors.destructive,
      foreground: colors.destructiveForeground,
      border: colors.destructive,
    },
  };

  const current = palette[variant];
  const height = size === 'sm' ? 34 : size === 'lg' ? 48 : 42;

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      disabled={isDisabled}
      hitSlop={HIT_SLOP}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        {
          height,
          backgroundColor: current.background,
          borderColor: current.border,
          opacity: isDisabled ? 0.45 : pressed ? 0.78 : 1,
          paddingHorizontal: size === 'sm' ? spacing.md : spacing.lg,
        },
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={current.foreground} size="small" />
      ) : (
        <View style={styles.content}>
          {icon}
          <AppText
            color={current.foreground}
            style={{ fontFamily: fonts.semibold, fontSize: size === 'sm' ? 13 : 14 }}
          >
            {label}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  fullWidth: {
    width: '100%',
  },
});
