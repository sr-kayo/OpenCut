import { HugeiconsIcon } from '@hugeicons/react-native';
import {
  Add01Icon,
  Delete02Icon,
  Image01Icon,
  MusicNote01Icon,
  Scissor01Icon,
  Video01Icon,
  ZoomInIcon,
  ZoomOutIcon,
} from '@hugeicons/core-free-icons';
import * as Haptics from 'expo-haptics';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';

import { AppText } from '@/components/app-text';
import { IconButton } from '@/components/icon-button';
import {
  deleteClip,
  splitClip,
  trimClip,
} from '@/domain/commands';
import {
  MIN_CLIP_DURATION_US,
  type Clip,
  type EditorDocument,
} from '@/domain/types';
import { clamp, formatShortTime, snapUsToFrame } from '@/domain/time';
import { useEditorStore } from '@/features/editor/editor-store';
import { newId } from '@/lib/ids';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';

const MIN_PPS = 24;
const MAX_PPS = 220;
const LABEL_WIDTH = 46;

interface TimelineProps {
  document: EditorDocument;
  onOpenMedia: () => void;
  onOpenInspector: () => void;
}

interface ClipBlockProps {
  clip: Clip;
  document: EditorDocument;
  pps: number;
  selected: boolean;
  onSelect: () => void;
  onLongPress: () => void;
}

function TrimHandle({
  clipId,
  edge,
  pps,
}: {
  clipId: string;
  edge: 'start' | 'end';
  pps: number;
}) {
  const { colors } = useTheme();
  const origin = useRef({ startUs: 0, endUs: 0 });
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          useEditorStore.getState().setPlaying(false);
          useEditorStore.getState().beginTransaction();
          const current = useEditorStore
            .getState()
            .document?.clips.find((candidate) => candidate.id === clipId);
          if (current) {
            origin.current = {
              startUs: current.startUs,
              endUs: current.startUs + current.durationUs,
            };
          }
        },
        onPanResponderMove: (_event, gesture) => {
          const deltaUs = (gesture.dx / pps) * 1_000_000;
          const target =
            edge === 'start'
              ? origin.current.startUs + deltaUs
              : origin.current.endUs + deltaUs;
          useEditorStore.getState().updateTransaction((current) =>
            trimClip(current, clipId, edge, target),
          );
        },
        onPanResponderRelease: () => {
          useEditorStore.getState().endTransaction();
          void Haptics.selectionAsync();
        },
        onPanResponderTerminate: () => {
          useEditorStore.getState().cancelTransaction();
        },
      }),
    [clipId, edge, pps],
  );

  return (
    <View
      {...panResponder.panHandlers}
      style={[
        styles.trimHandle,
        edge === 'start' ? styles.trimHandleLeft : styles.trimHandleRight,
      ]}
    >
      <View style={[styles.trimLine, { backgroundColor: colors.primary }]} />
    </View>
  );
}

function ClipBlock({
  clip,
  document,
  pps,
  selected,
  onSelect,
  onLongPress,
}: ClipBlockProps) {
  const { colors } = useTheme();
  const asset = document.assets.find((candidate) => candidate.id === clip.assetId);
  const width = Math.max(26, (clip.durationUs / 1_000_000) * pps);
  const left = (clip.startUs / 1_000_000) * pps;
  const tint =
    asset?.kind === 'audio'
      ? colors.audio
      : asset?.kind === 'image'
        ? colors.image
        : colors.video;
  const icon =
    asset?.kind === 'audio'
      ? MusicNote01Icon
      : asset?.kind === 'image'
        ? Image01Icon
        : Video01Icon;

  return (
    <Pressable
      accessibilityLabel={`Select ${asset?.name ?? 'clip'}`}
      accessibilityRole="button"
      onLongPress={onLongPress}
      onPress={onSelect}
      style={[
        styles.clip,
        {
          left,
          width,
          backgroundColor: `${tint}22`,
          borderColor: selected ? colors.primary : tint,
        },
      ]}
    >
      <View style={styles.clipHeader}>
        <HugeiconsIcon color={tint} icon={icon} size={12} />
        <AppText numberOfLines={1} style={styles.clipName} variant="caption">
          {asset?.name ?? 'Clip'}
        </AppText>
      </View>
      <AppText color={tint} style={styles.clipDuration} variant="caption">
        {formatShortTime(clip.durationUs)}
      </AppText>
      {selected ? <TrimHandle clipId={clip.id} edge="start" pps={pps} /> : null}
      {selected ? <TrimHandle clipId={clip.id} edge="end" pps={pps} /> : null}
    </Pressable>
  );
}

