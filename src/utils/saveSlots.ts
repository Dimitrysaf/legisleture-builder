import type { SaveFile } from './fileOps';

const INDEX_KEY = 'nb_slots_index_v1';
const SLOT_PREFIX = 'nb_slot_v1_';
const MAX_SLOTS = 20;

export function listSlots(): string[] {
  try { return JSON.parse(localStorage.getItem(INDEX_KEY) ?? '[]'); }
  catch { return []; }
}

export function saveSlot(name: string, data: SaveFile): void {
  const slots = listSlots().filter(s => s !== name);
  slots.unshift(name);
  localStorage.setItem(INDEX_KEY, JSON.stringify(slots.slice(0, MAX_SLOTS)));
  localStorage.setItem(SLOT_PREFIX + name, JSON.stringify(data));
}

export function loadSlot(name: string): SaveFile | null {
  try {
    const raw = localStorage.getItem(SLOT_PREFIX + name);
    return raw ? (JSON.parse(raw) as SaveFile) : null;
  } catch { return null; }
}

export function deleteSlot(name: string): void {
  localStorage.setItem(INDEX_KEY, JSON.stringify(listSlots().filter(s => s !== name)));
  localStorage.removeItem(SLOT_PREFIX + name);
}

export function slotTimestamp(name: string): string {
  try {
    const raw = localStorage.getItem(SLOT_PREFIX + name);
    if (!raw) return '';
    const f = JSON.parse(raw) as SaveFile;
    return f.savedAt ? new Date(f.savedAt).toLocaleString('el-GR') : '';
  } catch { return ''; }
}
