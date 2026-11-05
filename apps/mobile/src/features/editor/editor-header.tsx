import { HugeiconsIcon } from '@hugeicons/react-native';
import {
  ArrowLeft01Icon,
  Film01Icon,
  Redo02Icon,
  Settings02Icon,
  Undo02Icon,
} from '@hugeicons/core-free-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { IconButton } from '@/components/icon-button';
import { useEditorStore } from '@/features/editor/editor-store';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';

interface EditorHeaderProps {
  onOpenMedia: () => void;
  onOpenInspector: () => void;
}

export function EditorHeader({ onOpenMedia, onOpenInspector }: EditorHeaderProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const project = useEditorStore((state) => state.document?.project ?? null);
  const canUndo = useEditorStore((state) => state.history.length > 0);
  const canRedo = useEditorStore((state) => state.future.length > 0);
  const hasSelection = useEditorStore((state) => state.selectedClipId !== null);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const save = useEditorStore((state) => state.save);

  const goBack = () => {
    void save().finally(() => router.back());
  };

  return (
    <View style={[styles.root, { borderBottomColor: colors.border }]}>
      <IconButton
        accessibilityLabel="Back to projects"
        icon={<HugeiconsIcon color={colors.foreground} icon={ArrowLeft01Icon} size={21} />}
        onPress={goBack}
        testID="editor-back"
      />
      <View style={styles.title}>
        <AppText numberOfLines={1} variant="title">
          {project?.name ?? 'Project'}
        </AppText>
        <AppText muted variant="caption">
          {project ? `${project.width} × ${project.height}` : ''}
        </AppText>
      </View>
      <View style={styles.actions}>
        <IconButton
          accessibilityLabel="Undo"
          disabled={!canUndo}
          icon={<HugeiconsIcon color={colors.foreground} icon={Undo02Icon} size={19} />}
          onPress={undo}
          size={34}
          testID="editor-undo"
        />
        <IconButton
          accessibilityLabel="Redo"
          disabled={!canRedo}
          icon={<HugeiconsIcon color={colors.foreground} icon={Redo02Icon} size={19} />}
          onPress={redo}
          size={34}
          testID="editor-redo"
        />
        <IconButton
          accessibilityLabel="Open media"
          icon={<HugeiconsIcon color={colors.foreground} icon={Film01Icon} size={19} />}
          onPress={onOpenMedia}
          size={34}
          testID="editor-media"
        />
        <IconButton
          accessibilityLabel="Open clip inspector"
          disabled={!hasSelection}
          icon={<HugeiconsIcon color={colors.foreground} icon={Settings02Icon} size={19} />}
          onPress={onOpenInspector}
          size={34}
          testID="editor-inspector"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    flex: 1,
    gap: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
