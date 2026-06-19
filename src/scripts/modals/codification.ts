import { state } from '../state';
import { escHtml } from '../../utils/escape';
import { showSaveStatus } from '../toast';
import { showAlert } from '../dialogs';
import { serializeDocument, downloadBlob, isProjectFile } from '../../utils/fileOps';
import { dbListProjects, dbLoadProject } from '../../utils/db';
import type { ProjectFile } from '../../types/project';
import {
  collectAmendments,
  applyAmendments,
  getLawIdsFromAmendments,
} from '../../utils/codification';

export function initCodificationModal(): void {
  const btn = document.getElementById('nb-codification-btn');
  if (!btn) return;

  let modal: HTMLDialogElement | null = null;

  btn.addEventListener('click', () => openModal());

  async function openModal() {
    if (!modal) {
      modal = document.createElement('dialog');
      modal.className = 'modal';
      document.body.appendChild(modal);
    }

    const save = serializeDocument(state.paper, state.instances);
    const lawIds = getLawIdsFromAmendments(save.blocks);
    const stubs = await dbListProjects();

    const hasAmendments = lawIds.length > 0;

    const lawOptions = lawIds
      .map(l => `<option value="${escHtml(l)}">${escHtml(l)}</option>`)
      .join('');
    const projectOptions = stubs
      .map(s => `<option value="${escHtml(s.id)}">${escHtml(s.name)}</option>`)
      .join('');

    modal.innerHTML = `
      <div class="modal-box w-11/12 max-w-lg font-sans">
        <form method="dialog">
          <button class="btn btn-sm btn-circle btn-ghost absolute right-3 top-3">✕</button>
        </form>
        <h3 class="font-bold text-base mb-1">Κωδικοποίηση</h3>
        <p class="text-xs text-base-content/50 mb-4">Εφαρμογή τροποποιήσεων σε νόμο βάσης για παραγωγή κωδικοποιημένου κειμένου.</p>

        ${!hasAmendments ? `
          <div class="alert alert-warning text-sm">Το τρέχον έγγραφο δεν περιέχει blocks τροποποίησης (Τροποποίηση).</div>
        ` : `
          <div class="mb-3">
            <label class="label pb-0.5"><span class="label-text text-xs font-medium">Τροποποιούμενος νόμος</span></label>
            <select id="nb-codif-law" class="select select-sm select-bordered w-full">${lawOptions}</select>
          </div>
          <div class="mb-1">
            <label class="label pb-0.5"><span class="label-text text-xs font-medium">Βάση νόμου (αποθηκευμένο έργο)</span></label>
            <select id="nb-codif-project" class="select select-sm select-bordered w-full">
              <option value="">— επιλέξτε έργο βάσης —</option>
              ${projectOptions}
            </select>
          </div>
          <div class="text-xs text-base-content/40 text-center my-1">ή</div>
          <label class="btn btn-xs btn-outline w-full cursor-pointer mb-3">
            Φόρτωση νόμου βάσης από αρχείο .json…
            <input type="file" accept=".json" id="nb-codif-file" class="sr-only">
          </label>
          <div id="nb-codif-status" class="text-xs text-base-content/60 min-h-[1.25rem] mb-3"></div>
          <button id="nb-codif-apply" class="btn btn-primary btn-sm w-full" disabled>
            Εφαρμογή κωδικοποίησης → λήψη JSON
          </button>
        `}

        <div class="modal-action mt-4">
          <form method="dialog"><button class="btn btn-ghost btn-sm">Κλείσιμο</button></form>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button>close</button></form>`;

    if (!hasAmendments) { modal.showModal(); return; }

    const lawSel    = modal.querySelector<HTMLSelectElement>('#nb-codif-law')!;
    const projSel   = modal.querySelector<HTMLSelectElement>('#nb-codif-project')!;
    const fileInput = modal.querySelector<HTMLInputElement>('#nb-codif-file')!;
    const statusEl  = modal.querySelector<HTMLElement>('#nb-codif-status')!;
    const applyBtn  = modal.querySelector<HTMLButtonElement>('#nb-codif-apply')!;

    let basePf: ProjectFile | null = null;

    function setBase(pf: ProjectFile) {
      basePf = pf;
      applyBtn.disabled = false;
      updateStatus();
    }

    function updateStatus() {
      const lawId = lawSel.value;
      const ops = collectAmendments(save.blocks, lawId);
      const baseLabel = basePf ? escHtml(basePf.project.name) : '—';
      statusEl.innerHTML = `${ops.length} τροποποιήσεις για «${escHtml(lawId)}» · βάση: ${baseLabel}`;
    }

    lawSel.addEventListener('change', updateStatus);

    projSel.addEventListener('change', async () => {
      const id = projSel.value;
      if (!id) { basePf = null; applyBtn.disabled = true; statusEl.textContent = ''; return; }
      const pf = await dbLoadProject(id);
      if (pf) setBase(pf);
      else showAlert('Δεν ήταν δυνατή η φόρτωση του έργου.', 'Σφάλμα');
    });

    fileInput.addEventListener('change', async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      try {
        const pf = JSON.parse(await file.text()) as unknown;
        if (isProjectFile(pf)) setBase(pf);
        else showAlert('Το αρχείο δεν αναγνωρίστηκε ως έγκυρο έργο (.json).', 'Σφάλμα');
      } catch {
        showAlert('Σφάλμα ανάγνωσης αρχείου.', 'Σφάλμα');
      }
      fileInput.value = '';
    });

    applyBtn.addEventListener('click', () => {
      if (!basePf) return;
      const lawId = lawSel.value;
      const ops = collectAmendments(save.blocks, lawId);
      const consolidated = applyAmendments(basePf.project.blocks, ops);

      const result: ProjectFile = {
        version: 2,
        app: 'legisleture-builder',
        project: {
          ...basePf.project,
          blocks: consolidated,
          name: `${basePf.project.name} [κωδικοποιημένο]`,
          modifiedAt: new Date().toISOString(),
        },
      };

      const filename = `${(basePf.project.name || 'nomos').replace(/[\s/\\]/g, '-')}-kodikop.json`;
      downloadBlob(JSON.stringify(result, null, 2), filename, 'application/json');
      showSaveStatus(`Κωδικοποιημένο: ${ops.length} τροποποιήσεις εφαρμόστηκαν`);
    });

    updateStatus();
    modal.showModal();
  }
}
