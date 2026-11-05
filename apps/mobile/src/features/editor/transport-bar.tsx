import { HugeiconsIcon } from '@hugeicons/react-native';
import { PauseIcon, PlayIcon } from '@hugeicons/core-free-icons';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { IconButton } from '@/components/icon-button';
import { formatTimecode } from '@/domain/time';
import { useEditorStore } from '@/features/editor/editor-store';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';

export function TransportBar() {
  const { colors } = useTheme();
  const document = useEditorStore((state) => state.document);
  const playheadUs = useEditorStore((state) => state.playheadUs);
  const isPlaying = useEditorStore((state) => state.isPlaying);
  const setPlaying = useEditorStore((state) => state.setPlaying);

  if (!document) {
    return null;
  }

  const duration = document.clips.reduce(
    (maximum, clip) => Math.max(maximum, clip.startUs + clip.durationUs),
    0,
  );

  return (
    <View style={styles.root}>
      <AppText variant="mono" style={styles.time}>
        {formatTimecode(playheadUs, document.project.fpsNum, document.project.fpsDen)}
      </AppText>
      <IconButton
        accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
        icon={
          <HugeiconsIcon
            color={colors.primaryForeground}
            icon={isPlaying ? PauseIcon : PlayIcon}
            size={20}
          />
        }
        onPress={() => setPlaying(!isPlaying)}
        size={42}
        style={{ backgroundColor: colors.primary }}
        testID="transport-play"
      />
      <AppText muted variant="mono" style={styles.time}>
        {formatTimecode(duration, document.project.fpsNum, document.project.fpsDen)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  time: {
    minWidth: 84,
    textAlign: 'center',
  },
});
