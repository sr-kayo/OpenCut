import {
  DEFAULT_IMAGE_DURATION_US,
  MIN_CLIP_DURATION_US,
  trackKindForAsset,
  type Asset,
  type Clip,
  type EditorDocument,
  type Project,
  type Track,
  type TrackKind,
} from '@/domain/types';
import { clamp } from '@/domain/time';

export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainError';
  }
}

export function clipEndUs(clip: Clip): number {
  return clip.startUs + clip.durationUs;
}

export function clipsForTrack(document: EditorDocument, trackId: string): Clip[] {
  return document.clips
    .filter((clip) => clip.trackId === trackId)
    .sort((left, right) => left.startUs - right.startUs);
}

export function trackForKind(
  document: EditorDocument,
  kind: TrackKind,
): Track | undefined {
  return document.tracks.find((track) => track.kind === kind);
}

export function assetForClip(
  document: EditorDocument,
  clip: Clip,
): Asset | undefined {
  return document.assets.find((asset) => asset.id === clip.assetId);
}

export function documentDurationUs(document: EditorDocument): number {
  return document.clips.reduce((maximum, clip) => Math.max(maximum, clipEndUs(clip)), 0);
}

function updatedProject(project: Project, now: number): Project {
  return { ...project, updatedAt: now };
}

function replaceClip(
  document: EditorDocument,
  clipId: string,
  update: (clip: Clip) => Clip,
): EditorDocument {
  return {
    ...document,
    clips: document.clips.map((clip) => (clip.id === clipId ? update(clip) : clip)),
  };
}

export function addAsset(document: EditorDocument, asset: Asset): EditorDocument {
  if (asset.projectId !== document.project.id) {
    throw new DomainError('Asset belongs to another project.');
  }
  return {
    ...document,
    assets: [...document.assets, asset],
    project: updatedProject(document.project, Date.now()),
  };
}

export function removeAsset(document: EditorDocument, assetId: string): EditorDocument {
  const inUse = document.clips.some((clip) => clip.assetId === assetId);
  if (inUse) {
    throw new DomainError('Remove the clip from the timeline before deleting this asset.');
  }
  return {
    ...document,
    assets: document.assets.filter((asset) => asset.id !== assetId),
    project: updatedProject(document.project, Date.now()),
  };
}

export function addClipFromAsset(
  document: EditorDocument,
  assetId: string,
  clipId: string,
  createdAt: number,
): { document: EditorDocument; clip: Clip } {
  const asset = document.assets.find((candidate) => candidate.id === assetId);
  if (!asset) {
    throw new DomainError('Asset not found.');
  }

  const track = trackForKind(document, trackKindForAsset(asset.kind));
  if (!track) {
    throw new DomainError('The project is missing its timeline track.');
  }

  const existing = clipsForTrack(document, track.id);
  const lastClip = existing[existing.length - 1];
  const startUs = lastClip ? clipEndUs(lastClip) : 0;
  const durationUs =
    asset.durationUs ?? (asset.kind === 'image' ? DEFAULT_IMAGE_DURATION_US : 0);

  if (durationUs < MIN_CLIP_DURATION_US) {
    throw new DomainError('This asset is too short to add to the timeline.');
  }

  const clip: Clip = {
    id: clipId,
    trackId: track.id,
    assetId,
    startUs,
    durationUs,
    sourceStartUs: 0,
    volume: 1,
    createdAt,
  };

  return {
    document: {
      ...document,
      clips: [...document.clips, clip],
      project: updatedProject(document.project, createdAt),
    },
    clip,
  };
}

