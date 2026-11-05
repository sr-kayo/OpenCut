import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import {
  createProject,
  deleteProjectRow,
  listProjects,
  loadDocument,
  saveDocument,
} from '@/data/projects';
import { renameProject } from '@/domain/commands';
import type { CreateProjectInput, ProjectSummary } from '@/domain/types';
import { deleteProjectFiles } from '@/lib/files';

export function useProjects() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const rows = await listProjects();
      setProjects(rows);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load projects.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const create = useCallback(
    async (input: CreateProjectInput) => {
      const document = await createProject(input);
      await refresh();
      return document;
    },
    [refresh],
  );

  const rename = useCallback(
    async (projectId: string, name: string) => {
      const document = await loadDocument(projectId);
      if (!document) {
        throw new Error('Project not found.');
      }
      await saveDocument(renameProject(document, name));
      await refresh();
    },
    [refresh],
  );

  const remove = useCallback(
    async (project: ProjectSummary) => {
      await deleteProjectRow(project.id);
      deleteProjectFiles(project.id);
      await refresh();
    },
    [refresh],
  );

  return { projects, loading, error, refresh, create, rename, remove };
}
