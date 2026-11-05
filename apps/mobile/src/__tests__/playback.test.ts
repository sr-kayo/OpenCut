import { resolvePlayback, sourceTimeUsForClip } from '@/domain/playback';
import type { Asset, Clip, EditorDocument, Project, Track } from '@/domain/types';

const project: Project = {
  id: 'prj_1',
  name: 'Test',
  width: 1920,
  height: 1080,
  fpsNum: 30,
  fpsDen: 1,
  createdAt: 1,
  updatedAt: 1,
};

const videoTrack: Track = {
  id: 'trk_video',
  projectId: project.id,
  kind: 'video',
  position: 0,
};

const audioTrack: Track = {
  id: 'trk_audio',
  projectId: project.id,
  kind: 'audio',
  position: 1,
};

const videoAsset: Asset = {
  id: 'ast_video',
  projectId: project.id,
  kind: 'video',
  uri: 'video.mp4',
  name: 'video.mp4',
  durationUs: 10_000_000,
  width: 1920,
  height: 1080,
  sizeBytes: 1,
  createdAt: 1,
};

const audioAsset: Asset = {
  ...videoAsset,
  id: 'ast_audio',
  kind: 'audio',
  uri: 'audio.m4a',
  name: 'audio.m4a',
  durationUs: 8_000_000,
};

const videoClip: Clip = {
  id: 'clip_video',
  trackId: videoTrack.id,
  assetId: videoAsset.id,
  startUs: 2_000_000,
  durationUs: 4_000_000,
  sourceStartUs: 1_000_000,
  volume: 1,
  createdAt: 1,
};

const audioClip: Clip = {
  id: 'clip_audio',
  trackId: audioTrack.id,
  assetId: audioAsset.id,
  startUs: 0,
  durationUs: 8_000_000,
  sourceStartUs: 0,
  volume: 1,
  createdAt: 1,
};

const document: EditorDocument = {
  project,
  assets: [videoAsset, audioAsset],
  tracks: [videoTrack, audioTrack],
  clips: [videoClip, audioClip],
};

describe('playback resolution', () => {
  it('finds the active visual and audio clips', () => {
    const active = resolvePlayback(document, 3_000_000);
    expect(active.videoClip?.id).toBe(videoClip.id);
    expect(active.audioClip?.id).toBe(audioClip.id);
    expect(active.inGap).toBe(false);
  });

  it('reports a gap before the first visual clip', () => {
    const active = resolvePlayback(document, 0);
    expect(active.videoClip).toBeNull();
    expect(active.inGap).toBe(true);
    expect(active.audioClip?.id).toBe(audioClip.id);
  });

  it('maps timeline time to source time', () => {
    expect(sourceTimeUsForClip(videoClip, 3_000_000)).toBe(2_000_000);
    expect(sourceTimeUsForClip(videoClip, 2_000_000)).toBe(1_000_000);
  });
});
