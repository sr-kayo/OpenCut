import {
  addClipFromAsset,
  clipEndUs,
  deleteClip,
  setClipVolume,
  splitClip,
  trimClip,
} from '@/domain/commands';
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
  uri: 'projects/prj_1/assets/ast_video.mp4',
  name: 'clip.mp4',
  durationUs: 10_000_000,
  width: 1920,
  height: 1080,
  sizeBytes: 100,
  createdAt: 1,
};

const imageAsset: Asset = {
  ...videoAsset,
  id: 'ast_image',
  kind: 'image',
  uri: 'projects/prj_1/assets/ast_image.jpg',
  name: 'photo.jpg',
  durationUs: null,
};

const audioAsset: Asset = {
  ...videoAsset,
  id: 'ast_audio',
  kind: 'audio',
  uri: 'projects/prj_1/assets/ast_audio.m4a',
  name: 'music.m4a',
  durationUs: 5_000_000,
};

function documentWithAssets(): EditorDocument {
  return {
    project,
    assets: [videoAsset, imageAsset, audioAsset],
    tracks: [videoTrack, audioTrack],
    clips: [],
  };
}

function addVideoClip(document: EditorDocument, id = 'clip_1') {
  return addClipFromAsset(document, videoAsset.id, id, 10).document;
}

describe('timeline commands', () => {
  it('adds a clip to the end of its track', () => {
    const first = addVideoClip(documentWithAssets());
    const second = addVideoClip(first, 'clip_2');
    const clips = second.clips.filter((clip) => clip.trackId === videoTrack.id);
    expect(clips).toHaveLength(2);
    expect(clips[1]?.startUs).toBe(10_000_000);
  });

  it('trims the start and keeps the source in sync', () => {
    const document = addVideoClip(documentWithAssets());
    const clip = document.clips[0] as Clip;
    const trimmed = trimClip(document, clip.id, 'start', 2_000_000);
    const result = trimmed.clips[0] as Clip;

    expect(result.startUs).toBe(2_000_000);
    expect(result.durationUs).toBe(8_000_000);
    expect(result.sourceStartUs).toBe(2_000_000);
  });

  it('trims the end without passing the source duration', () => {
    const document = addVideoClip(documentWithAssets());
    const clip = document.clips[0] as Clip;
    const trimmed = trimClip(document, clip.id, 'end', 20_000_000);
    expect((trimmed.clips[0] as Clip).durationUs).toBe(10_000_000);
  });

  it('prevents a clip from overlapping the previous one', () => {
    const first = addVideoClip(documentWithAssets());
    const second = addVideoClip(first, 'clip_2');
    const secondClip = second.clips.find((clip) => clip.id === 'clip_2') as Clip;
    const trimmed = trimClip(second, secondClip.id, 'start', 5_000_000);
    expect((trimmed.clips.find((clip) => clip.id === 'clip_2') as Clip).startUs).toBe(
      10_000_000,
    );
  });

  it('splits a clip at the playhead', () => {
    const document = addVideoClip(documentWithAssets());
    const clip = document.clips[0] as Clip;
    const split = splitClip(document, clip.id, 4_000_000, 'clip_2', 20);
    const left = split.clips.find((candidate) => candidate.id === clip.id) as Clip;
    const right = split.clips.find((candidate) => candidate.id === 'clip_2') as Clip;

    expect(left.durationUs).toBe(4_000_000);
    expect(right.startUs).toBe(4_000_000);
    expect(right.durationUs).toBe(6_000_000);
    expect(right.sourceStartUs).toBe(4_000_000);
    expect(clipEndUs(right)).toBe(10_000_000);
  });

  it('deletes clips and clamps volume', () => {
    const document = addVideoClip(documentWithAssets());
    const clip = document.clips[0] as Clip;
    const withVolume = setClipVolume(document, clip.id, 2);
    expect((withVolume.clips[0] as Clip).volume).toBe(1);
    expect(deleteClip(withVolume, clip.id).clips).toHaveLength(0);
  });

  it('adds images with the default five second duration', () => {
    const document = addClipFromAsset(
      documentWithAssets(),
      imageAsset.id,
      'clip_image',
      10,
    ).document;
    expect(document.clips[0]?.durationUs).toBe(5_000_000);
  });

  it('adds audio to the audio track', () => {
    const document = addClipFromAsset(
      documentWithAssets(),
      audioAsset.id,
      'clip_audio',
      10,
    ).document;
    expect(document.clips[0]?.trackId).toBe(audioTrack.id);
  });
});
