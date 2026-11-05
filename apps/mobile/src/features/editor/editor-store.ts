import { create } from 'zustand';

import { loadDocument, saveDocument } from '@/data/projects';
import { timelineDurationUs } from '@/domain/playback';
import type { Clip, EditorDocument } from '@/domain/types';
import { clamp } from '@/domain/time';

type EditorStatus = 'idle' | 'loading' | 'ready' | 'error';

interface EditorState {
  document: EditorDocument | null;
  status: EditorStatus;
  error: string | null;
  selectedClipId: string | null;
  playheadUs: number;
  isPlaying: boolean;
  history: EditorDocument[];
  future: EditorDocument[];
  transactionStart: EditorDocument | null;
  loadProject: (projectId: string) => Promise<void>;
  reset: () => void;
  run: (
    mutate: (document: EditorDocument) => EditorDocument,
    options?: { selectClipId?: string | null; seekToUs?: number },
  ) => void;
  beginTransaction: () => void;
  updateTransaction: (mutate: (document: EditorDocument) => EditorDocument) => void;
  endTransaction: () => void;
  cancelTransaction: () => void;
  undo: () => void;
  redo: () => void;
  selectClip: (clipId: string | null) => void;
  setPlayhead: (timeUs: number) => void;
  setPlaying: (playing: boolean) => void;
  save: () => Promise<void>;
}

let saveQueue: Promise<void> = Promise.resolve();

function enqueueSave(document: EditorDocument): Promise<void> {
  saveQueue = saveQueue
    .then(() => saveDocument(document))
    .catch((error: unknown) => {
      console.warn('Failed to save project', error);
    });
  return saveQueue;
}

function clampPlayhead(document: EditorDocument | null, timeUs: number): number {
  if (!document) {
    return 0;
  }
  return clamp(timeUs, 0, timelineDurationUs(document));
}

function selectedClipExists(document: EditorDocument, clipId: string | null): boolean {
  return clipId === null || document.clips.some((clip) => clip.id === clipId);
}

function pushHistory(history: EditorDocument[], entry: EditorDocument): EditorDocument[] {
  return [...history, entry].slice(-50);
}

export const useEditorStore = create<EditorState>((set, get) => ({
  document: null,
  status: 'idle',
  error: null,
  selectedClipId: null,
  playheadUs: 0,
  isPlaying: false,
  history: [],
  future: [],
  transactionStart: null,

  loadProject: async (projectId: string) => {
    set({ status: 'loading', error: null });
    try {
      const document = await loadDocument(projectId);
      if (!document) {
        set({ status: 'error', error: 'Project not found.' });
        return;
      }
      set({
        document,
        status: 'ready',
        error: null,
        selectedClipId: null,
        playheadUs: 0,
        isPlaying: false,
        history: [],
        future: [],
        transactionStart: null,
      });
    } catch (error) {
      set({
        status: 'error',
        error: error instanceof Error ? error.message : 'Could not open the project.',
      });
    }
  },

  reset: () => {
    set({
      document: null,
      status: 'idle',
      error: null,
      selectedClipId: null,
      playheadUs: 0,
      isPlaying: false,
      history: [],
      future: [],
      transactionStart: null,
    });
  },

  run: (mutate, options) => {
    const state = get();
    if (!state.document) {
      return;
    }
    const next = mutate(state.document);
    if (next === state.document) {
      return;
    }
    const selectedClipId = options?.selectClipId === undefined
      ? state.selectedClipId
      : options.selectClipId;
    const duration = timelineDurationUs(next);
    const playheadUs = clamp(options?.seekToUs ?? state.playheadUs, 0, duration);

    set({
      document: next,
      selectedClipId: selectedClipExists(next, selectedClipId) ? selectedClipId : null,
      playheadUs,
      history: pushHistory(state.history, state.document),
      future: [],
    });
    void enqueueSave(next);
  },

  beginTransaction: () => {
    const state = get();
    if (state.document && !state.transactionStart) {
      set({ transactionStart: state.document });
    }
  },

  updateTransaction: (mutate) => {
    const state = get();
    if (!state.document || !state.transactionStart) {
      return;
    }
    const next = mutate(state.document);
    if (next !== state.document) {
      set({ document: next });
    }
  },

  endTransaction: () => {
    const state = get();
    if (!state.transactionStart || !state.document) {
      set({ transactionStart: null });
      return;
    }
    if (state.document !== state.transactionStart) {
      set({
        history: pushHistory(state.history, state.transactionStart),
        future: [],
        transactionStart: null,
      });
      void enqueueSave(state.document);
    } else {
      set({ transactionStart: null });
    }
  },

  cancelTransaction: () => {
    const state = get();
    set({ document: state.transactionStart ?? state.document, transactionStart: null });
  },

  undo: () => {
    const state = get();
    if (!state.document || state.history.length === 0) {
      return;
    }
    const previous = state.history[state.history.length - 1];
    if (!previous) {
      return;
    }
    set({
      document: previous,
      history: state.history.slice(0, -1),
      future: [state.document, ...state.future].slice(0, 50),
      selectedClipId: selectedClipExists(previous, state.selectedClipId)
        ? state.selectedClipId
        : null,
      playheadUs: clampPlayhead(previous, state.playheadUs),
      isPlaying: false,
      transactionStart: null,
    });
    void enqueueSave(previous);
  },

  redo: () => {
    const state = get();
    if (!state.document || state.future.length === 0) {
      return;
    }
    const next = state.future[0];
    if (!next) {
      return;
    }
    set({
      document: next,
      history: pushHistory(state.history, state.document),
      future: state.future.slice(1),
      selectedClipId: selectedClipExists(next, state.selectedClipId)
        ? state.selectedClipId
        : null,
      playheadUs: clampPlayhead(next, state.playheadUs),
      isPlaying: false,
      transactionStart: null,
    });
    void enqueueSave(next);
  },

  selectClip: (clipId) => {
    const state = get();
    if (!state.document) {
      return;
    }
    const clip: Clip | undefined = state.document.clips.find(
      (candidate) => candidate.id === clipId,
    );
    if (clip && (state.playheadUs < clip.startUs || state.playheadUs >= clip.startUs + clip.durationUs)) {
      set({ selectedClipId: clipId, playheadUs: clip.startUs, isPlaying: false });
      return;
    }
    set({ selectedClipId: clipId });
  },

  setPlayhead: (timeUs) => {
    const state = get();
    set({ playheadUs: clampPlayhead(state.document, timeUs) });
  },

  setPlaying: (playing) => {
    const state = get();
    if (!state.document) {
      return;
    }
    const duration = timelineDurationUs(state.document);
    if (playing && duration === 0) {
      return;
    }
    const playheadUs = playing && state.playheadUs >= duration ? 0 : state.playheadUs;
    set({ isPlaying: playing, playheadUs });
  },

  save: async () => {
    const document = get().document;
    if (document) {
      await enqueueSave(document);
    }
  },
}));
