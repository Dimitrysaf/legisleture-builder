import { state } from './state';
import { showSaveStatus, showSaveFeedback } from './toast';
import { serializeProject } from '../utils/fileOps';
import { newProject } from '../types/project';
import { saveProjectToWorkspace, saveProjectAsync } from '../utils/workspace';
import { saveVersion } from '../utils/versions';

export const AUTOSAVE_KEY = 'nb_autosave_v1';

// How many docVersion increments between auto-checkpoints
const CHECKPOINT_INTERVAL = 10;
let _lastCheckpointVersion = -1;

export function markDocChanged(): void {
  state.docVersion++;
  document.dispatchEvent(new CustomEvent('nb:unsaved'));
}

export function triggerAutoSave(): void {
  markDocChanged();
  if (state.autoSaveTimer) clearTimeout(state.autoSaveTimer);
  state.autoSaveTimer = setTimeout(() => {
    if (!state.currentProject) {
      state.currentProject = newProject();
    }
    const pf = serializeProject(state.paper, state.instances, state.currentProject);
    state.currentProject.blocks = pf.project.blocks;
    state.currentProject.modifiedAt = pf.project.modifiedAt;

    // Sync save to localStorage (fast, used for restore banner fallback)
    try {
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(pf));
      saveProjectToWorkspace(pf);
    } catch {
      // localStorage full — IndexedDB save below is the authoritative copy
    }

    // Async save to IndexedDB (primary, no size limit)
    saveProjectAsync(pf)
      .then(() => {
        showSaveFeedback('Αποθηκεύτηκε αυτόματα');
        // Create auto-checkpoint every CHECKPOINT_INTERVAL versions
        if (state.currentProject && state.docVersion - _lastCheckpointVersion >= CHECKPOINT_INTERVAL) {
          _lastCheckpointVersion = state.docVersion;
          saveVersion(state.currentProject.id, pf.project.blocks, undefined, true).catch(() => { /* non-fatal */ });
        }
      })
      .catch(() => showSaveStatus('⚠ Αποτυχία αποθήκευσης — χρησιμοποιήστε Εξαγωγή JSON'));
  }, 1800);
}
