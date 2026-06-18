import { state } from './state';
import { showSaveStatus } from './toast';
import { serializeDocument } from '../utils/fileOps';
import type { SavedBlock } from '../utils/fileOps';

export const AUTOSAVE_KEY = 'nb_autosave_v1';

export function markDocChanged(): void {
  state.docVersion++;
}

function stripBase64FromBlocks(blocks: SavedBlock[]): { blocks: SavedBlock[]; stripped: boolean } {
  let stripped = false;
  const mapped = blocks.map(block => {
    const data = { ...block.data };
    if (block.templateId === 'image-block' && data.src?.startsWith('data:')) {
      data.src = '';
      stripped = true;
    }
    const { blocks: childBlocks, stripped: childStripped } = stripBase64FromBlocks(
      Object.values(block.zones).flat(),
    );
    const zones: typeof block.zones = {};
    let zIdx = 0;
    for (const key of Object.keys(block.zones)) {
      const len = block.zones[key].length;
      zones[key] = childBlocks.slice(zIdx, zIdx + len);
      zIdx += len;
    }
    if (childStripped) stripped = true;
    return { ...block, data, zones };
  });
  return { blocks: mapped, stripped };
}

export function triggerAutoSave(): void {
  markDocChanged();
  if (state.autoSaveTimer) clearTimeout(state.autoSaveTimer);
  state.autoSaveTimer = setTimeout(() => {
    const data = serializeDocument(state.paper, state.instances);
    const json = JSON.stringify(data);
    let toStore = json;
    let hadStrip = false;

    if (json.length > 4 * 1024 * 1024) {
      const { blocks, stripped } = stripBase64FromBlocks(data.blocks);
      if (stripped) {
        toStore = JSON.stringify({ ...data, blocks });
        hadStrip = true;
      }
    }

    try {
      localStorage.setItem(AUTOSAVE_KEY, toStore);
      showSaveStatus(
        hadStrip
          ? '⚠ Αποθηκεύτηκε χωρίς εικόνες — χρησιμοποιήστε JSON για πλήρη αποθήκευση'
          : 'Αποθηκεύτηκε αυτόματα',
      );
    } catch {
      showSaveStatus('⚠ Αποτυχία αποθήκευσης — χρησιμοποιήστε Αποθήκευση ως JSON');
    }
  }, 1800);
}
