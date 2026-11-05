import { HugeiconsIcon } from '@hugeicons/react-native';
import { Cancel01Icon, Delete02Icon, Scissor01Icon } from '@hugeicons/core-free-icons';
import * as Haptics from 'expo-haptics';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Badge } from '@/components/badge';
import { BottomSheet } from '@/components/bottom-sheet';
import { Button } from '@/components/button';
import { IconButton } from '@/components/icon-button';
import { SegmentedControl } from '@/components/segmented-control';
import { deleteClip, setClipVolume, splitClip } from '@/domain/commands';
import { MIN_CLIP_DURATION_US } from '@/domain/types';
import { formatTimecode } from '@/domain/time';
import { useEditorStore } from '@/features/editor/editor-store';
import { newId } from '@/lib/ids';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';

interface InspectorSheetProps {
  visible: boolean;
  onClose: () => void;
}

const VOLUME_OPTIONS = [
  { label: '0%', value: '0' },
  { label: '25%', value: '25' },
  { label: '50%', value: '50' },
  { label: '75%', value: '75' },
  { label: '100%', value: '100' },
];

export function InspectorSheet({ visible, onClose }: InspectorSheetProps) {
  const { colors } = useTheme();
  const document = useEditorStore((state) => state.document);
  const selectedClipId = useEditorStore((state) => state.selectedClipId);
  const playheadUs = useEditorStore((state) => state.playheadUs);
  const run = useEditorStore((state) => state.run);

  const clip = document?.clips.find((candidate) => candidate.id === selectedClipId) ?? null;
  const asset = clip
    ? document?.assets.find((candidate) => candidate.id === clip.assetId) ?? null
    : null;

  if (!document || !clip || !asset) {
    return null;
  }

  const canSplit =
    playheadUs > clip.startUs + MIN_CLIP_DURATION_US &&
    playheadUs < clip.startUs + clip.durationUs - MIN_CLIP_DURATION_US;
  const volumePercent = Math.round(clip.volume * 100);
  const nearestVolume = VOLUME_OPTIONS.reduce((nearest, option) =>
    Math.abs(Number(option.value) - volumePercent) <
    Math.abs(Number(nearest.value) - volumePercent)
      ? option
      : nearest,
  ).value;

  const split = () => {
    const clipId = newId('clip');
    run((current) => splitClip(current, clip.id, playheadUs, clipId, Date.now()), {
      selectClipId: clipId,
    });
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const remove = () => {
    run((current) => deleteClip(current, clip.id), { selectClipId: null });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    onClose();
  };

  return (
    <BottomSheet onClose={onClose} visible={visible}>
      <View style={styles.root}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <AppText variant="title">Clip</AppText>
            <AppText muted numberOfLines={1} variant="small">
              {asset.name}
            </AppText>
          </View>
          <IconButton
            accessibilityLabel="Close inspector"
            icon={<HugeiconsIcon color={colors.foreground} icon={Cancel01Icon} size={20} />}
            onPress={onClose}
          />
        </View>

        <View style={styles.badges}>
          <Badge
            label={asset.kind === 'video' ? 'Video' : asset.kind === 'audio' ? 'Audio' : 'Image'}
            tone={asset.kind}
          />
          <Badge label={`${formatTimecode(clip.durationUs, document.project.fpsNum, document.project.fpsDen)}`} />
        </View>

        <View style={[styles.info, { borderColor: colors.border }]}>
          <InfoRow label="Starts at" value={formatTimecode(clip.startUs, document.project.fpsNum, document.project.fpsDen)} />
          <InfoRow label="Ends at" value={formatTimecode(clip.startUs + clip.durationUs, document.project.fpsNum, document.project.fpsDen)} />
          <InfoRow label="Source in" value={formatTimecode(clip.sourceStartUs, document.project.fpsNum, document.project.fpsDen)} />
        </View>

        {asset.kind !== 'image' ? (
          <View style={styles.section}>
            <AppText variant="label">Volume</AppText>
            <SegmentedControl
              onChange={(value) => {
                run((current) => setClipVolume(current, clip.id, Number(value) / 100));
              }}
              options={VOLUME_OPTIONS}
              value={nearestVolume}
            />
          </View>
        ) : null}

        <View style={styles.actions}>
          <Button
            disabled={!canSplit}
            icon={<HugeiconsIcon color={colors.foreground} icon={Scissor01Icon} size={17} />}
            label="Split at playhead"
            onPress={split}
            variant="secondary"
          />
          <Button
            icon={<HugeiconsIcon color={colors.destructiveForeground} icon={Delete02Icon} size={17} />}
            label="Delete clip"
            onPress={remove}
            variant="destructive"
          />
        </View>
      </View>
    </BottomSheet>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <AppText muted variant="small">
        {label}
      </AppText>
      <AppText variant="mono">{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  info: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  section: {
    gap: spacing.sm,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
