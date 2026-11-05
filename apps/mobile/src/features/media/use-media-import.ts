import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useState } from 'react';

import { addAsset } from '@/domain/commands';
import type { Asset, AssetKind } from '@/domain/types';
import { useEditorStore } from '@/features/editor/editor-store';
import { newId } from '@/lib/ids';
import { copyFileIntoProject } from '@/lib/files';
import {
  extensionForFile,
  kindFromMime,
  probeAudio,
  probeImage,
  probeVideo,
} from '@/lib/media';

export interface ImportResult {
  imported: Asset[];
  failures: string[];
}

interface PickedFile {
  uri: string;
  name: string;
  mimeType?: string | null;
  kind: AssetKind;
  width?: number;
  height?: number;
}

async function prepareAsset(projectId: string, file: PickedFile): Promise<Asset> {
  const assetId = newId('ast');
  const extension = extensionForFile(file.kind, file.name, file.mimeType);
  const { relativePath, sizeBytes } = await copyFileIntoProject(
    file.uri,
    projectId,
    assetId,
    extension,
  );

  let probed = { durationUs: null as number | null, width: null as number | null, height: null as number | null };
  try {
    if (file.kind === 'video') {
      probed = await probeVideo(file.uri);
    } else if (file.kind === 'audio') {
      probed = await probeAudio(file.uri);
    } else if (!file.width || !file.height) {
      probed = await probeImage(file.uri);
    }
  } catch {
    if (file.kind !== 'image') {
      throw new Error(`Could not read "${file.name}". The format may not be supported.`);
    }
  }

  return {
    id: assetId,
    projectId,
    kind: file.kind,
    uri: relativePath,
    name: file.name,
    durationUs: file.kind === 'image' ? null : probed.durationUs,
    width: file.width && file.width > 0 ? file.width : probed.width,
    height: file.height && file.height > 0 ? file.height : probed.height,
    sizeBytes,
    createdAt: Date.now(),
  };
}

export function useMediaImport(projectId: string) {
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const importFiles = useCallback(
    async (files: PickedFile[]): Promise<ImportResult> => {
      const imported: Asset[] = [];
      const failures: string[] = [];

      setImporting(true);
      setProgress({ done: 0, total: files.length });

      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        if (!file) {
          continue;
        }
        try {
          const asset = await prepareAsset(projectId, file);
          imported.push(asset);
          useEditorStore.getState().run((document) => addAsset(document, asset));
        } catch (error) {
          failures.push(
            error instanceof Error ? error.message : `Could not import "${file.name}".`,
          );
        } finally {
          setProgress({ done: index + 1, total: files.length });
        }
      }

      setImporting(false);
      setProgress(null);
      return { imported, failures };
    },
    [projectId],
  );

  const importMedia = useCallback(async (): Promise<ImportResult> => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      orderedSelection: true,
      quality: 1,
    });
    if (result.canceled) {
      return { imported: [], failures: [] };
    }

    const files: PickedFile[] = result.assets.map((asset, index) => ({
      uri: asset.uri,
      name: asset.fileName ?? `Imported media ${index + 1}.${asset.type === 'video' ? 'mp4' : 'jpg'}`,
      mimeType: asset.mimeType,
      kind: asset.type === 'video' ? 'video' : 'image',
      width: asset.width,
      height: asset.height,
    }));

    return importFiles(files);
  }, [importFiles]);

  const importAudio = useCallback(async (): Promise<ImportResult> => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'audio/*',
      multiple: true,
      copyToCacheDirectory: true,
    });
    if (result.canceled) {
      return { imported: [], failures: [] };
    }

    const files: PickedFile[] = result.assets.map((asset) => ({
      uri: asset.uri,
      name: asset.name,
      mimeType: asset.mimeType,
      kind: kindFromMime(asset.mimeType, asset.name),
    }));

    return importFiles(files);
  }, [importFiles]);

  return { importing, progress, importMedia, importAudio };
}
