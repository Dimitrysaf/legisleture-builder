import { state } from './state';
import { initToolbarAndPaper, undo, redo, insertPageBreak } from './blocks';
import { applyModes, initModeTabs, refreshPreviewPane } from './modes';
import { initFileMenu } from './fileMenu';
import { initFekMetaModal } from './modals/fekMeta';
import { initRestoreBanner } from './modals/restore';
import { initSlotsModal } from './modals/slots';
import { initSettingsModal } from './modals/settings';

// ── Bootstrap ─────────────────────────────────────────────────────

const paperEl  = document.getElementById('nb-paper')    as HTMLElement;
const toolbarEl = document.getElementById('nb-toolbar')  as HTMLElement;

initToolbarAndPaper(toolbarEl, paperEl);

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

// ── Init ──────────────────────────────────────────────────────────

initFileMenu();
initRestoreBanner();
initFekMetaModal();
initSlotsModal();
initSettingsModal();
initModeTabs();
applyModes(['edit']);

// Live preview polling — refreshes every 2 s when document changed and preview is visible
setInterval(() => {
  if (state.activeModes.includes('preview') && state.docVersion !== state.lastPreviewVersion) {
    state.lastPreviewVersion = state.docVersion;
    refreshPreviewPane();
  }
}, 2000);
