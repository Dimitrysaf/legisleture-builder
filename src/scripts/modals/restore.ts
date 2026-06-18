import { showSaveStatus } from '../toast';
import { loadFromSaveFile } from '../blocks';
import { isSaveFile, type SaveFile } from '../../utils/fileOps';
import { AUTOSAVE_KEY } from '../autosave';

export function initRestoreBanner(): void {
  const banner = document.getElementById('nb-restore-banner');
  if (!banner) return;

  let saveFile: SaveFile | null = null;
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!isSaveFile(parsed) || parsed.blocks.length === 0) return;
    saveFile = parsed;
  } catch { return; }

  const tsEl = banner.querySelector<HTMLElement>('.nb-restore-time');
  if (tsEl && saveFile!.savedAt) {
    try {
      tsEl.textContent = new Date(saveFile!.savedAt).toLocaleString('el-GR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch { tsEl.textContent = saveFile!.savedAt; }
  }

  banner.removeAttribute('hidden');

  document.getElementById('nb-restore-yes')?.addEventListener('click', () => {
    loadFromSaveFile(saveFile!);
    banner.setAttribute('hidden', '');
    showSaveStatus('Συνεδρία επαναφέρθηκε');
  });

  document.getElementById('nb-restore-dismiss')?.addEventListener('click', () => {
    banner.setAttribute('hidden', '');
    localStorage.removeItem(AUTOSAVE_KEY);
  });
}
