import { loadCustomTemplates, getTemplate } from '../templates/registry';
import type { Template, TemplateInstance } from '../templates/types';
import { initToolbar } from '../components/Toolbar';
import { openTemplateModal } from '../components/TemplateModal';
import { openTemplatePicker } from '../components/TemplatePicker';
import { icon, refreshIcons } from '../utils/icons';
import { countBlocksOfType, getSubParaDepth, toGreekSubNum } from '../utils/numbering';
import { registerEntry, unregisterEntry } from '../utils/docRegistry';
import { generateLatex } from '../utils/latex';
import {
  serializeDocument, exportHtml, exportTxt, downloadBlob, isSaveFile,
  type SaveFile, type SavedBlock,
} from '../utils/fileOps';
import { parseLaTeX } from '../utils/latexImport';

const NUMBERED_TEMPLATES = new Set(['part', 'chapter', 'section', 'article', 'paragraph']);

// ── Bootstrap ─────────────────────────────────────────────────────

loadCustomTemplates();

const paper = document.getElementById('nb-paper') as HTMLElement;
const toolbarEl = document.getElementById('nb-toolbar') as HTMLElement;

initToolbar(
  toolbarEl,
  (tpl: Template) => openInsertModal(tpl, paper),
);

// ── Block instances ───────────────────────────────────────────────

const instances = new Map<string, TemplateInstance>();

