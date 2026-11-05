import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { EditorHeader } from '@/features/editor/editor-header';
import { InspectorSheet } from '@/features/editor/inspector-sheet';
import { Preview } from '@/features/editor/preview';
import { Timeline } from '@/features/editor/timeline';
import { TransportBar } from '@/features/editor/transport-bar';
import { useEditorStore } from '@/features/editor/editor-store';
import { MediaSheet } from '@/features/media/media-sheet';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';

export default function EditorScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const router = useRouter();
  const { colors } = useTheme();
  const projectId = Array.isArray(params.id) ? params.id[0] : params.id;
  const document = useEditorStore((state) => state.document);
  const status = useEditorStore((state) => state.status);
  const error = useEditorStore((state) => state.error);
  const loadProject = useEditorStore((state) => state.loadProject);
  const reset = useEditorStore((state) => state.reset);
  const setPlaying = useEditorStore((state) => state.setPlaying);
  const isPlaying = useEditorStore((state) => state.isPlaying);
  const playheadUs = useEditorStore((state) => state.playheadUs);
  const [mediaVisible, setMediaVisible] = useState(false);
  const [inspectorVisible, setInspectorVisible] = useState(false);

  useEffect(() => {
    if (!projectId) {
      return;
    }
    void loadProject(projectId);
    return () => {
      reset();
    };
  }, [loadProject, projectId, reset]);

  if (status === 'loading' || status === 'idle') {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator color={colors.mutedForeground} />
        </View>
      </Screen>
    );
  }

  if (status === 'error' || !document) {
    return (
      <Screen>
        <View style={styles.center}>
          <AppText variant="title">Could not open this project</AppText>
          <AppText muted style={styles.errorText}>
            {error ?? 'The project may have been deleted.'}
          </AppText>
          <Button label="Back to projects" onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  const togglePlay = () => setPlaying(!isPlaying);

  return (
    <Screen edges={['top', 'bottom']}>
      <EditorHeader
        onOpenInspector={() => setInspectorVisible(true)}
        onOpenMedia={() => setMediaVisible(true)}
      />
      <Preview
        document={document}
        isPlaying={isPlaying}
        onTogglePlay={togglePlay}
        playheadUs={playheadUs}
      />
      <TransportBar />
      <Timeline
        document={document}
        onOpenInspector={() => setInspectorVisible(true)}
        onOpenMedia={() => setMediaVisible(true)}
      />
      <MediaSheet
        document={document}
        onClose={() => setMediaVisible(false)}
        visible={mediaVisible}
      />
      <InspectorSheet
        onClose={() => setInspectorVisible(false)}
        visible={inspectorVisible}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  errorText: {
    textAlign: 'center',
    maxWidth: 320,
  },
});
