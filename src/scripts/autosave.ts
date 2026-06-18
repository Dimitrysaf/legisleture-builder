import { state } from './state';
import { showSaveStatus } from './toast';
import { serializeProject } from '../utils/fileOps';
import { newProject } from '../types/project';

export const AUTOSAVE_KEY = 'nb_autosave_v1';

export function markDocChanged(): void {
  state.docVersion++;
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

    try {
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(pf));
      showSaveStatus('Αποθηκεύτηκε αυτόματα');
    } catch {
      showSaveStatus('⚠ Αποτυχία αποθήκευσης — χρησιμοποιήστε Αποθήκευση ως JSON');
    }
  }, 1800);
}