function openInsertModal(tpl: Template, targetContainer: HTMLElement, position: 'start' | 'end' = 'end'): void {
  const inputFields = tpl.fields.filter(f => f.type !== 'container');
  if (inputFields.length === 0) {
    const instance: TemplateInstance = {
      id: `inst_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      templateId: tpl.id,
      data: {},
    };
    insertBlock(tpl.render({}), instance, targetContainer, position);
    return;
  }

  const count = countBlocksOfType(tpl.id, targetContainer) + 1;
  const nextN = NUMBERED_TEMPLATES.has(tpl.id) ? count : undefined;
  const nextLabel = tpl.id === 'subparagraph'
    ? toGreekSubNum(count, getSubParaDepth(targetContainer))
    : undefined;

  openTemplateModal(tpl, null, (html, instance) => {
    insertBlock(html, instance, targetContainer, position);
  }, { nextN, nextLabel });
}

function insertBlock(
  html: string,
  instance: TemplateInstance,
  target: HTMLElement,
  position: 'start' | 'end' = 'end',
  opts: { noScroll?: boolean } = {},
): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'nb-block-wrapper';
  wrapper.dataset.instanceId = instance.id;
  wrapper.innerHTML = html;

  wrapper.querySelectorAll<HTMLElement>('.nb-container-zone').forEach(zone => {
    initContainerZone(zone);
  });

  attachActions(wrapper, instance.id, target);
  setupDrag(wrapper);
  instances.set(instance.id, instance);
  registerEntry(instance.id, instance.templateId, instance.data);

  if (position === 'start') {
    target.insertBefore(wrapper, target.firstChild);
  } else {
    target.appendChild(wrapper);
  }

  refreshIcons();
  if (!opts.noScroll) wrapper.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  triggerAutoSave();
  return wrapper;
}

function updateBlock(instanceId: string, html: string, newInstance: TemplateInstance): void {
  const wrapper = document.querySelector<HTMLElement>(`[data-instance-id="${instanceId}"]`);
  if (!wrapper) return;

  const savedChildren = new Map<string, Node[]>();
  wrapper.querySelectorAll<HTMLElement>('.nb-container-zone').forEach(zone => {
    const key = zone.dataset.containerFor!;
    savedChildren.set(key, Array.from(zone.childNodes));
  });

  const actions = wrapper.querySelector<HTMLElement>('.nb-block-actions');
  wrapper.innerHTML = html;
  if (actions) wrapper.appendChild(actions);

  wrapper.querySelectorAll<HTMLElement>('.nb-container-zone').forEach(zone => {
    const key = zone.dataset.containerFor!;
    const children = savedChildren.get(key) ?? [];
    children.forEach(child => zone.appendChild(child));
    initContainerZone(zone);
  });

  const updated = { ...newInstance, id: instanceId };
  instances.set(instanceId, updated);
  registerEntry(instanceId, updated.templateId, updated.data);
  refreshIcons();
  triggerAutoSave();
}

// ── Container zones ───────────────────────────────────────────────

function initContainerZone(zone: HTMLElement): void {
  if (zone.dataset.nbInit) return;
  zone.dataset.nbInit = '1';
  setupDropZone(zone);
}

// ── Mode management ───────────────────────────────────────────────

type AppMode = 'edit' | 'preview' | 'code';
let currentMode: AppMode = 'edit';

// Build multiple A4 preview-page elements from the current paper content.
// Explicit pagebreak blocks create new pages; blocks that overflow A4 height
// trigger automatic new pages at top-level block boundaries.
function buildPreviewPages(): HTMLElement {
  // .nb-paper has padding: 40px (top) and 56px (bottom)
  const PADDING_V = 40 + 56;

  // Measure actual A4 height in device pixels
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;top:0;left:0;height:297mm;visibility:hidden;pointer-events:none;';
  document.body.appendChild(probe);
  const a4Px = probe.getBoundingClientRect().height;
  document.body.removeChild(probe);
  const maxContentH = a4Px - PADDING_V;

  // Hidden container with the same width / font metrics as the paper
  const measurer = document.createElement('div');
  measurer.className = 'nb-paper';
  measurer.style.cssText =
    'position:fixed;top:0;left:-9999px;visibility:hidden;pointer-events:none;min-height:0;overflow:visible;';
  document.body.appendChild(measurer);

  // Split top-level wrappers at explicit pagebreak blocks
  const topWrappers = Array.from(
    paper.querySelectorAll<HTMLElement>(':scope > .nb-block-wrapper'),
  );
  const groups: HTMLElement[][] = [[]];
  for (const w of topWrappers) {
    const inst = instances.get(w.dataset.instanceId ?? '');
    if (inst?.templateId === 'pagebreak') {
      groups.push([]);
    } else {
      groups[groups.length - 1].push(w);
    }
  }

  const pagesEl = document.createElement('div');
  pagesEl.className = 'nb-preview-pages';

  function newPage(): HTMLElement {
    const p = document.createElement('div');
    p.className = 'nb-paper nb-preview-page-item';
    pagesEl.appendChild(p);
    return p;
  }

  for (const group of groups) {
    let pageEl = newPage();
    let pageH = 0;

    for (const wrapper of group) {
      // Clone the block and strip editing controls
      const clone = wrapper.cloneNode(true) as HTMLElement;
      clone.querySelector('.nb-block-actions')?.remove();

      // Measure height while temporarily in the measurer
      measurer.appendChild(clone);
      const cs = window.getComputedStyle(clone);
      const blockH =
        clone.getBoundingClientRect().height +
        parseFloat(cs.marginTop || '0') +
        parseFloat(cs.marginBottom || '0');
      measurer.removeChild(clone);

      // If this block doesn't fit on the current page (and the page isn't
      // empty — avoids an infinite loop for blocks taller than A4), start a
      // new page.
      if (pageH > 0 && pageH + blockH > maxContentH) {
        pageEl = newPage();
        pageH = 0;
      }

      pageEl.appendChild(clone); // clone is detached from measurer, safe to re-use
      pageH += blockH;
    }
  }

  document.body.removeChild(measurer);

  // Always show at least one page (e.g. empty document)
  if (pagesEl.children.length === 0) newPage();

  return pagesEl;
}

function setMode(mode: AppMode): void {
  currentMode = mode;
  document.body.dataset.nbMode = mode;

  document.querySelectorAll<HTMLButtonElement>('.nb-mode-tab').forEach(tab => {
    tab.classList.toggle('nb-mode-tab--active', tab.dataset.mode === mode);
  });

  const canvas = document.getElementById('nb-canvas');
  const codePanel = document.getElementById('nb-code-panel');

  // Always tear down any preview pages from a previous preview visit
  document.querySelector('.nb-preview-pages')?.remove();
  paper.style.display = '';

  if (mode === 'code') {
    if (canvas) canvas.style.display = 'none';
    if (codePanel) codePanel.style.display = 'flex';
    const latex = generateLatex(paper, instances);
    const codeEl = document.getElementById('nb-code-content');
    if (codeEl) codeEl.textContent = latex;
  } else {
    if (canvas) canvas.style.display = '';
    if (codePanel) codePanel.style.display = 'none';

    if (mode === 'preview') {
      paper.style.display = 'none';
      const pagesEl = buildPreviewPages();
      // Insert right before the paper element so canvas padding and layout apply
      canvas?.insertBefore(pagesEl, paper);
    }
  }
}

document.querySelectorAll<HTMLButtonElement>('.nb-mode-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const mode = tab.dataset.mode as AppMode;
    if (mode) setMode(mode);
  });
});

// Copy button
document.getElementById('nb-code-copy')?.addEventListener('click', (e) => {
  const content = document.getElementById('nb-code-content')?.textContent ?? '';
  navigator.clipboard.writeText(content).then(() => {
    const btn = e.currentTarget as HTMLButtonElement;
    const orig = btn.innerHTML;
    btn.textContent = 'Αντιγράφηκε!';
    setTimeout(() => { btn.innerHTML = orig; }, 1500);
  });
});

// Download button
document.getElementById('nb-code-download')?.addEventListener('click', () => {
  const content = document.getElementById('nb-code-content')?.textContent ?? '';
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'nomos.tex';
  a.click();
  URL.revokeObjectURL(url);
});

// ── Drag & Drop ───────────────────────────────────────────────────

let dragSrc: HTMLElement | null = null;
let pendingDrop: { before: HTMLElement | null; parent: HTMLElement } | null = null;

const dropLine = (() => {
  const el = document.createElement('div');
  el.className = 'nb-drop-indicator';
  document.body.appendChild(el);
  return el;
})();

function showDropLine(rect: DOMRect, atBottom: boolean): void {
  const y = atBottom ? rect.bottom + 2 : rect.top - 2;
  Object.assign(dropLine.style, {
    display: 'block',
    top: `${y}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
  });
}

