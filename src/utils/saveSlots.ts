import type { ProjectFile } from '../types/project';
import { isSaveFile, isProjectFile, type SaveFile } from './fileOps';

const INDEX_KEY = 'nb_slots_index_v1';
const SLOT_PREFIX = 'nb_slot_v1_';
const MAX_SLOTS = 20;

export function listSlots(): string[] {
  try { return JSON.parse(localStorage.getItem(INDEX_KEY) ?? '[]'); }
  catch { return []; }
}

export function saveSlot(name: string, data: ProjectFile): void {
  const slots = listSlots().filter(s => s !== name);
  slots.unshift(name);
  localStorage.setItem(INDEX_KEY, JSON.stringify(slots.slice(0, MAX_SLOTS)));
  localStorage.setItem(SLOT_PREFIX + name, JSON.stringify(data));
}

export function loadSlot(name: string): ProjectFile | null {
  try {
    const raw = localStorage.getItem(SLOT_PREFIX + name);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (isProjectFile(parsed)) return parsed;
    // v1 migration: wrap SaveFile in a ProjectFile shell
    if (isSaveFile(parsed)) return wrapV1(parsed);
    return null;
  } catch { return null; }
}

function wrapV1(sf: SaveFile): ProjectFile {
  const now = sf.savedAt || new Date().toISOString();
  return {
    version: 2,
    app: 'legisleture-builder',
    project: {
      id: `migrated_${Date.now()}`,
      name: '',
      fekMeta: { teuchos: '', arithmos: '', hmeromhnia: '', titlos: '', twoColumn: false },
      createdAt: now,
      modifiedAt: now,
      blocks: sf.blocks,
    },
  };
}

export function deleteSlot(name: string): void {
  localStorage.setItem(INDEX_KEY, JSON.stringify(listSlots().filter(s => s !== name)));
  localStorage.removeItem(SLOT_PREFIX + name);
}

export function slotTimestamp(name: string): string {
  try {
    const raw = localStorage.getItem(SLOT_PREFIX + name);
    if (!raw) return '';
    const parsed = JSON.parse(raw);
    let ts = '';
    if (isProjectFile(parsed)) ts = parsed.project.modifiedAt;
    else if (isSaveFile(parsed)) ts = parsed.savedAt;
    return ts ? new Date(ts).toLocaleString('el-GR') : '';
  } catch { return ''; }
}
