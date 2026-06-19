import { state } from './state';
import { initPaper, undo, redo, loadFromProject } from './blocks';
import { applyModes, initModeTabs } from './modes';
import { initFileMenu } from './fileMenu';
import { initFekMetaModal } from './modals/fekMeta';
import { initRestoreBanner } from './modals/restore';
import { initSettingsModal } from './modals/settings';
import { initFormEditor, renderFormDoc } from './formEditor';
import { initMenubar } from './menubar';
import { loadProjectAsync } from '../utils/workspace';
import { saveProjectAsync } from '../utils/workspace';
import { serializeProject } from '../utils/fileOps';
import { showSaveStatus, showSaveFeedback } from './toast';

// ── Bootstrap ─────────────────────────────────────────────────────

const paperEl    = document.getElementById('nb-paper')    as HTMLElement;
const menubarEl  = document.getElementById('nb-menubar')  as HTMLElement;
const formPaneEl = document.getElementById('nb-form-pane') as HTMLElement;

initMenubar(menubarEl);
initPaper(paperEl);
initFormEditor(formPaneEl);

// Load project from URL (?id=...) or fall through to restore banner
const urlId = new URLSearchParams(location.search).get('id');
if (urlId) {
  loadProjectAsync(urlId).then(pf => {
    if (pf) {
      loadFromProject(pf.project);
      document.getElementById('nb-restore-banner')?.setAttribute('hidden', '');
      if (pf.project.name) document.title = `${pf.project.name} — Legisleture Builder`;
      renderFormDoc();
    }
  });
}

// ── Save (Ctrl+S / Save button) ───────────────────────────────────

async function saveProject(): Promise<void> {
  const proj = state.currentProject;
  if (!proj) { showSaveStatus('Δεν υπάρχει τρέχον έργο'); return; }
  try {
    const pf = serializeProject(state.paper, state.instances, proj);
    await saveProjectAsync(pf);
    showSaveFeedback('Αποθηκεύτηκε');
  } catch (err) {
    console.error('[save]', err);
    showSaveStatus('Σφάλμα αποθήκευσης');
  }
}

document.getElementById('nb-save-btn')?.addEventListener('click', saveProject);
document.addEventListener('nb:save', saveProject);

// ── Keyboard shortcuts ────────────────────────────────────────────

document.addEventListener('keydown', (e) => {
  const ctrl = e.ctrlKey || e.metaKey;
  if (!ctrl) return;
  if (e.key === 's') { e.preventDefault(); saveProject(); }
  if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); renderFormDoc(); }
  if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); redo(); renderFormDoc(); }
});

// ── Modal open/close animations ───────────────────────────────────

;(() => {
  const CLOSE_MS = 110;
  const origClose     = HTMLDialogElement.prototype.close;
  const origShowModal = HTMLDialogElement.prototype.showModal;
  const timers        = new WeakMap<HTMLDialogElement, ReturnType<typeof setTimeout>>();

  function cancelPending(dlg: HTMLDialogElement) {
    const t = timers.get(dlg);
    if (t !== undefined) { clearTimeout(t); timers.delete(dlg); }
    dlg.classList.remove('nb-closing', 'nb-opening');
  }

  function closeWithAnim(dlg: HTMLDialogElement, retVal?: string): boolean {
    if (!dlg.classList.contains('modal')) return false;
    if (timers.has(dlg)) return true;
    cancelPending(dlg);
    dlg.classList.add('nb-closing');
    timers.set(dlg, setTimeout(() => {
      timers.delete(dlg);
      dlg.classList.remove('nb-closing');
      origClose.call(dlg, retVal);
    }, CLOSE_MS));
    return true;
  }

  document.addEventListener('submit', (e) => {
    const form = e.target as HTMLFormElement;
    if (form.getAttribute('method') !== 'dialog') return;
    const dlg = form.closest('dialog.modal') as HTMLDialogElement | null;
    if (dlg && closeWithAnim(dlg)) e.preventDefault();
  }, true);

  HTMLDialogElement.prototype.close = function (returnValue?: string) {
    if (!closeWithAnim(this, returnValue)) origClose.call(this, returnValue);
  };

  HTMLDialogElement.prototype.showModal = function () {
    cancelPending(this);
    origShowModal.call(this);
    if (this.classList.contains('modal')) {
      this.classList.add('nb-opening');
      setTimeout(() => this.classList.remove('nb-opening'), 160);
    }
  };
})();

// ── Init ──────────────────────────────────────────────────────────

initFileMenu();
initRestoreBanner();
initFekMetaModal();
initSettingsModal();
initModeTabs();
applyModes(['edit']);
