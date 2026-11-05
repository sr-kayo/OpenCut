import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';

type BadgeTone = 'neutral' | 'video' | 'audio' | 'image' | 'destructive';

interface BadgeProps {
  label: string;
  tone?: BadgeTone;
}

export function Badge({ label, tone = 'neutral' }: BadgeProps) {
  const { colors } = useTheme();
  const palette: Record<BadgeTone, { background: string; foreground: string }> = {
    neutral: { background: colors.secondary, foreground: colors.secondaryForeground },
    video: { background: `${colors.video}22`, foreground: colors.video },
    audio: { background: `${colors.audio}22`, foreground: colors.audio },
    image: { background: `${colors.image}22`, foreground: colors.image },
    destructive: { background: `${colors.destructive}22`, foreground: colors.destructive },
  };
  const current = palette[tone];

  return (
    <View style={[styles.root, { backgroundColor: current.background }]}>
      <AppText color={current.foreground} style={styles.label}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignSelf: 'flex-start',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  label: {
    fontSize: 10,
  },
});
