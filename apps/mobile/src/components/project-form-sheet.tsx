import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { BottomSheet } from '@/components/bottom-sheet';
import { Button } from '@/components/button';
import { SegmentedControl } from '@/components/segmented-control';
import { TextField } from '@/components/text-field';
import {
  ASPECT_PRESETS,
  type AspectPreset,
} from '@/domain/types';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';

interface CreateInput {
  name: string;
  width: number;
  height: number;
}

interface ProjectFormSheetProps {
  visible: boolean;
  mode: 'create' | 'rename';
  initialName?: string;
  submitting?: boolean;
  onClose: () => void;
  onCreate?: (input: CreateInput) => void;
  onRename?: (name: string) => void;
}

export function ProjectFormSheet({
  visible,
  mode,
  initialName = '',
  submitting = false,
  onClose,
  onCreate,
  onRename,
}: ProjectFormSheetProps) {
  const { colors } = useTheme();
  const [name, setName] = useState(initialName);
  const [preset, setPreset] = useState<AspectPreset>('16:9');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setName(initialName);
      setPreset('16:9');
      setError(null);
    }
  }, [initialName, visible]);

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Give your project a name.');
      return;
    }
    setError(null);
    if (mode === 'create') {
      const size = ASPECT_PRESETS[preset];
      onCreate?.({ name: trimmed, width: size.width, height: size.height });
      return;
    }
    onRename?.(trimmed);
  };

  return (
    <BottomSheet onClose={onClose} visible={visible}>
      <View style={styles.root}>
        <AppText variant="title">
          {mode === 'create' ? 'New project' : 'Rename project'}
        </AppText>
        <AppText muted variant="small">
          {mode === 'create'
            ? 'Start with the frame that matches where your video will live.'
            : 'The name is only visible to you.'}
        </AppText>

        <TextField
          autoFocus
          error={error ?? undefined}
          label="Project name"
          onChangeText={setName}
          onSubmitEditing={submit}
          placeholder="Untitled project"
          returnKeyType="done"
          value={name}
        />

        {mode === 'create' ? (
          <View style={styles.section}>
            <AppText variant="label">Aspect ratio</AppText>
            <SegmentedControl
              onChange={setPreset}
              options={[
                { label: '16:9', value: '16:9' },
                { label: '9:16', value: '9:16' },
                { label: '1:1', value: '1:1' },
              ]}
              value={preset}
            />
            <AppText muted variant="caption">
              {ASPECT_PRESETS[preset].width} × {ASPECT_PRESETS[preset].height} · 30 fps
            </AppText>
          </View>
        ) : null}

        <View style={[styles.actions, { borderTopColor: colors.border }]}>
          <Button
            disabled={submitting}
            fullWidth
            label={mode === 'create' ? 'Create project' : 'Save name'}
            loading={submitting}
            onPress={submit}
          />
          <Button
            disabled={submitting}
            fullWidth
            label="Cancel"
            onPress={onClose}
            variant="ghost"
          />
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.md,
  },
  section: {
    gap: spacing.sm,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
