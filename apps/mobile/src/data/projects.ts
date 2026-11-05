import type { SQLiteDatabase } from 'expo-sqlite';

import { getDatabase } from '@/data/db';
import { newId } from '@/lib/ids';
import {
  DEFAULT_FPS_DEN,
  DEFAULT_FPS_NUM,
  type Asset,
  type Clip,
  type CreateProjectInput,
  type EditorDocument,
  type Project,
  type ProjectSummary,
  type Track,
} from '@/domain/types';

interface ProjectRow {
  id: string;
  name: string;
  width: number;
  height: number;
  fps_num: number;
  fps_den: number;
  created_at: number;
  updated_at: number;
}

interface ProjectSummaryRow extends ProjectRow {
  asset_count: number;
  duration_us: number;
}

interface AssetRow {
  id: string;
  project_id: string;
  kind: string;
  uri: string;
  name: string;
  duration_us: number | null;
  width: number | null;
  height: number | null;
  size_bytes: number | null;
  created_at: number;
}

interface TrackRow {
  id: string;
  project_id: string;
  kind: string;
  position: number;
}

interface ClipRow {
  id: string;
  track_id: string;
  asset_id: string;
  start_us: number;
  duration_us: number;
  source_start_us: number;
  volume: number;
  created_at: number;
}

function projectFromRow(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    width: row.width,
    height: row.height,
    fpsNum: row.fps_num,
    fpsDen: row.fps_den,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function summaryFromRow(row: ProjectSummaryRow): ProjectSummary {
  return {
    ...projectFromRow(row),
    assetCount: row.asset_count,
    durationUs: row.duration_us,
  };
}

function assetFromRow(row: AssetRow): Asset {
  return {
    id: row.id,
    projectId: row.project_id,
    kind: row.kind as Asset['kind'],
    uri: row.uri,
    name: row.name,
    durationUs: row.duration_us,
    width: row.width,
    height: row.height,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at,
  };
}

function trackFromRow(row: TrackRow): Track {
  return {
    id: row.id,
    projectId: row.project_id,
    kind: row.kind as Track['kind'],
    position: row.position,
  };
}

function clipFromRow(row: ClipRow): Clip {
  return {
    id: row.id,
    trackId: row.track_id,
    assetId: row.asset_id,
    startUs: row.start_us,
    durationUs: row.duration_us,
    sourceStartUs: row.source_start_us,
    volume: row.volume,
    createdAt: row.created_at,
  };
}

export async function listProjects(): Promise<ProjectSummary[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<ProjectSummaryRow>(`
    SELECT
      p.*,
      (SELECT COUNT(*) FROM assets a WHERE a.project_id = p.id) AS asset_count,
      COALESCE((
        SELECT MAX(c.start_us + c.duration_us)
        FROM clips c
        INNER JOIN tracks t ON t.id = c.track_id
        WHERE t.project_id = p.id
      ), 0) AS duration_us
    FROM projects p
    ORDER BY p.updated_at DESC
  `);
  return rows.map(summaryFromRow);
}

export async function loadDocument(projectId: string): Promise<EditorDocument | null> {
  const database = await getDatabase();
  const projectRow = await database.getFirstAsync<ProjectRow>(
    'SELECT * FROM projects WHERE id = ?',
    projectId,
  );
  if (!projectRow) {
    return null;
  }

  const [assetRows, trackRows, clipRows] = await Promise.all([
    database.getAllAsync<AssetRow>('SELECT * FROM assets WHERE project_id = ?', projectId),
    database.getAllAsync<TrackRow>('SELECT * FROM tracks WHERE project_id = ?', projectId),
    database.getAllAsync<ClipRow>(
      `SELECT c.* FROM clips c
       INNER JOIN tracks t ON t.id = c.track_id
       WHERE t.project_id = ?
       ORDER BY c.start_us ASC`,
      projectId,
    ),
  ]);

  return {
    project: projectFromRow(projectRow),
    assets: assetRows.map(assetFromRow),
    tracks: trackRows.map(trackFromRow),
    clips: clipRows.map(clipFromRow),
  };
}

export async function createProject(input: CreateProjectInput): Promise<EditorDocument> {
  const database = await getDatabase();
  const now = Date.now();
  const project: Project = {
    id: newId('prj'),
    name: input.name.trim() || 'Untitled project',
    width: input.width,
    height: input.height,
    fpsNum: input.fpsNum ?? DEFAULT_FPS_NUM,
    fpsDen: input.fpsDen ?? DEFAULT_FPS_DEN,
    createdAt: now,
    updatedAt: now,
  };
  const tracks: Track[] = [
    { id: newId('trk'), projectId: project.id, kind: 'video', position: 0 },
    { id: newId('trk'), projectId: project.id, kind: 'audio', position: 1 },
  ];

  await database.withTransactionAsync(async () => {
    await database.runAsync(
      `INSERT INTO projects (id, name, width, height, fps_num, fps_den, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      project.id,
      project.name,
      project.width,
      project.height,
      project.fpsNum,
      project.fpsDen,
      project.createdAt,
      project.updatedAt,
    );
    for (const track of tracks) {
      await database.runAsync(
        'INSERT INTO tracks (id, project_id, kind, position) VALUES (?, ?, ?, ?)',
        track.id,
        track.projectId,
        track.kind,
        track.position,
      );
    }
  });

  return { project, assets: [], tracks, clips: [] };
}

export async function deleteProjectRow(projectId: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM projects WHERE id = ?', projectId);
}

export async function saveDocument(document: EditorDocument): Promise<void> {
  const database = await getDatabase();
  const { project } = document;

  await database.withTransactionAsync(async () => {
    await database.runAsync(
      `DELETE FROM clips WHERE track_id IN (SELECT id FROM tracks WHERE project_id = ?)`,
      project.id,
    );
    await database.runAsync('DELETE FROM tracks WHERE project_id = ?', project.id);
    await database.runAsync('DELETE FROM assets WHERE project_id = ?', project.id);

    await database.runAsync(
      `INSERT INTO projects (id, name, width, height, fps_num, fps_den, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         width = excluded.width,
         height = excluded.height,
         fps_num = excluded.fps_num,
         fps_den = excluded.fps_den,
         updated_at = excluded.updated_at`,
      project.id,
      project.name,
      project.width,
      project.height,
      project.fpsNum,
      project.fpsDen,
      project.createdAt,
      project.updatedAt,
    );

    for (const track of document.tracks) {
      await database.runAsync(
        'INSERT INTO tracks (id, project_id, kind, position) VALUES (?, ?, ?, ?)',
        track.id,
        track.projectId,
        track.kind,
        track.position,
      );
    }

    for (const asset of document.assets) {
      await database.runAsync(
        `INSERT INTO assets (
          id, project_id, kind, uri, name, duration_us, width, height, size_bytes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        asset.id,
        asset.projectId,
        asset.kind,
        asset.uri,
        asset.name,
        asset.durationUs,
        asset.width,
        asset.height,
        asset.sizeBytes,
        asset.createdAt,
      );
    }

    for (const clip of document.clips) {
      await database.runAsync(
        `INSERT INTO clips (
          id, track_id, asset_id, start_us, duration_us, source_start_us, volume, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        clip.id,
        clip.trackId,
        clip.assetId,
        clip.startUs,
        clip.durationUs,
        clip.sourceStartUs,
        clip.volume,
        clip.createdAt,
      );
    }
  });
}

export function databaseForTests(): Promise<SQLiteDatabase> {
  return getDatabase();
}
