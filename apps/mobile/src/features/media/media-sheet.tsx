import { HugeiconsIcon } from '@hugeicons/react-native';
import {
  Cancel01Icon,
  Delete02Icon,
  FileImportIcon,
  Image01Icon,
  MusicNote01Icon,
  PlusIcon,
  Video01Icon,
} from '@hugeicons/core-free-icons';
import * as Haptics from 'expo-haptics';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { AppText } from '@/components/app-text';
import { BottomSheet } from '@/components/bottom-sheet';
import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { IconButton } from '@/components/icon-button';
import { addClipFromAsset, removeAsset } from '@/domain/commands';
import type { Asset, AssetKind, EditorDocument } from '@/domain/types';
import { formatBytes, formatShortTime } from '@/domain/time';
import { useEditorStore } from '@/features/editor/editor-store';
import { useMediaImport } from '@/features/media/use-media-import';
import { deleteAssetFile } from '@/lib/files';
import { newId } from '@/lib/ids';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';

interface MediaSheetProps {
  visible: boolean;
  document: EditorDocument;
  onClose: () => void;
}

function kindIcon(kind: AssetKind) {
  if (kind === 'video') {
    return Video01Icon;
  }
  if (kind === 'audio') {
    return MusicNote01Icon;
  }
  return Image01Icon;
}

export function MediaSheet({ visible, document, onClose }: MediaSheetProps) {
  const { colors } = useTheme();
  const { importing, progress, importMedia, importAudio } = useMediaImport(
    document.project.id,
  );

  const usage = useMemo(() => {
    const counts = new Map<string, number>();
    for (const clip of document.clips) {
      counts.set(clip.assetId, (counts.get(clip.assetId) ?? 0) + 1);
    }
    return counts;
  }, [document.clips]);

  const finishImport = (result: { imported: Asset[]; failures: string[] }) => {
    if (result.imported.length > 0) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    if (result.failures.length > 0) {
      Alert.alert('Some files were not imported', result.failures.join('\n'));
    }
  };

  const handleImportMedia = async () => {
    try {
      finishImport(await importMedia());
    } catch (error) {
      Alert.alert(
        'Could not open the media library',
        error instanceof Error ? error.message : 'Try again.',
      );
    }
  };

  const handleImportAudio = async () => {
    try {
      finishImport(await importAudio());
    } catch (error) {
      Alert.alert(
        'Could not open files',
        error instanceof Error ? error.message : 'Try again.',
      );
    }
  };

  const addToTimeline = (asset: Asset) => {
    const clipId = newId('clip');
    try {
      const store = useEditorStore.getState();
      store.run(
        (current) =>
          addClipFromAsset(current, asset.id, clipId, Date.now()).document,
        { selectClipId: clipId },
      );
      store.selectClip(clipId);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      Alert.alert(
        'Could not add to timeline',
        error instanceof Error ? error.message : 'Try again.',
      );
    }
  };

  const deleteAsset = (asset: Asset) => {
    const inUse = (usage.get(asset.id) ?? 0) > 0;
    if (inUse) {
      Alert.alert(
        'Asset in use',
        'Remove the clips that use this asset before deleting it.',
      );
      return;
    }

    Alert.alert('Delete media?', `"${asset.name}" will be removed from this project.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          try {
            useEditorStore.getState().run((current) => removeAsset(current, asset.id));
            deleteAssetFile(asset.uri);
          } catch (error) {
            Alert.alert(
              'Could not delete media',
              error instanceof Error ? error.message : 'Try again.',
            );
          }
        },
      },
    ]);
  };

  return (
    <BottomSheet onClose={onClose} style={styles.sheet} visible={visible}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <AppText variant="title">Media</AppText>
          <AppText muted variant="small">
            {document.assets.length} {document.assets.length === 1 ? 'item' : 'items'} in
            this project
          </AppText>
        </View>
        <IconButton
          accessibilityLabel="Close media"
          icon={<HugeiconsIcon color={colors.foreground} icon={Cancel01Icon} size={20} />}
          onPress={onClose}
        />
      </View>

      <View style={styles.importRow}>
        <Button
          disabled={importing}
          icon={<HugeiconsIcon color={colors.primaryForeground} icon={FileImportIcon} size={17} />}
          label="Photos & videos"
          onPress={() => void handleImportMedia()}
          size="sm"
          style={styles.importButton}
        />
        <Button
          disabled={importing}
          icon={<HugeiconsIcon color={colors.foreground} icon={MusicNote01Icon} size={17} />}
          label="Audio"
          onPress={() => void handleImportAudio()}
          size="sm"
          style={styles.importButton}
          variant="outline"
        />
      </View>

      {importing ? (
        <View style={styles.progressRow}>
          <ActivityIndicator color={colors.mutedForeground} size="small" />
          <AppText muted variant="small">
            Importing {progress?.done ?? 0} of {progress?.total ?? 0}…
          </AppText>
        </View>
      ) : null}

      <FlatList
        contentContainerStyle={styles.list}
        data={document.assets}
        keyExtractor={(asset) => asset.id}
        ListEmptyComponent={
          <EmptyState
            description="Import a clip or a photo to start building your timeline."
            icon={<HugeiconsIcon color={colors.mutedForeground} icon={Image01Icon} size={28} />}
            title="No media imported"
          />
        }
        renderItem={({ item }) => {
          const inUse = (usage.get(item.id) ?? 0) > 0;
          const tone =
            item.kind === 'video' ? colors.video : item.kind === 'audio' ? colors.audio : colors.image;

          return (
            <View style={[styles.assetRow, { borderColor: colors.border }]}>
              <View style={[styles.assetIcon, { backgroundColor: `${tone}22` }]}>
                <HugeiconsIcon color={tone} icon={kindIcon(item.kind)} size={19} />
              </View>
              <View style={styles.assetCopy}>
                <AppText numberOfLines={1} variant="small">
                  {item.name}
                </AppText>
                <AppText muted variant="caption">
                  {item.kind === 'image' ? 'Image' : formatShortTime(item.durationUs ?? 0)}
                  {item.sizeBytes ? ` · ${formatBytes(item.sizeBytes)}` : ''}
                  {inUse ? ' · In use' : ''}
                </AppText>
              </View>
              <Pressable
                accessibilityLabel={`Add ${item.name} to timeline`}
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => addToTimeline(item)}
                style={[styles.rowAction, { backgroundColor: colors.secondary }]}
              >
                <HugeiconsIcon color={colors.foreground} icon={PlusIcon} size={17} />
              </Pressable>
              <Pressable
                accessibilityLabel={`Delete ${item.name}`}
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => deleteAsset(item)}
                style={styles.deleteAction}
              >
                <HugeiconsIcon
                  color={inUse ? colors.mutedForeground : colors.destructive}
                  icon={Delete02Icon}
                  size={17}
                />
              </Pressable>
            </View>
          );
        }}
        style={styles.listView}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheet: {
    height: '68%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerCopy: {
    gap: 2,
  },
  importRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  importButton: {
    flex: 1,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  listView: {
    marginTop: spacing.md,
    flex: 1,
  },
  list: {
    paddingBottom: spacing.lg,
    gap: spacing.sm,
    flexGrow: 1,
  },
  assetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  assetIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assetCopy: {
    flex: 1,
    gap: 2,
  },
  rowAction: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteAction: {
    width: 30,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
