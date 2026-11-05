import {
  assetForClip,
  clipEndUs,
  clipsForTrack,
  documentDurationUs,
  trackForKind,
} from '@/domain/commands';
import type { Asset, Clip, EditorDocument } from '@/domain/types';

export interface ActivePlayback {
  videoClip: Clip | null;
  videoAsset: Asset | null;
  audioClip: Clip | null;
  audioAsset: Asset | null;
  inGap: boolean;
}

export function clipAt(clips: Clip[], timeUs: number): Clip | null {
  return (
    clips.find((clip) => timeUs >= clip.startUs && timeUs < clipEndUs(clip)) ?? null
  );
}

export function resolvePlayback(
  document: EditorDocument,
  timeUs: number,
): ActivePlayback {
  const videoTrack = trackForKind(document, 'video');
  const audioTrack = trackForKind(document, 'audio');
  const videoClip = videoTrack
    ? clipAt(clipsForTrack(document, videoTrack.id), timeUs)
    : null;
  const audioClip = audioTrack
    ? clipAt(clipsForTrack(document, audioTrack.id), timeUs)
    : null;

  const videoAsset = videoClip ? assetForClip(document, videoClip) ?? null : null;
  const audioAsset = audioClip ? assetForClip(document, audioClip) ?? null : null;

  return {
    videoClip,
    videoAsset,
    audioClip,
    audioAsset,
    inGap: videoClip === null,
  };
}

export function sourceTimeUsForClip(clip: Clip, timelineTimeUs: number): number {
  return Math.max(0, clip.sourceStartUs + (timelineTimeUs - clip.startUs));
}

export function nextClipAfter(
  document: EditorDocument,
  trackId: string,
  timeUs: number,
): Clip | null {
  return (
    clipsForTrack(document, trackId).find((clip) => clip.startUs > timeUs) ?? null
  );
}

export function timelineDurationUs(document: EditorDocument): number {
  return documentDurationUs(document);
}

export function clipAtPlayhead(
  document: EditorDocument,
  trackKind: 'video' | 'audio',
  timeUs: number,
): Clip | null {
  const track = trackForKind(document, trackKind);
  if (!track) {
    return null;
  }
  return clipAt(clipsForTrack(document, track.id), timeUs);
}