function hideDropLine(): void {
  dropLine.style.display = 'none';
  pendingDrop = null;
}

function computeDrop(
  e: DragEvent,
  container: HTMLElement,
): { before: HTMLElement | null; ref: DOMRect | null; atBottom: boolean } {
  const siblings = Array.from(container.children).filter(
    (c): c is HTMLElement =>
      (c as HTMLElement).classList.contains('nb-block-wrapper') && c !== dragSrc,
  );

  for (const s of siblings) {
    const rect = s.getBoundingClientRect();
    if (e.clientY < rect.top + rect.height / 2) {
      return { before: s, ref: rect, atBottom: false };
    }
  }

  const last = siblings[siblings.length - 1];
  if (last) return { before: null, ref: last.getBoundingClientRect(), atBottom: true };

  return { before: null, ref: container.getBoundingClientRect(), atBottom: false };
}

function setupDrag(wrapper: HTMLElement): void {
  wrapper.addEventListener('dragstart', (e) => {
    if (currentMode !== 'edit') { e.preventDefault(); return; }
    dragSrc = wrapper;
    e.dataTransfer!.effectAllowed = 'move';
    requestAnimationFrame(() => wrapper.classList.add('nb-dragging'));
  });

  wrapper.addEventListener('dragend', () => {
    wrapper.classList.remove('nb-dragging');
    hideDropLine();
    dragSrc = null;
  });
}

