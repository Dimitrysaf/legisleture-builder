/**
 * Thin IndexedDB wrapper.
 * Object stores:
 *   projects   — ProjectFile records keyed by project.id
 *   assets     — Asset blobs keyed by asset.id, with projectId index
 *   workspace  — Single-record store (key "index") for the ProjectStub list
 */

import type { ProjectFile } from '../types/project';
import type { Asset } from '../types/project';
import type { ProjectStub } from './workspace';

const DB_NAME = 'legisleture_builder';
const DB_VERSION = 3;

let _db: IDBDatabase | null = null;

export function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('projects')) {
        db.createObjectStore('projects', { keyPath: 'project.id' });
      }
      if (!db.objectStoreNames.contains('assets')) {
        const as = db.createObjectStore('assets', { keyPath: 'id' });
        as.createIndex('byProject', 'projectId', { unique: false });
      }
      if (!db.objectStoreNames.contains('workspace')) {
        db.createObjectStore('workspace');
      }
      if (!db.objectStoreNames.contains('versions')) {
        const vs = db.createObjectStore('versions', { keyPath: 'id' });
        vs.createIndex('byProject', 'projectId', { unique: false });
      }
      if (!db.objectStoreNames.contains('lawIndexes')) {
        db.createObjectStore('lawIndexes', { keyPath: 'id' });
      }
    };

    req.onsuccess = (e) => {
      _db = (e.target as IDBOpenDBRequest).result;
      resolve(_db);
    };
    req.onerror = () => reject(req.error);
  });
}

function tx(
  db: IDBDatabase,
  stores: string | string[],
  mode: IDBTransactionMode,
): IDBTransaction {
  return db.transaction(stores, mode);
}

function put<T>(store: IDBObjectStore, value: T): Promise<void> {
  return new Promise((res, rej) => {
    const req = store.put(value);
    req.onsuccess = () => res();
    req.onerror = () => rej(req.error);
  });
}

function get<T>(store: IDBObjectStore, key: IDBValidKey): Promise<T | undefined> {
  return new Promise((res, rej) => {
    const req = store.get(key);
    req.onsuccess = () => res(req.result as T | undefined);
    req.onerror = () => rej(req.error);
  });
}

function del(store: IDBObjectStore, key: IDBValidKey): Promise<void> {
  return new Promise((res, rej) => {
    const req = store.delete(key);
    req.onsuccess = () => res();
    req.onerror = () => rej(req.error);
  });
}

function getAll<T>(store: IDBObjectStore): Promise<T[]> {
  return new Promise((res, rej) => {
    const req = store.getAll();
    req.onsuccess = () => res(req.result as T[]);
    req.onerror = () => rej(req.error);
  });
}

// ── Workspace index ────────────────────────────────────────────────

export async function dbReadWorkspaceIndex(): Promise<ProjectStub[]> {
  const db = await openDB();
  const store = tx(db, 'workspace', 'readonly').objectStore('workspace');
  return (await get<ProjectStub[]>(store, 'index')) ?? [];
}

export async function dbWriteWorkspaceIndex(stubs: ProjectStub[]): Promise<void> {
  const db = await openDB();
  const store = tx(db, 'workspace', 'readwrite').objectStore('workspace');
  await put(store, stubs); // put(value, key) — IDB put with explicit key below
  // IDB put for non-keyPath stores: put(value, key)
  return new Promise((res, rej) => {
    const t = tx(db, 'workspace', 'readwrite');
    const s = t.objectStore('workspace');
    const req = s.put(stubs, 'index');
    req.onsuccess = () => res();
    req.onerror = () => rej(req.error);
  });
}

// ── Projects ───────────────────────────────────────────────────────

export async function dbSaveProject(pf: ProjectFile): Promise<void> {
  const db = await openDB();
  return new Promise((res, rej) => {
    const t = tx(db, ['projects', 'workspace'], 'readwrite');
    const ps = t.objectStore('projects');
    const ws = t.objectStore('workspace');

    const req1 = ps.put(pf);
    req1.onerror = () => rej(req1.error);

    const req2 = ws.get('index');
    req2.onsuccess = () => {
      const stubs: ProjectStub[] = (req2.result as ProjectStub[] | undefined) ?? [];
      const { id, name, modifiedAt, createdAt } = pf.project;
      const filtered = stubs.filter(s => s.id !== id);
      filtered.unshift({ id, name, modifiedAt, createdAt });
      const req3 = ws.put(filtered, 'index');
      req3.onerror = () => rej(req3.error);
    };
    req2.onerror = () => rej(req2.error);

    t.oncomplete = () => res();
    t.onerror = () => rej(t.error);
  });
}

export async function dbLoadProject(id: string): Promise<ProjectFile | null> {
  const db = await openDB();
  const store = tx(db, 'projects', 'readonly').objectStore('projects');
  return (await get<ProjectFile>(store, id)) ?? null;
}

