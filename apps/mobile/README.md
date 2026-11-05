# OpenCut Mobile

Android-first React Native app for OpenCut, built with Expo.

> [!NOTE]
> This is the first editable mobile MVP. Export, text, effects, masks, keyframes, cloud sync, and the shared Rust editor core are not part of this phase.

## What works

- Local project library: create, rename, delete, reopen.
- Aspect presets: 16:9, 9:16, 1:1.
- Import photos, videos, and audio from the device.
- Assets are copied into the app sandbox; metadata and timeline state live in SQLite.
- One video/image track and one audio track.
- Playback preview driven by `expo-video` and `expo-audio`.
- Timeline with playhead scrubbing, zoom, trim handles, split at playhead, delete, and undo/redo.
- Clip inspector with volume presets.
- Light and dark themes following the system.

## Requirements

- Node/Bun and the toolchain pinned at the repo root (`.prototools`).
- Android SDK with `platforms;android-37.0`, `build-tools;36.0.0`, NDK `27.1.12297006`, and CMake `3.22.1`.
- An emulator or device (the project was verified on API 34, x86_64).

## Commands

```sh
moon run mobile:dev          # Metro / dev client
moon run mobile:android      # build and install on the connected device
moon run mobile:typecheck
moon run mobile:lint
moon run mobile:test
moon run mobile:build-android
```

Or from `apps/mobile`:

```sh
bun install
bun run prebuild
bun run android
bun run icons          # regenerate app icons from brand/marks
```

The generated `android/` directory is not committed. `expo prebuild` recreates it from `app.json`.

Release builds currently use the generated debug keystore. Configure a production keystore before distributing the APK.

## Architecture

```text
src/app/                 Expo Router screens
src/features/projects/   project library state and actions
src/features/editor/     editor store, playback, preview, timeline, inspector
src/features/media/      picker/import flow and media sheet
src/domain/              pure types, time helpers, commands, playback resolution
src/data/                SQLite schema, migrations, repositories
src/components/          native UI primitives
src/theme/               semantic light/dark tokens
src/lib/                 files, media probing, ids
```

- Time is stored as integer microseconds. No floating-point seconds in the document.
- The domain layer is pure and covered by Jest tests.
- The store keeps an in-memory undo history and persists the document after each committed edit.
- Timeline edits are transacted: trim gestures update the document live, then commit one history entry and one save on release.
- `assets.uri` is relative to the app's `opencut/projects/<id>/assets` directory.

## MVP limitations

- Playback uses a single active visual clip. There is no compositor, so overlapping video layers are not supported.
- The playhead clock is wall-clock based and players are resynchronized when they drift.
- Video thumbnails on the timeline are not generated yet; clips use semantic color blocks and labels.
- No MP4 export, text, stickers, effects, masks, keyframes, transitions, or multi-track overlays.
- No cloud/API integration. Everything is offline and local.
- iOS is not verified in this phase.

## Next phase

The app is intentionally structured as a consumer of an editor core. The next step is to bring the Rust `time`, `decode`, `render`, and editor-core crates from the rewrite branches into `crates/`, expose them through an Editor API, and replace the TypeScript document/commands with that API through a JNI/UniFFI bridge.
