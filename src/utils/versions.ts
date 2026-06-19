/**
 * Persistent versioning — saves named snapshots of a project's blocks.
 * Uses the shared IndexedDB instance from db.ts ('versions' object store).
 *
 * Separate from the in-memory undo/redo stack (history.ts).
 */

import type { SavedBlock } from './fileOps';
import type { ProjectVersion } from '../types/project';
import { openDB } from './db';

const STORE = 'versions';
const MAX_AUTO_VERSIONS = 20;

export interface StoredVersion extends ProjectVersion {
  projectId: string;
  auto: boolean;
}

function genVersionId(): string {
  const arr = new Uint8Array(6);
  crypto.getRandomValues(arr);
  return `ver_${Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')}`;
}

export async function saveVersion(
  projectId: string,
  blocks: SavedBlock[],
  comment?: string,
  auto = false,
): Promise<StoredVersion> {
  const db = await openDB();
  const version: StoredVersion = {
    id: genVersionId(),
    savedAt: new Date().toISOString(),
    comment,
    blocks,
    projectId,
    auto,
  };

  return new Promise((res, rej) => {
    const t = db.transaction(STORE, 'readwrite');
    const store = t.objectStore(STORE);

    if (auto) {
      // Prune oldest auto-checkpoints beyond limit
      const idx = store.index('byProject');
      const req = idx.getAll(IDBKeyRange.only(projectId));
      req.onsuccess = () => {
        const existing = (req.result as StoredVersion[])
          .filter(v => v.auto)
          .sort((a, b) => a.savedAt.localeCompare(b.savedAt));
        const toDelete = existing.slice(0, Math.max(0, existing.length - MAX_AUTO_VERSIONS + 1));
        toDelete.forEach(v => store.delete(v.id));
        store.put(version);
      };
      req.onerror = () => rej(req.error);
    } else {
      store.put(version);
    }

    t.oncomplete = () => res(version);
    t.onerror = () => rej(t.error);
  });
}

export async function listVersions(projectId: string): Promise<StoredVersion[]> {
  const db = await openDB();
  return new Promise((res, rej) => {
    const t = db.transaction(STORE, 'readonly');
    const idx = t.objectStore(STORE).index('byProject');
    const req = idx.getAll(IDBKeyRange.only(projectId));
    req.onsuccess = () => {
      const all = (req.result as StoredVersion[])
        .sort((a, b) => b.savedAt.localeCompare(a.savedAt));
      res(all);
    };
    req.onerror = () => rej(req.error);
  });
}

export async function loadVersion(versionId: string): Promise<StoredVersion | null> {
  const db = await openDB();
  return new Promise((res, rej) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(versionId);
    req.onsuccess = () => res((req.result as StoredVersion | undefined) ?? null);
    req.onerror = () => rej(req.error);
  });
}

export async function deleteVersion(versionId: string): Promise<void> {
  const db = await openDB();
  return new Promise((res, rej) => {
    const req = db.transaction(STORE, 'readwrite').objectStore(STORE).delete(versionId);
    req.onsuccess = () => res();
    req.onerror = () => rej(req.error);
  });
}
