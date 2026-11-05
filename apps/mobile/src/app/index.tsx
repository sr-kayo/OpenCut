import { HugeiconsIcon } from '@hugeicons/react-native';
import { Film01Icon, PlusIcon } from '@hugeicons/core-free-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { IconButton } from '@/components/icon-button';
import { ProjectCard } from '@/components/project-card';
import { ProjectFormSheet } from '@/components/project-form-sheet';
import { Screen } from '@/components/screen';
import type { ProjectSummary } from '@/domain/types';
import { useProjects } from '@/features/projects/use-projects';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';

type FormState =
  | { mode: 'create' }
  | { mode: 'rename'; project: ProjectSummary }
  | null;

export default function ProjectsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { projects, loading, error, refresh, create, rename, remove } = useProjects();
  const [form, setForm] = useState<FormState>(null);
  const [submitting, setSubmitting] = useState(false);

  const openProject = (project: ProjectSummary) => {
    router.push(`/project/${project.id}`);
  };

  const showActions = (project: ProjectSummary) => {
    Alert.alert(project.name, undefined, [
      {
        text: 'Rename',
        onPress: () => setForm({ mode: 'rename', project }),
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => confirmDelete(project),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const confirmDelete = (project: ProjectSummary) => {
    Alert.alert(
      'Delete project?',
      `"${project.name}" and its media will be removed from this device. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void remove(project).catch((caught: unknown) => {
              Alert.alert(
                'Could not delete project',
                caught instanceof Error ? caught.message : 'Try again.',
              );
            });
          },
        },
      ],
    );
  };

  const handleCreate = async (input: { name: string; width: number; height: number }) => {
    setSubmitting(true);
    try {
      const document = await create(input);
      setForm(null);
      router.push(`/project/${document.project.id}`);
    } catch (caught) {
      Alert.alert(
        'Could not create project',
        caught instanceof Error ? caught.message : 'Try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleRename = async (name: string) => {
    if (!form || form.mode !== 'rename') {
      return;
    }
    setSubmitting(true);
    try {
      await rename(form.project.id, name);
      setForm(null);
    } catch (caught) {
      Alert.alert(
        'Could not rename project',
        caught instanceof Error ? caught.message : 'Try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerCopy}>
          <AppText variant="heading">OpenCut</AppText>
          <AppText muted variant="small">
            {projects.length === 0
              ? 'A quiet place to make something.'
              : `${projects.length} ${projects.length === 1 ? 'project' : 'projects'}`}
          </AppText>
        </View>
        <IconButton
          accessibilityLabel="New project"
          icon={<HugeiconsIcon color={colors.primaryForeground} icon={PlusIcon} size={20} />}
          onPress={() => setForm({ mode: 'create' })}
          testID="new-project-button"
          style={{ backgroundColor: colors.primary }}
        />
      </View>

      {error ? (
        <View style={[styles.errorBanner, { backgroundColor: `${colors.destructive}18` }]}>
          <AppText color={colors.destructive} variant="small">
            {error}
          </AppText>
          <Button label="Retry" onPress={() => void refresh()} size="sm" variant="ghost" />
        </View>
      ) : null}

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.mutedForeground} />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={projects}
          keyExtractor={(project) => project.id}
          ListEmptyComponent={
            <EmptyState
              action={
                <Button
                  fullWidth
                  icon={<HugeiconsIcon color={colors.primaryForeground} icon={PlusIcon} size={18} />}
                  label="Create your first project"
                  onPress={() => setForm({ mode: 'create' })}
                  testID="empty-create-project"
                />
              }
              description="Import a clip, trim it, and build a timeline. Everything stays on this device."
              icon={<HugeiconsIcon color={colors.mutedForeground} icon={Film01Icon} size={30} />}
              title="No projects yet"
            />
          }
          refreshControl={
            <RefreshControl
              onRefresh={() => void refresh()}
              refreshing={false}
              tintColor={colors.mutedForeground}
            />
          }
          renderItem={({ item }) => (
            <ProjectCard
              onActions={() => showActions(item)}
              onPress={() => openProject(item)}
              project={item}
            />
          )}
        />
      )}

      <ProjectFormSheet
        initialName={form?.mode === 'rename' ? form.project.name : ''}
        mode={form?.mode ?? 'create'}
        onClose={() => setForm(null)}
        onCreate={(input) => void handleCreate(input)}
        onRename={(name) => void handleRename(name)}
        submitting={submitting}
        visible={form !== null}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerCopy: {
    gap: 2,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    padding: spacing.lg,
    gap: spacing.md,
    flexGrow: 1,
  },
});