function setupDropZone(container: HTMLElement): void {
  container.addEventListener('dragover', (e) => {
    if (!dragSrc || dragSrc.parentElement !== container) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer!.dropEffect = 'move';

    const { before, ref, atBottom } = computeDrop(e, container);
    pendingDrop = { before, parent: container };
    if (ref) showDropLine(ref, atBottom);
  });

  container.addEventListener('dragleave', (e) => {
    if (!container.contains(e.relatedTarget as Node)) hideDropLine();
  });

  container.addEventListener('drop', (e) => {
    if (!dragSrc || !pendingDrop || dragSrc.parentElement !== container) return;
    e.preventDefault();
    e.stopPropagation();

    const { before, parent } = pendingDrop;
    if (before) parent.insertBefore(dragSrc, before);
    else parent.appendChild(dragSrc);

    hideDropLine();
    triggerAutoSave();
  });
}

// Set up the paper as a top-level drop zone
setupDropZone(paper);

// ── Block actions ─────────────────────────────────────────────────

function attachActions(wrapper: HTMLElement, instanceId: string, _target: HTMLElement): void {
  const hasContainers = wrapper.querySelector('.nb-container-zone') !== null;

  const actions = document.createElement('div');
  actions.className = 'nb-block-actions';
  actions.innerHTML = `
    <button type="button" class="nb-action-btn nb-action-btn--drag" title="Σύρσιμο">${icon('grip-vertical', 'w-3.5 h-3.5')}</button>
    <button type="button" class="nb-action-btn nb-action-btn--up" title="Μετακίνηση πάνω">${icon('arrow-up', 'w-3.5 h-3.5')}</button>
    <button type="button" class="nb-action-btn nb-action-btn--down" title="Μετακίνηση κάτω">${icon('arrow-down', 'w-3.5 h-3.5')}</button>
    ${hasContainers ? `<button type="button" class="nb-action-btn nb-action-btn--add" title="Εισαγωγή μέσα">${icon('plus', 'w-3.5 h-3.5')}</button>` : ''}
    <button type="button" class="nb-action-btn nb-action-btn--edit" title="Επεξεργασία">${icon('pencil', 'w-3.5 h-3.5')}</button>
    <button type="button" class="nb-action-btn nb-action-btn--delete" title="Διαγραφή">${icon('trash-2', 'w-3.5 h-3.5')}</button>
  `;

  // Grip handle enables dragging only when the user mousedowns on it
  const dragHandle = actions.querySelector<HTMLElement>('.nb-action-btn--drag')!;
  dragHandle.addEventListener('mousedown', () => {
    wrapper.draggable = true;
    const off = () => { wrapper.draggable = false; };
    document.addEventListener('mouseup', off, { once: true });
    wrapper.addEventListener('dragend', off, { once: true });
  });

  actions.querySelector('.nb-action-btn--up')!.addEventListener('click', () => {
    const prev = wrapper.previousElementSibling;
    if (prev) wrapper.parentElement!.insertBefore(wrapper, prev);
  });

  actions.querySelector('.nb-action-btn--down')!.addEventListener('click', () => {
    const next = wrapper.nextElementSibling;
    if (next) next.after(wrapper);
  });

  if (hasContainers) {
    actions.querySelector('.nb-action-btn--add')!.addEventListener('click', () => {
      const zone = wrapper.querySelector<HTMLElement>('.nb-container-zone')!;
      openTemplatePicker((tpl) => {
        openInsertModal(tpl, zone);
      });
    });
  }

  actions.querySelector('.nb-action-btn--edit')!.addEventListener('click', () => {
    const inst = instances.get(instanceId);
    if (!inst) return;
    const tpl = getTemplate(inst.templateId);
    if (!tpl) return;
    openTemplateModal(tpl, inst, (html, updated) => updateBlock(instanceId, html, updated));
  });

  actions.querySelector('.nb-action-btn--delete')!.addEventListener('click', () => {
    wrapper.remove();
    instances.delete(instanceId);
    unregisterEntry(instanceId);
    triggerAutoSave();
  });

  wrapper.appendChild(actions);
}

