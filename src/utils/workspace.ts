/**
 * Workspace API — multi-project manager.
 *
 * Storage: IndexedDB (primary, via db.ts). localStorage is used only as a
 * legacy fallback during migration and for the autosave key.
 */

import type { ProjectFile } from '../types/project';
import { isProjectFile } from './fileOps';
import {
  dbSaveProject,
  dbLoadProject,
  dbDeleteProject,
  dbListProjects,
  dbRenameProject,
  migrateFromLocalStorage,
} from './db';

export interface ProjectStub {
  id: string;
  name: string;
  modifiedAt: string;
  createdAt: string;
}

// ── Async API (IndexedDB) ──────────────────────────────────────────

export async function listProjectsAsync(): Promise<ProjectStub[]> {
  await migrateFromLocalStorage();
  return dbListProjects();
}

export async function saveProjectAsync(pf: ProjectFile): Promise<void> {
  await dbSaveProject(pf);
}

export async function loadProjectAsync(id: string): Promise<ProjectFile | null> {
  return dbLoadProject(id);
}

export async function deleteProjectAsync(id: string): Promise<void> {
  return dbDeleteProject(id);
}

export async function renameProjectAsync(id: string, name: string): Promise<void> {
  return dbRenameProject(id, name);
}

// ── Sync shim (localStorage) — used by autosave for zero-latency saves ──

const LS_WORKSPACE_KEY = 'nb_workspace_v1';
const LS_PROJECT_PREFIX = 'nb_project_v1_';

function lsReadIndex(): ProjectStub[] {
  try { return JSON.parse(localStorage.getItem(LS_WORKSPACE_KEY) ?? '[]'); }
  catch { return []; }
}

function lsWriteIndex(stubs: ProjectStub[]): void {
  try { localStorage.setItem(LS_WORKSPACE_KEY, JSON.stringify(stubs)); }
  catch { /* localStorage full — IndexedDB save is the primary */ }
}

export function listProjects(): ProjectStub[] {
  return lsReadIndex().sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
}

export function saveProjectToWorkspace(pf: ProjectFile): void {
  const { id, name, modifiedAt, createdAt } = pf.project;
  const stubs = lsReadIndex().filter(s => s.id !== id);
  stubs.unshift({ id, name, modifiedAt, createdAt });
  lsWriteIndex(stubs);
  try {
    localStorage.setItem(LS_PROJECT_PREFIX + id, JSON.stringify(pf));
  } catch {
    throw new Error('storage_full');
  }
  // Also fire async IndexedDB save (non-blocking)
  dbSaveProject(pf).catch(() => { /* IndexedDB failure is non-fatal */ });
}

export function loadProjectFromWorkspace(id: string): ProjectFile | null {
  // Try localStorage first (synchronous); fall through to returning null
  try {
    const raw = localStorage.getItem(LS_PROJECT_PREFIX + id);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (isProjectFile(parsed)) return parsed;
    }
  } catch { /* continue */ }
  return null;
}

export function deleteProjectFromWorkspace(id: string): void {
  lsWriteIndex(lsReadIndex().filter(s => s.id !== id));
  localStorage.removeItem(LS_PROJECT_PREFIX + id);
  dbDeleteProject(id).catch(() => { /* non-fatal */ });
}

export function renameProjectInWorkspace(id: string, name: string): void {
  const stubs = lsReadIndex().map(s => s.id === id ? { ...s, name } : s);
  lsWriteIndex(stubs);
  const raw = localStorage.getItem(LS_PROJECT_PREFIX + id);
  if (raw) {
    try {
      const pf: ProjectFile = JSON.parse(raw);
      if (isProjectFile(pf)) {
        pf.project.name = name;
        localStorage.setItem(LS_PROJECT_PREFIX + id, JSON.stringify(pf));
      }
    } catch { /* ignore */ }
  }
  dbRenameProject(id, name).catch(() => { /* non-fatal */ });
}
