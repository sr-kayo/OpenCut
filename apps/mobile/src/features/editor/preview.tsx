import { HugeiconsIcon } from '@hugeicons/react-native';
import { PlayIcon, PauseIcon } from '@hugeicons/core-free-icons';
import { Image } from 'expo-image';
import { VideoView } from 'expo-video';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import type { EditorDocument } from '@/domain/types';
import { usePlayback } from '@/features/editor/use-playback';
import { resolveAssetUri } from '@/lib/files';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';

interface PreviewProps {
  document: EditorDocument;
  playheadUs: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
}

export function Preview({ document, playheadUs, isPlaying, onTogglePlay }: PreviewProps) {
  const { colors } = useTheme();
  const { active, videoPlayer } = usePlayback(document, playheadUs, isPlaying);

  return (
    <View style={[styles.root, { backgroundColor: '#000000' }]}>
      {active.videoAsset?.kind === 'video' && active.videoClip ? (
        <VideoView
          contentFit="contain"
          nativeControls={false}
          player={videoPlayer}
          style={StyleSheet.absoluteFill}
        />
      ) : null}

      {active.videoAsset?.kind === 'image' ? (
        <Image
          contentFit="contain"
          source={{ uri: resolveAssetUri(active.videoAsset.uri) }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}

      {!active.videoClip ? (
        <View style={styles.empty}>
          <AppText color="rgba(255,255,255,0.55)" variant="small">
            No clip at the playhead
          </AppText>
        </View>
      ) : null}

      {!isPlaying ? (
        <Pressable
          accessibilityLabel="Play"
          accessibilityRole="button"
          onPress={onTogglePlay}
          style={styles.playOverlay}
        >
          <View style={[styles.playButton, { backgroundColor: colors.primary }]}>
            <HugeiconsIcon
              color={colors.primaryForeground}
              icon={PlayIcon}
              size={24}
            />
          </View>
        </Pressable>
      ) : (
        <Pressable
          accessibilityLabel="Pause"
          accessibilityRole="button"
          onPress={onTogglePlay}
          style={styles.pauseOverlay}
        >
          <View style={[styles.playButton, { backgroundColor: 'rgba(0,0,0,0.55)' }]}>
            <HugeiconsIcon color="#ffffff" icon={PauseIcon} size={22} />
          </View>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    position: 'absolute',
    inset: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseOverlay: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
  },
  playButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
