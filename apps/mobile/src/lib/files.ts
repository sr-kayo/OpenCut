import { Directory, File, Paths } from 'expo-file-system';

const ROOT_DIRECTORY = 'opencut';
const PROJECTS_DIRECTORY = 'projects';
const ASSETS_DIRECTORY = 'assets';

export function projectRelativePath(projectId: string): string {
  return `${PROJECTS_DIRECTORY}/${projectId}`;
}

export function projectDirectory(projectId: string): Directory {
  return new Directory(Paths.document, ROOT_DIRECTORY, PROJECTS_DIRECTORY, projectId);
}

function assetsDirectory(projectId: string): Directory {
  return new Directory(projectDirectory(projectId), ASSETS_DIRECTORY);
}

export function ensureProjectDirectories(projectId: string): void {
  assetsDirectory(projectId).create({ intermediates: true, idempotent: true });
}

export function resolveAssetUri(relativePath: string): string {
  return new File(Paths.document, ROOT_DIRECTORY, relativePath).uri;
}

export function assetRelativePath(
  projectId: string,
  assetId: string,
  extension: string,
): string {
  const suffix = extension ? `.${extension}` : '';
  return `${projectRelativePath(projectId)}/${ASSETS_DIRECTORY}/${assetId}${suffix}`;
}

export async function copyFileIntoProject(
  sourceUri: string,
  projectId: string,
  assetId: string,
  extension: string,
): Promise<{ relativePath: string; sizeBytes: number | null }> {
  ensureProjectDirectories(projectId);
  const source = new File(sourceUri);
  const relativePath = assetRelativePath(projectId, assetId, extension);
  const destination = new File(Paths.document, ROOT_DIRECTORY, relativePath);

  if (!source.exists) {
    throw new Error('The selected file is no longer available.');
  }

  await source.copy(destination, { overwrite: true });

  let sizeBytes: number | null = null;
  try {
    sizeBytes = destination.info().size ?? null;
  } catch {
    sizeBytes = null;
  }

  return { relativePath, sizeBytes };
}

export function deleteProjectFiles(projectId: string): void {
  const directory = projectDirectory(projectId);
  if (directory.exists) {
    directory.delete();
  }
}

export function deleteAssetFile(relativePath: string): void {
  const file = new File(Paths.document, ROOT_DIRECTORY, relativePath);
  if (file.exists) {
    file.delete();
  }
}
