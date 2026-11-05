import { useAudioPlayer } from 'expo-audio';
import { useVideoPlayer } from 'expo-video';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import {
  resolvePlayback,
  sourceTimeUsForClip,
  timelineDurationUs,
  type ActivePlayback,
} from '@/domain/playback';
import type { EditorDocument } from '@/domain/types';
import { usToSeconds } from '@/domain/time';
import { useEditorStore } from '@/features/editor/editor-store';
import { resolveAssetUri } from '@/lib/files';

interface PlaybackResult {
  active: ActivePlayback;
  videoPlayer: ReturnType<typeof useVideoPlayer>;
  audioPlayer: ReturnType<typeof useAudioPlayer>;
}

function currentClip(document: EditorDocument | null, clipId: string | null) {
  if (!document || !clipId) {
    return null;
  }
  return document.clips.find((clip) => clip.id === clipId) ?? null;
}

export function usePlayback(
  document: EditorDocument,
  playheadUs: number,
  isPlaying: boolean,
): PlaybackResult {
  const videoPlayer = useVideoPlayer(null);
  const audioPlayer = useAudioPlayer(null);
  const active = resolvePlayback(document, playheadUs);
  const activeRef = useRef(active);
  activeRef.current = active;

  const videoClipId = active.videoClip?.id ?? null;
  const videoUri =
    active.videoAsset?.kind === 'video' ? resolveAssetUri(active.videoAsset.uri) : null;
  const audioClipId = active.audioClip?.id ?? null;
  const audioUri = active.audioAsset ? resolveAssetUri(active.audioAsset.uri) : null;

  useEffect(() => {
    if (!videoUri || !videoClipId) {
      videoPlayer.pause();
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        await videoPlayer.replaceAsync({ uri: videoUri });
        if (cancelled) {
          return;
        }
        const state = useEditorStore.getState();
        const clip = currentClip(state.document, videoClipId);
        if (!clip) {
          return;
        }
        videoPlayer.currentTime = usToSeconds(sourceTimeUsForClip(clip, state.playheadUs));
        videoPlayer.volume = clip.volume;
        if (state.isPlaying) {
          videoPlayer.play();
        } else {
          videoPlayer.pause();
        }
      } catch (error) {
        console.warn('Could not load video preview', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [videoClipId, videoPlayer, videoUri]);

  useEffect(() => {
    if (isPlaying && videoUri) {
      videoPlayer.play();
    } else {
      videoPlayer.pause();
    }
  }, [isPlaying, videoPlayer, videoUri]);

  useEffect(() => {
    if (isPlaying || !videoUri || !videoClipId) {
      return;
    }
    const state = useEditorStore.getState();
    const clip = currentClip(state.document, videoClipId);
    if (clip) {
      videoPlayer.currentTime = usToSeconds(sourceTimeUsForClip(clip, playheadUs));
    }
  }, [isPlaying, playheadUs, videoClipId, videoPlayer, videoUri]);

  useEffect(() => {
    const clip = activeRef.current.videoClip;
    if (clip) {
      videoPlayer.volume = clip.volume;
    }
  }, [active.videoClip?.volume, videoPlayer]);

  useEffect(() => {
    if (!audioUri || !audioClipId) {
      audioPlayer.pause();
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        audioPlayer.replace({ uri: audioUri });
        const state = useEditorStore.getState();
        const clip = currentClip(state.document, audioClipId);
        if (!clip) {
          return;
        }
        const seconds = usToSeconds(sourceTimeUsForClip(clip, state.playheadUs));
        try {
          await audioPlayer.seekTo(seconds);
        } catch {
          await new Promise((resolve) => setTimeout(resolve, 150));
          await audioPlayer.seekTo(seconds).catch(() => undefined);
        }
        if (cancelled) {
          return;
        }
        audioPlayer.volume = clip.volume;
        if (state.isPlaying) {
          audioPlayer.play();
        }
      } catch (error) {
        console.warn('Could not load audio preview', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [audioClipId, audioPlayer, audioUri]);

  useEffect(() => {
    if (isPlaying && audioUri) {
      audioPlayer.play();
    } else {
      audioPlayer.pause();
    }
  }, [audioPlayer, audioUri, isPlaying]);

  useEffect(() => {
    if (isPlaying || !audioUri || !audioClipId) {
      return;
    }
    const state = useEditorStore.getState();
    const clip = currentClip(state.document, audioClipId);
    if (clip) {
      void audioPlayer
        .seekTo(usToSeconds(sourceTimeUsForClip(clip, state.playheadUs)))
        .catch(() => undefined);
    }
  }, [audioClipId, audioPlayer, audioUri, isPlaying, playheadUs]);

  useEffect(() => {
    const clip = activeRef.current.audioClip;
    if (clip) {
      audioPlayer.volume = clip.volume;
    }
  }, [active.audioClip?.volume, audioPlayer]);

  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    let last = performance.now();
    const interval = setInterval(() => {
      const now = performance.now();
      const deltaUs = Math.round((now - last) * 1000);
      last = now;

      const state = useEditorStore.getState();
      if (!state.document || !state.isPlaying) {
        return;
      }
      const duration = timelineDurationUs(state.document);
      const next = Math.min(state.playheadUs + deltaUs, duration);
      state.setPlayhead(next);
      if (next >= duration) {
        state.setPlaying(false);
      }
    }, 40);

    return () => clearInterval(interval);
  }, [isPlaying]);

  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    const interval = setInterval(() => {
      const state = useEditorStore.getState();
      if (!state.document) {
        return;
      }
      const current = resolvePlayback(state.document, state.playheadUs);
      if (current.videoClip && current.videoAsset?.kind === 'video') {
        const expected = usToSeconds(
          sourceTimeUsForClip(current.videoClip, state.playheadUs),
        );
        if (Math.abs(videoPlayer.currentTime - expected) > 0.2) {
          videoPlayer.currentTime = expected;
        }
      }
      if (current.audioClip) {
        const expected = usToSeconds(
          sourceTimeUsForClip(current.audioClip, state.playheadUs),
        );
        if (Math.abs(audioPlayer.currentTime - expected) > 0.2) {
          void audioPlayer.seekTo(expected).catch(() => undefined);
        }
      }
    }, 1_000);

    return () => clearInterval(interval);
  }, [audioPlayer, isPlaying, videoPlayer]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        useEditorStore.getState().setPlaying(false);
      }
    });
    return () => subscription.remove();
  }, []);

  return { active, videoPlayer, audioPlayer };
}