export async function dbDeleteProject(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((res, rej) => {
    const t = tx(db, ['projects', 'assets', 'workspace'], 'readwrite');
    const ps = t.objectStore('projects');
    const as = t.objectStore('assets');
    const ws = t.objectStore('workspace');

    ps.delete(id);

    // Delete all assets belonging to this project
    const idx = as.index('byProject');
    const req = idx.openCursor(IDBKeyRange.only(id));
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) { cursor.delete(); cursor.continue(); }
    };

    const wsReq = ws.get('index');
    wsReq.onsuccess = () => {
      const stubs = ((wsReq.result as ProjectStub[] | undefined) ?? []).filter(s => s.id !== id);
      ws.put(stubs, 'index');
    };

    t.oncomplete = () => res();
    t.onerror = () => rej(t.error);
  });
}

export async function dbListProjects(): Promise<ProjectStub[]> {
  const db = await openDB();
  const store = tx(db, 'workspace', 'readonly').objectStore('workspace');
  const stubs = (await get<ProjectStub[]>(store, 'index')) ?? [];
  return stubs.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
}

export async function dbRenameProject(id: string, name: string): Promise<void> {
  const db = await openDB();
  return new Promise((res, rej) => {
    const t = tx(db, ['projects', 'workspace'], 'readwrite');
    const ps = t.objectStore('projects');
    const ws = t.objectStore('workspace');

    const pReq = ps.get(id);
    pReq.onsuccess = () => {
      const pf = pReq.result as ProjectFile | undefined;
      if (pf) { pf.project.name = name; ps.put(pf); }
    };

    const wReq = ws.get('index');
    wReq.onsuccess = () => {
      const stubs = ((wReq.result as ProjectStub[] | undefined) ?? []).map(s =>
        s.id === id ? { ...s, name } : s,
      );
      ws.put(stubs, 'index');
    };

    t.oncomplete = () => res();
    t.onerror = () => rej(t.error);
  });
}

// ── Assets ─────────────────────────────────────────────────────────

export interface StoredAsset extends Asset {
  projectId: string;
}

export async function dbSaveAsset(projectId: string, asset: Asset): Promise<void> {
  const db = await openDB();
  const store = tx(db, 'assets', 'readwrite').objectStore('assets');
  const sa: StoredAsset = { ...asset, projectId };
  await put(store, sa);
}

export async function dbLoadAsset(id: string): Promise<StoredAsset | null> {
  const db = await openDB();
  const store = tx(db, 'assets', 'readonly').objectStore('assets');
  return (await get<StoredAsset>(store, id)) ?? null;
}

export async function dbListAssets(projectId: string): Promise<StoredAsset[]> {
  const db = await openDB();
  return new Promise((res, rej) => {
    const t = tx(db, 'assets', 'readonly');
    const store = t.objectStore('assets');
    const idx = store.index('byProject');
    const req = idx.getAll(IDBKeyRange.only(projectId));
    req.onsuccess = () => res(req.result as StoredAsset[]);
    req.onerror = () => rej(req.error);
  });
}

export async function dbDeleteAsset(id: string): Promise<void> {
  const db = await openDB();
  const store = tx(db, 'assets', 'readwrite').objectStore('assets');
  await del(store, id);
}

// ── Law Indexes ────────────────────────────────────────────────────

export interface LawIndex {
  id: string;
  lawId: string;
  subject?: string;
  date?: string;
  fekRef?: string;
  importedAt: string;
  articles: { number: string; title: string; eId: string }[];
}

export async function dbSaveLawIndex(idx: LawIndex): Promise<void> {
  const db = await openDB();
  const store = tx(db, 'lawIndexes', 'readwrite').objectStore('lawIndexes');
  await put(store, idx);
}

export async function dbListLawIndexes(): Promise<LawIndex[]> {
  const db = await openDB();
  const store = tx(db, 'lawIndexes', 'readonly').objectStore('lawIndexes');
  return getAll<LawIndex>(store);
}

export async function dbDeleteLawIndex(id: string): Promise<void> {
  const db = await openDB();
  const store = tx(db, 'lawIndexes', 'readwrite').objectStore('lawIndexes');
  await del(store, id);
}

// ── Migration: localStorage → IndexedDB ───────────────────────────

const LS_WORKSPACE_KEY = 'nb_workspace_v1';
const LS_PROJECT_PREFIX = 'nb_project_v1_';
const LS_MIGRATED_FLAG = 'nb_idb_migrated_v1';

export async function migrateFromLocalStorage(): Promise<void> {
  if (localStorage.getItem(LS_MIGRATED_FLAG)) return;

  const indexRaw = localStorage.getItem(LS_WORKSPACE_KEY);
  if (!indexRaw) { localStorage.setItem(LS_MIGRATED_FLAG, '1'); return; }

  let stubs: ProjectStub[] = [];
  try { stubs = JSON.parse(indexRaw); } catch { /* skip */ }

  for (const stub of stubs) {
    const raw = localStorage.getItem(LS_PROJECT_PREFIX + stub.id);
    if (!raw) continue;
    try {
      const pf = JSON.parse(raw) as ProjectFile;
      await dbSaveProject(pf);
    } catch { /* skip corrupt entries */ }
  }

  // Also migrate autosave if workspace was empty
  if (stubs.length === 0) {
    const autoRaw = localStorage.getItem('nb_autosave_v1');
    if (autoRaw) {
      try {
        const pf = JSON.parse(autoRaw) as ProjectFile;
        if (pf?.project?.id) await dbSaveProject(pf);
      } catch { /* skip */ }
    }
  }

  localStorage.setItem(LS_MIGRATED_FLAG, '1');
}
