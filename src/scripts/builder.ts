import { state } from './state';
import { initToolbarAndPaper, undo, redo, insertPageBreak, loadFromProject } from './blocks';
import { applyModes, initModeTabs, refreshPreviewPane } from './modes';
import { initFileMenu } from './fileMenu';
import { initFekMetaModal } from './modals/fekMeta';
import { initRestoreBanner } from './modals/restore';
import { initSlotsModal } from './modals/slots';
import { initSettingsModal } from './modals/settings';
import { initVersionsModal } from './modals/versions';
import { initCompletenessModal } from './modals/completeness';
import { initLawIndexModal } from './modals/lawIndexModal';
import { loadProjectAsync } from '../utils/workspace';

// ── Bootstrap ─────────────────────────────────────────────────────

const paperEl  = document.getElementById('nb-paper')    as HTMLElement;
const toolbarEl = document.getElementById('nb-toolbar')  as HTMLElement;

initToolbarAndPaper(toolbarEl, paperEl);

// Load project specified in URL (?id=proj_xxx), or fall through to restore banner
const urlId = new URLSearchParams(location.search).get('id');
if (urlId) {
  loadProjectAsync(urlId).then(pf => {
    if (pf) {
      loadFromProject(pf.project);
      document.getElementById('nb-restore-banner')?.setAttribute('hidden', '');
      // Update page title with project name
      if (pf.project.name) document.title = `${pf.project.name} — Legisleture Builder`;
    }
  });
}

// ── Keyboard shortcuts ────────────────────────────────────────────

document.addEventListener('keydown', (e) => {
  const ctrl = e.ctrlKey || e.metaKey;
  if (!ctrl) return;
  if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
  if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); redo(); }
});

document.getElementById('nb-undo-btn')?.addEventListener('click', undo);
document.getElementById('nb-redo-btn')?.addEventListener('click', redo);

// ── Page break buttons ────────────────────────────────────────────

document.getElementById('nb-add-page-top')?.addEventListener('click',    () => insertPageBreak('start'));
document.getElementById('nb-add-page-bottom')?.addEventListener('click', () => insertPageBreak('end'));

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
    if (timers.has(dlg)) return true; // already animating out
    cancelPending(dlg);
    dlg.classList.add('nb-closing');
    timers.set(dlg, setTimeout(() => {
      timers.delete(dlg);
      dlg.classList.remove('nb-closing');
      origClose.call(dlg, retVal);
    }, CLOSE_MS));
    return true;
  }

  // Intercept form[method="dialog"] submits (✕ button + backdrop click)
  document.addEventListener('submit', (e) => {
    const form = e.target as HTMLFormElement;
    if (form.getAttribute('method') !== 'dialog') return;
    const dlg = form.closest('dialog.modal') as HTMLDialogElement | null;
    if (dlg && closeWithAnim(dlg)) e.preventDefault();
  }, true);

  // Intercept direct JS .close() calls
  HTMLDialogElement.prototype.close = function (returnValue?: string) {
    if (!closeWithAnim(this, returnValue)) origClose.call(this, returnValue);
  };

  // Patch showModal: cancel any pending close, play open animation
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
initSlotsModal();
initSettingsModal();
initVersionsModal();
initCompletenessModal();
initLawIndexModal();
initModeTabs();
applyModes(['edit']);

// Live preview polling — refreshes every 2 s when document changed and preview is visible
setInterval(() => {
  if (state.activeModes.includes('preview') && state.docVersion !== state.lastPreviewVersion) {
    state.lastPreviewVersion = state.docVersion;
    refreshPreviewPane();
  }
}, 2000);