export function trimClip(
  document: EditorDocument,
  clipId: string,
  edge: 'start' | 'end',
  targetUs: number,
): EditorDocument {
  const clip = document.clips.find((candidate) => candidate.id === clipId);
  if (!clip) {
    throw new DomainError('Clip not found.');
  }
  const asset = assetForClip(document, clip);
  if (!asset) {
    throw new DomainError('The clip is missing its asset.');
  }

  const trackClips = clipsForTrack(document, clip.trackId);
  const index = trackClips.findIndex((candidate) => candidate.id === clip.id);
  const previous = index > 0 ? trackClips[index - 1] : undefined;
  const next = index >= 0 ? trackClips[index + 1] : undefined;
  const previousEnd = previous ? clipEndUs(previous) : 0;
  const nextStart = next ? next.startUs : Number.POSITIVE_INFINITY;

  if (edge === 'start') {
    const minimum = asset.kind === 'image'
      ? previousEnd
      : Math.max(previousEnd, clip.startUs - clip.sourceStartUs);
    const maximum = clip.startUs + clip.durationUs - MIN_CLIP_DURATION_US;
    const startUs = clamp(targetUs, minimum, maximum);
    const delta = startUs - clip.startUs;
    const sourceStartUs = asset.kind === 'image'
      ? 0
      : Math.max(0, clip.sourceStartUs + delta);
    const durationUs = clip.startUs + clip.durationUs - startUs;

    if (durationUs < MIN_CLIP_DURATION_US) {
      return document;
    }

    return {
      ...replaceClip(document, clipId, (current) => ({
        ...current,
        startUs,
        durationUs,
        sourceStartUs,
      })),
      project: updatedProject(document.project, Date.now()),
    };
  }

  const sourceEndLimit = asset.durationUs === null
    ? Number.POSITIVE_INFINITY
    : clip.startUs + (asset.durationUs - clip.sourceStartUs);
  const maximum = Math.min(nextStart, sourceEndLimit);
  const minimum = clip.startUs + MIN_CLIP_DURATION_US;
  const endUs = clamp(targetUs, minimum, maximum);
  const durationUs = endUs - clip.startUs;

  if (durationUs < MIN_CLIP_DURATION_US) {
    return document;
  }

  return {
    ...replaceClip(document, clipId, (current) => ({ ...current, durationUs })),
    project: updatedProject(document.project, Date.now()),
  };
}

export function splitClip(
  document: EditorDocument,
  clipId: string,
  atUs: number,
  newClipId: string,
  createdAt: number,
): EditorDocument {
  const clip = document.clips.find((candidate) => candidate.id === clipId);
  if (!clip) {
    throw new DomainError('Clip not found.');
  }

  const endUs = clipEndUs(clip);
  if (
    atUs < clip.startUs + MIN_CLIP_DURATION_US ||
    atUs > endUs - MIN_CLIP_DURATION_US
  ) {
    throw new DomainError('Move the playhead inside the clip to split it.');
  }

  const leftDuration = atUs - clip.startUs;
  const right: Clip = {
    ...clip,
    id: newClipId,
    startUs: atUs,
    durationUs: endUs - atUs,
    sourceStartUs: clip.sourceStartUs + leftDuration,
    createdAt,
  };

  return {
    ...document,
    clips: [
      ...document.clips.map((candidate) =>
        candidate.id === clipId ? { ...candidate, durationUs: leftDuration } : candidate,
      ),
      right,
    ],
    project: updatedProject(document.project, createdAt),
  };
}

export function deleteClip(document: EditorDocument, clipId: string): EditorDocument {
  return {
    ...document,
    clips: document.clips.filter((clip) => clip.id !== clipId),
    project: updatedProject(document.project, Date.now()),
  };
}

export function setClipVolume(
  document: EditorDocument,
  clipId: string,
  volume: number,
): EditorDocument {
  return {
    ...replaceClip(document, clipId, (clip) => ({
      ...clip,
      volume: clamp(volume, 0, 1),
    })),
    project: updatedProject(document.project, Date.now()),
  };
}

export function renameProject(document: EditorDocument, name: string): EditorDocument {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new DomainError('The project name cannot be empty.');
  }
  return {
    ...document,
    project: { ...document.project, name: trimmed, updatedAt: Date.now() },
  };
}
