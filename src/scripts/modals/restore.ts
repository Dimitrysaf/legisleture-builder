import { showSaveStatus } from '../toast';
import { loadFromSaveFile, loadFromProject } from '../blocks';
import { isSaveFile, isProjectFile } from '../../utils/fileOps';
import { AUTOSAVE_KEY } from '../autosave';

export function initRestoreBanner(): void {
  const banner = document.getElementById('nb-restore-banner');
  if (!banner) return;

  let onRestore: (() => void) | null = null;
  let savedAt = '';

  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);

    if (isProjectFile(parsed) && parsed.project.blocks.length > 0) {
      savedAt = parsed.project.modifiedAt;
      onRestore = () => loadFromProject(parsed.project);
    } else if (isSaveFile(parsed) && parsed.blocks.length > 0) {
      savedAt = parsed.savedAt;
      onRestore = () => loadFromSaveFile(parsed);
    } else {
      return;
    }
  } catch { return; }

  const tsEl = banner.querySelector<HTMLElement>('.nb-restore-time');
  if (tsEl && savedAt) {
    try {
      tsEl.textContent = new Date(savedAt).toLocaleString('el-GR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch { tsEl.textContent = savedAt; }
  }

  banner.removeAttribute('hidden');

  document.getElementById('nb-restore-yes')?.addEventListener('click', () => {
    onRestore?.();
    banner.setAttribute('hidden', '');
    showSaveStatus('Συνεδρία επαναφέρθηκε');
  });

  document.getElementById('nb-restore-dismiss')?.addEventListener('click', () => {
    banner.setAttribute('hidden', '');
    localStorage.removeItem(AUTOSAVE_KEY);
  });
}