// ── Page break buttons ────────────────────────────────────────────

function insertPageBreak(position: 'start' | 'end'): void {
  const tpl = getTemplate('pagebreak');
  if (!tpl) return;
  const instance: TemplateInstance = {
    id: `inst_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    templateId: 'pagebreak',
    data: {},
  };
  insertBlock(tpl.render({}), instance, paper, position);
}

document.getElementById('nb-add-page-top')?.addEventListener('click', () => insertPageBreak('start'));
document.getElementById('nb-add-page-bottom')?.addEventListener('click', () => insertPageBreak('end'));

// ── Auto-save ─────────────────────────────────────────────────────

const AUTOSAVE_KEY = 'nb_autosave_v1';
let _autoSaveTimer: ReturnType<typeof setTimeout> | null = null;

function triggerAutoSave(): void {
  if (_autoSaveTimer) clearTimeout(_autoSaveTimer);
  _autoSaveTimer = setTimeout(() => {
    const data = serializeDocument(paper, instances);
    try {
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(data));
      showSaveStatus('Αποθηκεύτηκε αυτόματα');
    } catch { /* quota exceeded */ }
  }, 1800);
}

function showSaveStatus(msg: string): void {
  const el = document.getElementById('nb-save-status');
  if (!el) return;
  el.textContent = msg;
  el.removeAttribute('hidden');
  clearTimeout((el as any)._timer);
  (el as any)._timer = setTimeout(() => el.setAttribute('hidden', ''), 4000);
}

// ── Document serialization / restore ─────────────────────────────

function clearDocument(): void {
  Array.from(paper.children)
    .filter(el => (el as HTMLElement).classList.contains('nb-block-wrapper'))
    .forEach(el => {
      const id = (el as HTMLElement).dataset.instanceId;
      if (id) { instances.delete(id); unregisterEntry(id); }
      el.remove();
    });
}

function deserializeBlocks(blocks: SavedBlock[], container: HTMLElement): void {
  for (const block of blocks) {
    const tpl = getTemplate(block.templateId);
    if (!tpl) continue;

    const instance: TemplateInstance = {
      id: block.id,
      templateId: block.templateId,
      data: block.data,
    };

    const wrapper = insertBlock(tpl.render(block.data), instance, container, 'end', { noScroll: true });

    for (const [key, childBlocks] of Object.entries(block.zones)) {
      const zone = wrapper.querySelector<HTMLElement>(`.nb-container-zone[data-container-for="${key}"]`);
      if (zone && childBlocks.length > 0) deserializeBlocks(childBlocks, zone);
    }
  }
}

function loadFromSaveFile(saveFile: SaveFile): void {
  clearDocument();
  deserializeBlocks(saveFile.blocks, paper);
  refreshIcons();
}

// ── Export / Import handlers ──────────────────────────────────────

function saveAsJson(): void {
  const data = serializeDocument(paper, instances);
  downloadBlob(JSON.stringify(data, null, 2), 'nomos.json', 'application/json');
}

function exportHtmlFile(): void {
  downloadBlob(exportHtml(paper), 'nomos.html', 'text/html');
}

function exportLatexFile(): void {
  downloadBlob(generateLatex(paper, instances), 'nomos.tex', 'text/plain');
}

function exportTxtFile(): void {
  downloadBlob(exportTxt(paper), 'nomos.txt', 'text/plain');
}

// Open the clean HTML export in a blank popup and trigger the browser print
// dialog there. This avoids every editor-layout issue: no padding leakage,
// no UI chrome, no overflow-hidden conflicts — just the document.
function printDocument(): void {
  const html = exportHtml(paper);
  const popup = window.open('', '_blank');
  if (!popup) {
    alert(
      'Ο browser απέκλεισε το παράθυρο εκτύπωσης.\n' +
      'Παρακαλώ επιτρέψτε τα popups για αυτή τη σελίδα και ξαναπροσπαθήστε.',
    );
    return;
  }
  popup.document.open();
  popup.document.write(html);
  popup.document.close();
  // Give fonts & styles ~600 ms to apply before the print dialog appears
  setTimeout(() => { popup.focus(); popup.print(); }, 600);
}

// ── File menu & restore banner ────────────────────────────────────

function initFileMenu(): void {
  const importBtn = document.getElementById('nb-import-btn');
  const importInput = document.getElementById('nb-import-input') as HTMLInputElement | null;
  const trigger = document.getElementById('nb-export-trigger');
  const menu = document.getElementById('nb-file-menu');

  importBtn?.addEventListener('click', () => importInput?.click());

  importInput?.addEventListener('change', async () => {
    const file = importInput!.files?.[0];
    if (!file) return;

    let text: string;
    try {
      text = await file.text();
    } catch {
      alert('Αδύνατη η ανάγνωση του αρχείου από τον browser.');
      importInput!.value = '';
      return;
    }

    const isTeX = /\.(tex|latex)$/i.test(file.name);

    if (isTeX) {
      try {
        const saveFile = parseLaTeX(text);
        if (saveFile.blocks.length === 0) {
          alert(`Το αρχείο «${file.name}» δεν περιείχε αναγνωρίσιμα blocks.\n\nΒεβαιωθείτε ότι εξήχθη από αυτή την εφαρμογή.`);
          importInput!.value = '';
          return;
        }
        loadFromSaveFile(saveFile);
        showSaveStatus('Φορτώθηκε από LaTeX');
      } catch (err) {
        console.error('[import tex]', err);
        alert('Σφάλμα κατά την ανάλυση του .tex αρχείου. Λεπτομέρειες στην κονσόλα.');
      }
    } else {
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        alert(
          `Το αρχείο «${file.name}» δεν αναγνωρίστηκε.\n\n` +
          'Η Εισαγωγή δέχεται:\n• Αρχεία .json  (από «Αποθήκευση ως JSON»)\n• Αρχεία .tex   (LaTeX εξαγωγή από αυτή την εφαρμογή)',
        );
        importInput!.value = '';
        return;
      }

      if (!isSaveFile(parsed)) {
        alert(
          `Το αρχείο «${file.name}» δεν είναι έγκυρο αρχείο αποθήκευσης.\n\n` +
          'Βεβαιωθείτε ότι επιλέξατε αρχείο .json που εξήχθη από «Αποθήκευση ως JSON».',
        );
        importInput!.value = '';
        return;
      }

      try {
        loadFromSaveFile(parsed);
        showSaveStatus('Φορτώθηκε επιτυχώς');
      } catch (err) {
        console.error('[import json]', err);
        alert('Σφάλμα κατά την ανακατασκευή του εγγράφου. Λεπτομέρειες στην κονσόλα.');
      }
    }

    importInput!.value = '';
  });

  trigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    menu?.toggleAttribute('hidden');
  });

  document.addEventListener('click', () => menu?.setAttribute('hidden', ''));
  menu?.addEventListener('click', (e) => e.stopPropagation());

  menu?.querySelectorAll<HTMLButtonElement>('[data-file-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      menu!.setAttribute('hidden', '');
      switch (btn.dataset.fileAction) {
        case 'save-json':    saveAsJson(); break;
        case 'export-html':  exportHtmlFile(); break;
        case 'export-latex': exportLatexFile(); break;
        case 'export-txt':   exportTxtFile(); break;
        case 'export-pdf':   printDocument(); break;
      }
    });
  });
}

function initRestoreBanner(): void {
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

// ── Init ──────────────────────────────────────────────────────────

initFileMenu();
initRestoreBanner();
