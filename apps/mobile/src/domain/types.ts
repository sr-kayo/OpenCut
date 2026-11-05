export type AssetKind = 'video' | 'image' | 'audio';
export type TrackKind = 'video' | 'audio';

export interface Project {
  id: string;
  name: string;
  width: number;
  height: number;
  fpsNum: number;
  fpsDen: number;
  createdAt: number;
  updatedAt: number;
}

export interface Asset {
  id: string;
  projectId: string;
  kind: AssetKind;
  /** Path relative to the app's opencut directory. */
  uri: string;
  name: string;
  durationUs: number | null;
  width: number | null;
  height: number | null;
  sizeBytes: number | null;
  createdAt: number;
}

export interface Track {
  id: string;
  projectId: string;
  kind: TrackKind;
  position: number;
}

export interface Clip {
  id: string;
  trackId: string;
  assetId: string;
  startUs: number;
  durationUs: number;
  sourceStartUs: number;
  volume: number;
  createdAt: number;
}

export interface EditorDocument {
  project: Project;
  assets: Asset[];
  tracks: Track[];
  clips: Clip[];
}

export interface ProjectSummary extends Project {
  assetCount: number;
  durationUs: number;
}

export type AspectPreset = '16:9' | '9:16' | '1:1';

export interface CreateProjectInput {
  name: string;
  width: number;
  height: number;
  fpsNum?: number;
  fpsDen?: number;
}

export const DEFAULT_FPS_NUM = 30;
export const DEFAULT_FPS_DEN = 1;
export const MIN_CLIP_DURATION_US = 100_000;
export const DEFAULT_IMAGE_DURATION_US = 5_000_000;

export const ASPECT_PRESETS: Record<AspectPreset, { width: number; height: number }> = {
  '16:9': { width: 1920, height: 1080 },
  '9:16': { width: 1080, height: 1920 },
  '1:1': { width: 1080, height: 1080 },
};

export function isVisualAsset(kind: AssetKind): kind is 'video' | 'image' {
  return kind === 'video' || kind === 'image';
}

export function trackKindForAsset(kind: AssetKind): TrackKind {
  return isVisualAsset(kind) ? 'video' : 'audio';
}