export function Timeline({ document, onOpenMedia, onOpenInspector }: TimelineProps) {
  const { colors } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const playheadUs = useEditorStore((state) => state.playheadUs);
  const selectedClipId = useEditorStore((state) => state.selectedClipId);
  const setPlayhead = useEditorStore((state) => state.setPlayhead);
  const setPlaying = useEditorStore((state) => state.setPlaying);
  const selectClip = useEditorStore((state) => state.selectClip);
  const run = useEditorStore((state) => state.run);
  const [pps, setPps] = useState(78);

  const durationUs = document.clips.reduce(
    (maximum, clip) => Math.max(maximum, clip.startUs + clip.durationUs),
    0,
  );
  const selectedClip = document.clips.find((clip) => clip.id === selectedClipId) ?? null;
  const canSplit =
    selectedClip !== null &&
    playheadUs > selectedClip.startUs + MIN_CLIP_DURATION_US &&
    playheadUs <
      selectedClip.startUs + selectedClip.durationUs - MIN_CLIP_DURATION_US;
  const viewportSeconds = Math.max(8, (windowWidth - LABEL_WIDTH) / pps);
  const timelineSeconds = Math.max(viewportSeconds, durationUs / 1_000_000 + 2);
  const contentWidth = timelineSeconds * pps;
  const rulerStep = pps >= 100 ? 1 : pps >= 55 ? 2 : 5;

  const seekFromX = useCallback(
    (x: number) => {
      const us = (x / pps) * 1_000_000;
      setPlaying(false);
      setPlayhead(snapUsToFrame(us, document.project.fpsNum, document.project.fpsDen));
    },
    [document.project.fpsDen, document.project.fpsNum, pps, setPlayhead, setPlaying],
  );

  const rulerOrigin = useRef(0);
  const rulerPan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (event) => {
          rulerOrigin.current = event.nativeEvent.locationX;
          seekFromX(event.nativeEvent.locationX);
        },
        onPanResponderMove: (_event, gesture) => {
          seekFromX(rulerOrigin.current + gesture.dx);
        },
      }),
    [seekFromX],
  );

  const splitSelected = () => {
    if (!selectedClip || !canSplit) {
      return;
    }
    const clipId = newId('clip');
    run(
      (current) =>
        splitClip(current, selectedClip.id, playheadUs, clipId, Date.now()),
      { selectClipId: clipId },
    );
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const deleteSelected = () => {
    if (!selectedClip) {
      return;
    }
    run((current) => deleteClip(current, selectedClip.id), { selectClipId: null });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  const videoTrack = document.tracks.find((track) => track.kind === 'video');
  const audioTrack = document.tracks.find((track) => track.kind === 'audio');
  const clipsFor = (trackId: string | undefined) =>
    trackId
      ? document.clips
          .filter((clip) => clip.trackId === trackId)
          .sort((left, right) => left.startUs - right.startUs)
      : [];

  const ticks: number[] = [];
  for (let second = 0; second <= timelineSeconds; second += rulerStep) {
    ticks.push(second);
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.timeline, borderTopColor: colors.border }]}>
      <View style={styles.toolbar}>
        <View style={styles.toolbarGroup}>
          <IconButton
            accessibilityLabel="Zoom out"
            disabled={pps <= MIN_PPS}
            icon={<HugeiconsIcon color={colors.foreground} icon={ZoomOutIcon} size={18} />}
            onPress={() => setPps((current) => clamp(current - 16, MIN_PPS, MAX_PPS))}
            size={34}
          />
          <IconButton
            accessibilityLabel="Zoom in"
            disabled={pps >= MAX_PPS}
            icon={<HugeiconsIcon color={colors.foreground} icon={ZoomInIcon} size={18} />}
            onPress={() => setPps((current) => clamp(current + 16, MIN_PPS, MAX_PPS))}
            size={34}
          />
        </View>
        <AppText muted variant="caption">
          {formatShortTime(durationUs)}
        </AppText>
        <View style={styles.toolbarGroup}>
          <IconButton
            accessibilityLabel="Add media"
            icon={<HugeiconsIcon color={colors.foreground} icon={Add01Icon} size={19} />}
            onPress={onOpenMedia}
            size={34}
            testID="timeline-add-media"
          />
          <IconButton
            accessibilityLabel="Split clip"
            disabled={!canSplit}
            icon={<HugeiconsIcon color={colors.foreground} icon={Scissor01Icon} size={18} />}
            onPress={splitSelected}
            size={34}
            testID="timeline-split"
          />
          <IconButton
            accessibilityLabel="Delete clip"
            disabled={!selectedClip}
            icon={<HugeiconsIcon color={colors.foreground} icon={Delete02Icon} size={18} />}
            onPress={deleteSelected}
            size={34}
            testID="timeline-delete"
          />
          <IconButton
            accessibilityLabel="Open clip inspector"
            disabled={!selectedClip}
            icon={<HugeiconsIcon color={colors.foreground} icon={Video01Icon} size={18} />}
            onPress={onOpenInspector}
            size={34}
            testID="timeline-inspector"
          />
        </View>
      </View>

      <View style={styles.timelineRow}>
        <View style={[styles.labels, { borderRightColor: colors.border }]}>
          <View style={styles.rulerSpacer} />
          <View style={styles.trackLabel}>
            <AppText muted variant="caption">
              Video
            </AppText>
          </View>
          <View style={styles.trackLabel}>
            <AppText muted variant="caption">
              Audio
            </AppText>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.scroll}
        >
          <View style={{ width: contentWidth }}>
            <View
              {...rulerPan.panHandlers}
              style={[styles.ruler, { borderBottomColor: colors.border }]}
            >
              {ticks.map((second) => (
                <View
                  key={second}
                  style={[styles.tick, { left: second * pps }]}
                >
                  <View style={[styles.tickLine, { backgroundColor: colors.timelineGrid }]} />
                  <AppText muted style={styles.tickLabel} variant="caption">
                    {formatShortTime(second * 1_000_000)}
                  </AppText>
                </View>
              ))}
            </View>

            {[videoTrack, audioTrack].map((track, index) => (
              <View
                key={track?.kind ?? index}
                style={[
                  styles.track,
                  {
                    backgroundColor: colors.timelineTrack,
                    borderBottomColor: colors.border,
                  },
                ]}
              >
                {track
                  ? clipsFor(track.id).map((clip) => (
                      <ClipBlock
                        clip={clip}
                        document={document}
                        key={clip.id}
                        onLongPress={() => {
                          selectClip(clip.id);
                          onOpenInspector();
                        }}
                        onSelect={() => {
                          setPlaying(false);
                          selectClip(clip.id);
                        }}
                        pps={pps}
                        selected={clip.id === selectedClipId}
                      />
                    ))
                  : null}
              </View>
            ))}

            <View
              pointerEvents="none"
              style={[
                styles.playhead,
                {
                  left: (playheadUs / 1_000_000) * pps,
                  backgroundColor: colors.destructive,
                },
              ]}
            >
              <View style={[styles.playheadDot, { backgroundColor: colors.destructive }]} />
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    height: 222,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  toolbar: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
  },
  toolbarGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timelineRow: {
    flex: 1,
    flexDirection: 'row',
  },
  labels: {
    width: LABEL_WIDTH,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  rulerSpacer: {
    height: 22,
  },
  trackLabel: {
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  ruler: {
    height: 22,
    borderBottomWidth: StyleSheet.hairlineWidth,
    position: 'relative',
  },
  tick: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
  },
  tickLine: {
    width: StyleSheet.hairlineWidth,
    height: 6,
  },
  tickLabel: {
    position: 'absolute',
    top: 6,
    left: 4,
    fontSize: 9,
    lineHeight: 12,
  },
  track: {
    height: 58,
    borderBottomWidth: StyleSheet.hairlineWidth,
    position: 'relative',
  },
  clip: {
    position: 'absolute',
    top: 5,
    height: 48,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: 7,
    paddingVertical: 5,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  clipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  clipName: {
    flexShrink: 1,
    fontSize: 9,
  },
  clipDuration: {
    fontSize: 9,
  },
  trimHandle: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trimHandleLeft: {
    left: -1,
  },
  trimHandleRight: {
    right: -1,
  },
  trimLine: {
    width: 3,
    height: 22,
    borderRadius: 2,
  },
  playhead: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    marginLeft: -1,
  },
  playheadDot: {
    position: 'absolute',
    top: -1,
    left: -4,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
