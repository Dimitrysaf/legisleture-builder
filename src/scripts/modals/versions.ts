import { state } from '../state';
import { showSaveStatus } from '../toast';
import { listVersions, loadVersion, deleteVersion, saveVersion } from '../../utils/versions';
import { loadFromProject } from '../blocks';
import { serializeProject } from '../../utils/fileOps';
import { newProject } from '../../types/project';

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('el-GR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  } catch { return iso; }
}

async function renderVersionList(modal: HTMLDialogElement): Promise<void> {
  const list = modal.querySelector<HTMLElement>('#nb-ver-list');
  if (!list) return;

  const projectId = state.currentProject?.id;
  if (!projectId) {
    list.innerHTML = '<p class="text-sm text-base-content/50 text-center py-3">Δεν υπάρχει ανοιχτό έργο.</p>';
    return;
  }

  list.innerHTML = '<p class="text-sm text-base-content/40 py-2">Φόρτωση…</p>';
  const versions = await listVersions(projectId);

  if (versions.length === 0) {
    list.innerHTML = '<p class="text-sm text-base-content/50 text-center py-3">Δεν υπάρχουν αποθηκευμένες εκδόσεις.</p>';
    return;
  }

  list.innerHTML = versions.map(v => `
    <div class="nb-ver-row" data-ver-id="${v.id}">
      <div class="nb-ver-info">
        <span class="nb-ver-label">${v.comment ? escHtml(v.comment) : (v.auto ? 'Αυτόματο checkpoint' : 'Χειροκίνητο snapshot')}</span>
        <span class="nb-ver-time">${formatDate(v.savedAt)}</span>
      </div>
      <div class="nb-ver-actions">
        <button type="button" class="btn btn-xs btn-ghost" data-ver-restore="${v.id}">Επαναφορά</button>
        <button type="button" class="btn btn-xs btn-ghost text-error" data-ver-delete="${v.id}">✕</button>
      </div>
    </div>`).join('');

  list.querySelectorAll<HTMLButtonElement>('[data-ver-restore]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const v = await loadVersion(btn.dataset.verRestore!);
      if (!v) return;
      const project = state.currentProject ?? newProject();
      project.blocks = v.blocks;
      loadFromProject(project);
      modal.close();
      showSaveStatus(`Επαναφορά: ${formatDate(v.savedAt)}`);
    });
  });

  list.querySelectorAll<HTMLButtonElement>('[data-ver-delete]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await deleteVersion(btn.dataset.verDelete!);
      renderVersionList(modal);
    });
  });
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function initVersionsModal(): void {
  const btn = document.getElementById('nb-versions-btn');
  if (!btn) return;

  let modal: HTMLDialogElement | null = null;

  btn.addEventListener('click', () => {
    if (!modal) {
      modal = document.createElement('dialog');
      modal.className = 'modal';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="modal-box w-11/12 max-w-lg font-sans">
        <form method="dialog">
          <button class="btn btn-sm btn-circle btn-ghost absolute right-3 top-3">✕</button>
        </form>
        <h3 class="font-bold text-base mb-1">Ιστορικό Εκδόσεων</h3>
        <p class="text-xs text-base-content/50 mb-4">Αυτόματα checkpoints + χειροκίνητα snapshots. Επαναφορά αντικαθιστά το τρέχον έγγραφο.</p>
        <div class="mb-3 flex gap-2">
          <input type="text" id="nb-ver-comment" class="input input-bordered input-xs flex-1"
            placeholder="Σχόλιο (προαιρετικό)…" maxlength="100">
          <button type="button" id="nb-ver-save-btn" class="btn btn-primary btn-xs">Αποθήκευση snapshot</button>
        </div>
        <div id="nb-ver-list" class="flex flex-col gap-1 max-h-72 overflow-y-auto"></div>
        <div class="modal-action mt-4">
          <form method="dialog"><button class="btn btn-ghost btn-sm">Κλείσιμο</button></form>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button>close</button></form>`;

    renderVersionList(modal);

    modal.querySelector('#nb-ver-save-btn')?.addEventListener('click', async () => {
      const comment = modal!.querySelector<HTMLInputElement>('#nb-ver-comment')?.value.trim();
      const projectId = state.currentProject?.id;
      if (!projectId) return;
      const pf = serializeProject(state.paper, state.instances, state.currentProject!);
      await saveVersion(projectId, pf.project.blocks, comment || undefined, false);
      if (modal!.querySelector<HTMLInputElement>('#nb-ver-comment')) {
        (modal!.querySelector<HTMLInputElement>('#nb-ver-comment')!).value = '';
      }
      renderVersionList(modal!);
      showSaveStatus('Snapshot αποθηκεύτηκε');
    });

    modal.showModal();
  });
}
