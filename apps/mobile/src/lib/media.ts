import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { createVideoPlayer } from 'expo-video';
import { Image } from 'react-native';

import type { AssetKind } from '@/domain/types';
import { secondsToUs } from '@/domain/time';

export interface ProbedMedia {
  durationUs: number | null;
  width: number | null;
  height: number | null;
}

const VIDEO_READY_TIMEOUT_MS = 8_000;
const AUDIO_READY_TIMEOUT_MS = 8_000;

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export function extensionForFile(
  kind: AssetKind,
  fileName: string | null | undefined,
  mimeType: string | null | undefined,
): string {
  const fromName = fileName?.split('.').pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{1,5}$/.test(fromName)) {
    return fromName;
  }

  switch (mimeType) {
    case 'video/mp4':
      return 'mp4';
    case 'video/quicktime':
      return 'mov';
    case 'video/webm':
      return 'webm';
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'audio/mpeg':
      return 'mp3';
    case 'audio/wav':
    case 'audio/x-wav':
      return 'wav';
    case 'audio/mp4':
      return 'm4a';
    case 'audio/aac':
      return 'aac';
    default:
      return kind === 'image' ? 'jpg' : kind === 'audio' ? 'm4a' : 'mp4';
  }
}

export function kindFromMime(
  mimeType: string | null | undefined,
  fileName?: string | null,
): AssetKind {
  if (mimeType?.startsWith('image/')) {
    return 'image';
  }
  if (mimeType?.startsWith('audio/')) {
    return 'audio';
  }
  if (mimeType?.startsWith('video/')) {
    return 'video';
  }

  const extension = fileName?.split('.').pop()?.toLowerCase();
  if (extension && ['jpg', 'jpeg', 'png', 'webp', 'heic', 'gif'].includes(extension)) {
    return 'image';
  }
  if (extension && ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac'].includes(extension)) {
    return 'audio';
  }
  return 'video';
}

export async function probeVideo(uri: string): Promise<ProbedMedia> {
  const player = createVideoPlayer({ uri });
  try {
    const deadline = Date.now() + VIDEO_READY_TIMEOUT_MS;
    while (
      player.status !== 'error' &&
      (player.status === 'loading' || player.status === 'idle' || player.duration <= 0) &&
      Date.now() <= deadline
    ) {
      await delay(50);
    }
    if (player.status === 'error') {
      throw new Error('This video format is not supported on this device.');
    }
    if (!Number.isFinite(player.duration) || player.duration <= 0) {
      throw new Error('Could not read the duration of this video.');
    }

    const track = player.videoTrack;
    return {
      durationUs: secondsToUs(player.duration),
      width: track?.size.width ?? null,
      height: track?.size.height ?? null,
    };
  } finally {
    player.release();
  }
}

export async function probeAudio(uri: string): Promise<ProbedMedia> {
  const player: AudioPlayer = createAudioPlayer({ uri });
  try {
    const deadline = Date.now() + AUDIO_READY_TIMEOUT_MS;
    while ((!player.isLoaded || player.duration <= 0) && Date.now() <= deadline) {
      await delay(50);
    }
    if (!player.isLoaded || !Number.isFinite(player.duration) || player.duration <= 0) {
      throw new Error('Could not read the duration of this audio.');
    }

    return {
      durationUs: secondsToUs(player.duration),
      width: null,
      height: null,
    };
  } finally {
    player.release();
  }
}

export function probeImage(uri: string): Promise<ProbedMedia> {
  return new Promise((resolve) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ durationUs: null, width, height }),
      () => resolve({ durationUs: null, width: null, height: null }),
    );
  });
}
