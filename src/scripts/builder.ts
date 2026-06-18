import { loadCustomTemplates, getTemplate } from '../templates/registry';
import type { Template, TemplateInstance } from '../templates/types';
import { initToolbar } from '../components/Toolbar';
import { openTemplateModal } from '../components/TemplateModal';
import { openTemplatePicker } from '../components/TemplatePicker';
import { icon, refreshIcons } from '../utils/icons';
import { countBlocksOfType, getSubParaDepth, toGreekSubNum, renumberDocument } from '../utils/numbering';
import { registerEntry, unregisterEntry } from '../utils/docRegistry';
import { generateLatex } from '../utils/latex';
import {
  serializeDocument, exportHtml, exportFekHtml, buildDocHtml, exportTxt, downloadBlob, isSaveFile,
  type SaveFile, type SavedBlock,
} from '../utils/fileOps';
import {
  pushSnapshot, undoPop, redoPop, pushRedo, pushUndoOnly, canUndo, canRedo, clearHistory,
} from '../utils/history';
import { listSlots, saveSlot, loadSlot, deleteSlot, slotTimestamp } from '../utils/saveSlots';
import { parseLaTeX } from '../utils/latexImport';
import {
  loadFekMeta, saveFekMeta, hasFekMeta, buildFekHeaderHtml,
  type FekMeta,
} from '../utils/fekMeta';

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

// ── TOC generation ────────────────────────────────────────────────

const TOC_LEVELS = new Set(['part', 'chapter', 'section', 'article', 'final-article', 'annex', 'transitional']);

function collectTocItems(
  wrapper: HTMLElement,
  out: { label: string; level: string }[],
): void {
  const id = wrapper.dataset.instanceId;
  if (!id) return;
  const inst = instances.get(id);
  if (!inst) return;

  if (TOC_LEVELS.has(inst.templateId)) {
    const heading = wrapper.querySelector<HTMLElement>('.nb-struct-heading');
    if (heading) {
      const role = heading.querySelector<HTMLElement>('.nb-struct-role')?.textContent?.trim() ?? '';
      const title = heading.querySelector<HTMLElement>('.nb-struct-title')?.textContent?.trim() ?? '';
      const label = title ? `${role} — ${title}` : role;
      if (label) out.push({ label, level: inst.templateId });
    }
  }

  wrapper.querySelectorAll<HTMLElement>(':scope .nb-container-zone').forEach(zone => {
    zone.querySelectorAll<HTMLElement>(':scope > .nb-block-wrapper').forEach(child => {
      collectTocItems(child, out);
    });
  });
}

function generateTocBody(): string {
  const items: { label: string; level: string }[] = [];
  paper.querySelectorAll<HTMLElement>(':scope > .nb-block-wrapper').forEach(w => {
    collectTocItems(w, items);
  });
  if (items.length === 0) return '';
  return items
    .map(({ label, level }) => `<div class="nb-toc-item nb-toc-item--${level}">${label}</div>`)
    .join('');
}

// ─────────────────────────────────────────────────────────────────

function openInsertModal(tpl: Template, targetContainer: HTMLElement, position: 'start' | 'end' = 'end'): void {
  // TOC: auto-generate from document structure without showing a modal
  if (tpl.id === 'toc') {
    const body = generateTocBody();
    const instance: TemplateInstance = {
      id: `inst_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      templateId: 'toc',
      data: { body },
    };
    insertBlock(tpl.render({ body }), instance, targetContainer, position);
    return;
  }

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

function captureSnapshot(): string {
  return JSON.stringify(serializeDocument(paper, instances));
}

function applySnapshot(snap: string): void {
  const save = JSON.parse(snap) as SaveFile;
  clearDocument();
  deserializeBlocks(save.blocks, paper);
  renumberDocument(paper, instances);
}

function undo(): void {
  const snap = undoPop();
  if (!snap) return;
  pushRedo(captureSnapshot());
  applySnapshot(snap);
  showSaveStatus('↩ Αναίρεση');
}

function redo(): void {
  const snap = redoPop();
  if (!snap) return;
  pushUndoOnly(captureSnapshot());
  applySnapshot(snap);
  showSaveStatus('↪ Επανάληψη');
}

function insertBlock(
  html: string,
  instance: TemplateInstance,
  target: HTMLElement,
  position: 'start' | 'end' = 'end',
  opts: { noScroll?: boolean; noRenumber?: boolean; noHistory?: boolean } = {},
): HTMLElement {
  if (!opts.noHistory) pushSnapshot(captureSnapshot());
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

  if (!opts.noRenumber) renumberDocument(paper, instances);
  refreshIcons();
  if (!opts.noScroll) wrapper.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  triggerAutoSave();
  return wrapper;
}

function updateBlock(instanceId: string, html: string, newInstance: TemplateInstance): void {
  pushSnapshot(captureSnapshot());
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
  if (activeModes.includes('preview')) refreshPreviewPane();
}

// ── Container zones ───────────────────────────────────────────────

function initContainerZone(zone: HTMLElement): void {
  if (zone.dataset.nbInit) return;
  zone.dataset.nbInit = '1';
  setupDropZone(zone);
}

// ── Mode management ───────────────────────────────────────────────

type AppMode = 'edit' | 'preview' | 'code';

// Ordered list of active modes (1 or 2). First = left pane, second = right pane.
let activeModes: AppMode[] = ['edit'];

// Derived shorthand used by drag checks
let currentMode: AppMode = 'edit';

// Build multiple A4 preview-page elements from the current paper content.
// Explicit pagebreak blocks create new pages; blocks that overflow A4 height
// trigger automatic new pages at top-level block boundaries.
function buildPreviewPages(): HTMLElement {
  // .nb-paper has top padding 20px (with ΦΕΚ header) or 40px, bottom 56px
  const fekMeta = loadFekMeta();
  const PADDING_V = (hasFekMeta(fekMeta) ? 20 : 40) + 56;

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

  // Inject ΦΕΚ header into the first page when metadata is present
  let firstPageInjected = false;
  function injectFekHeaderIfNeeded(page: HTMLElement): void {
    if (firstPageInjected || !hasFekMeta(fekMeta)) return;
    firstPageInjected = true;
    const headerHtml = buildFekHeaderHtml(fekMeta, '/Coat_of_arms_of_Greece.svg');
    const headerWrapper = document.createElement('div');
    headerWrapper.innerHTML = headerHtml;
    page.insertBefore(headerWrapper.firstElementChild!, page.firstChild);
  }

  for (const group of groups) {
    let pageEl = newPage();
    injectFekHeaderIfNeeded(pageEl);
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

function refreshPreviewPane(): void {
  const pane = document.getElementById('nb-preview-pane');
  if (!pane) return;
  let iframe = pane.querySelector<HTMLIFrameElement>('iframe');
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.className = 'nb-preview-iframe';
    pane.appendChild(iframe);
  }
  const meta = loadFekMeta();
  iframe.srcdoc = buildDocHtml(paper, hasFekMeta(meta) ? meta : null);
  iframe.onload = () => {
    const body = (iframe as HTMLIFrameElement).contentDocument?.body;
    if (body) (iframe as HTMLIFrameElement).style.height = body.scrollHeight + 40 + 'px';
  };
}

function applyModes(modes: AppMode[]): void {
  activeModes = modes;
  const isSplit = modes.length === 2;
  const hasEdit    = modes.includes('edit');
  const hasPreview = modes.includes('preview');
  const hasCode    = modes.includes('code');

  // Derived single-mode value used by drag / touch checks
  currentMode = hasEdit ? 'edit' : hasPreview ? 'preview' : 'code';
  document.body.dataset.nbMode = currentMode;
  document.body.classList.toggle('nb-split', isSplit);

  // Update tab visual states
  document.querySelectorAll<HTMLButtonElement>('.nb-mode-tab').forEach(tab => {
    const m = tab.dataset.mode as AppMode;
    const isActive   = modes.includes(m);
    const isDisabled = isSplit && !isActive;
    tab.classList.toggle('nb-mode-tab--active',   isActive);
    tab.classList.toggle('nb-mode-tab--disabled', isDisabled);
    tab.disabled = isDisabled;
  });

  const canvas      = document.getElementById('nb-canvas');
  const previewPane = document.getElementById('nb-preview-pane');
  const codePanel   = document.getElementById('nb-code-panel');

  // canvas and codePanel have no display:none in CSS → reset to '' to get flex-item behaviour
  if (canvas)      canvas.style.display      = hasEdit ? '' : 'none';
  // previewPane CSS default is display:none → must set explicitly when showing
  if (previewPane) previewPane.style.display  = hasPreview ? 'flex' : 'none';
  if (codePanel)   codePanel.style.display    = hasCode    ? ''     : 'none';

  if (hasPreview) refreshPreviewPane();

  if (hasCode) {
    const codeEl = document.getElementById('nb-code-content');
    if (codeEl) codeEl.textContent = generateLatex(paper, instances);
  }
}

document.querySelectorAll<HTMLButtonElement>('.nb-mode-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const mode = tab.dataset.mode as AppMode;
    if (!mode) return;

    if (activeModes.includes(mode)) {
      // Deselect only when 2 are active (always keep at least 1)
      if (activeModes.length > 1) {
        applyModes(activeModes.filter(m => m !== mode));
      }
    } else {
      // Add to active (max 2); if already 2, replace the second
      const next = activeModes.length < 2
        ? [...activeModes, mode]
        : [activeModes[0], mode];
      applyModes(next as AppMode[]);
    }
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

    pushSnapshot(captureSnapshot());
    const { before, parent } = pendingDrop;
    if (before) parent.insertBefore(dragSrc, before);
    else parent.appendChild(dragSrc);

    hideDropLine();
    renumberDocument(paper, instances);
    triggerAutoSave();
    if (activeModes.includes('preview')) refreshPreviewPane();
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

  // Touch drag: move block up/down by touch-scrolling over siblings
  let touchDragActive = false;
  let touchLastY = 0;
  dragHandle.addEventListener('touchstart', (e) => {
    if (currentMode !== 'edit') return;
    e.preventDefault();
    touchDragActive = true;
    touchLastY = e.touches[0].clientY;
    wrapper.classList.add('nb-dragging');
  }, { passive: false });

  document.addEventListener('touchmove', (e) => {
    if (!touchDragActive) return;
    e.preventDefault();
    const y = e.touches[0].clientY;
    const dy = y - touchLastY;
    touchLastY = y;

    const target = document.elementFromPoint(e.touches[0].clientX, y);
    if (!target) return;
    const sibling = target.closest<HTMLElement>('.nb-block-wrapper');
    if (!sibling || sibling === wrapper || sibling.parentElement !== wrapper.parentElement) return;

    const rect = sibling.getBoundingClientRect();
    const insertBefore = y < rect.top + rect.height / 2;
    pushSnapshot(captureSnapshot());
    if (insertBefore) {
      wrapper.parentElement!.insertBefore(wrapper, sibling);
    } else {
      sibling.after(wrapper);
    }
    renumberDocument(paper, instances);
  }, { passive: false });

  document.addEventListener('touchend', () => {
    if (!touchDragActive) return;
    touchDragActive = false;
    wrapper.classList.remove('nb-dragging');
    triggerAutoSave();
  }, { passive: true });

  actions.querySelector('.nb-action-btn--up')!.addEventListener('click', () => {
    const prev = wrapper.previousElementSibling;
    if (prev) {
      pushSnapshot(captureSnapshot());
      wrapper.parentElement!.insertBefore(wrapper, prev);
      renumberDocument(paper, instances);
      triggerAutoSave();
    }
  });

  actions.querySelector('.nb-action-btn--down')!.addEventListener('click', () => {
    const next = wrapper.nextElementSibling;
    if (next) {
      pushSnapshot(captureSnapshot());
      next.after(wrapper);
      renumberDocument(paper, instances);
      triggerAutoSave();
    }
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
    // TOC: re-generate instead of opening modal
    if (inst.templateId === 'toc') {
      const body = generateTocBody();
      const updated = { ...inst, data: { body } };
      updateBlock(instanceId, tpl.render({ body }), updated);
      showSaveStatus('Πίνακας περιεχομένων ανανεώθηκε');
      return;
    }
    openTemplateModal(tpl, inst, (html, updated) => updateBlock(instanceId, html, updated));
  });

  actions.querySelector('.nb-action-btn--delete')!.addEventListener('click', () => {
    pushSnapshot(captureSnapshot());
    wrapper.remove();
    instances.delete(instanceId);
    unregisterEntry(instanceId);
    renumberDocument(paper, instances);
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

function stripBase64FromBlocks(blocks: SavedBlock[]): { blocks: SavedBlock[]; stripped: boolean } {
  let stripped = false;
  const mapped = blocks.map(block => {
    const data = { ...block.data };
    if (block.templateId === 'image-block' && data.src?.startsWith('data:')) {
      data.src = '';
      stripped = true;
    }
    const { blocks: childBlocks, stripped: childStripped } = stripBase64FromBlocks(
      Object.values(block.zones).flat(),
    );
    // Rebuild zones with stripped children
    const zones: typeof block.zones = {};
    let zIdx = 0;
    for (const key of Object.keys(block.zones)) {
      const len = block.zones[key].length;
      zones[key] = childBlocks.slice(zIdx, zIdx + len);
      zIdx += len;
    }
    if (childStripped) stripped = true;
    return { ...block, data, zones };
  });
  return { blocks: mapped, stripped };
}

function triggerAutoSave(): void {
  if (_autoSaveTimer) clearTimeout(_autoSaveTimer);
  _autoSaveTimer = setTimeout(() => {
    const data = serializeDocument(paper, instances);
    const json = JSON.stringify(data);
    let toStore = json;
    let hadStrip = false;

    // If payload exceeds ~4 MB, remove base64 image data to stay within localStorage limits
    if (json.length > 4 * 1024 * 1024) {
      const { blocks, stripped } = stripBase64FromBlocks(data.blocks);
      if (stripped) {
        toStore = JSON.stringify({ ...data, blocks });
        hadStrip = true;
      }
    }

    try {
      localStorage.setItem(AUTOSAVE_KEY, toStore);
      showSaveStatus(
        hadStrip
          ? '⚠ Αποθηκεύτηκε χωρίς εικόνες — χρησιμοποιήστε JSON για πλήρη αποθήκευση'
          : 'Αποθηκεύτηκε αυτόματα',
      );
    } catch {
      showSaveStatus('⚠ Αποτυχία αποθήκευσης — χρησιμοποιήστε Αποθήκευση ως JSON');
    }
  }, 1800);
}

let _toastEl: HTMLElement | null = null;

function getToastContainer(): HTMLElement {
  if (!_toastEl) {
    _toastEl = document.createElement('div');
    _toastEl.className = 'nb-toast-container';
    document.body.appendChild(_toastEl);
  }
  return _toastEl;
}

function showSaveStatus(msg: string): void {
  const container = getToastContainer();
  const toast = document.createElement('div');

  const variant = msg.startsWith('⚠') ? 'warning'
    : msg.startsWith('↩') || msg.startsWith('↪') ? 'action'
    : 'info';

  toast.className = `nb-toast nb-toast--${variant}`;
  toast.textContent = msg;
  container.appendChild(toast);

  requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('nb-toast--show')));

  setTimeout(() => {
    toast.classList.remove('nb-toast--show');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  }, 4000);
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

    const wrapper = insertBlock(tpl.render(block.data), instance, container, 'end', { noScroll: true, noRenumber: true, noHistory: true });

    for (const [key, childBlocks] of Object.entries(block.zones)) {
      const zone = wrapper.querySelector<HTMLElement>(`.nb-container-zone[data-container-for="${key}"]`);
      if (zone && childBlocks.length > 0) deserializeBlocks(childBlocks, zone);
    }
  }
}

function loadFromSaveFile(saveFile: SaveFile): void {
  clearDocument();
  clearHistory();
  deserializeBlocks(saveFile.blocks, paper);
  renumberDocument(paper, instances);
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

async function exportFekHtmlFile(): Promise<void> {
  const meta = loadFekMeta();
  const html = await exportFekHtml(paper, meta);
  downloadBlob(html, 'nomos-fek.html', 'text/html');
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
  const meta = loadFekMeta();
  const html = buildDocHtml(paper, hasFekMeta(meta) ? meta : null);
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

// ── ΦΕΚ metadata modal ───────────────────────────────────────────

const TEUCHOS_OPTIONS = ['Α΄', 'Β΄', 'Γ΄', 'Δ΄', 'ΑΑΠ', 'ΑΑΝ', 'ΥΟΔ΄', 'Δ.Δ.Σ.'];

function greekDateToIso(gdate: string): string {
  const m = gdate.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!m) return '';
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

function isoToGreekDate(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return '';
  return `${parseInt(m[3])}.${parseInt(m[2])}.${m[1]}`;
}

function readModalMeta(modal: HTMLDialogElement): FekMeta {
  const rawDate = (modal.querySelector<HTMLInputElement>('[name="hmeromhnia"]')?.value ?? '').trim();
  return {
    teuchos:    (modal.querySelector<HTMLSelectElement>('[name="teuchos"]')?.value ?? '').trim(),
    arithmos:   (modal.querySelector<HTMLInputElement>('[name="arithmos"]')?.value ?? '').trim(),
    hmeromhnia: rawDate ? isoToGreekDate(rawDate) || rawDate : '',
    titlos:     (modal.querySelector<HTMLInputElement>('[name="titlos"]')?.value ?? '').trim(),
    twoColumn:  (modal.querySelector<HTMLInputElement>('[name="twoColumn"]')?.checked ?? false),
  };
}

function updateFekPreview(modal: HTMLDialogElement): void {
  const preview = modal.querySelector<HTMLElement>('#nb-fek-live-preview');
  if (!preview) return;
  const meta = readModalMeta(modal);
  if (!hasFekMeta(meta)) {
    preview.innerHTML = '<span class="nb-fek-preview-empty">Συμπληρώστε τα παραπάνω πεδία για προεπισκόπηση</span>';
    return;
  }
  preview.innerHTML = buildFekHeaderHtml(meta, '/Coat_of_arms_of_Greece.svg');
}

function initFekMetaModal(): void {
  const btn = document.getElementById('nb-fek-meta-btn');
  if (!btn) return;

  let modal: HTMLDialogElement | null = null;

  btn.addEventListener('click', () => {
    if (!modal) {
      modal = document.createElement('dialog');
      modal.id = 'nb-fek-meta-modal';
      modal.className = 'modal';
      document.body.appendChild(modal);
    }

    const meta = loadFekMeta();
    modal.innerHTML = `
      <div class="modal-box w-11/12 max-w-2xl font-sans">
        <form method="dialog">
          <button class="btn btn-sm btn-circle btn-ghost absolute right-3 top-3">✕</button>
        </form>
        <h3 class="font-bold text-base mb-4">Στοιχεία ΦΕΚ</h3>

        <!-- Ταυτότητα ΦΕΚ: τρία πεδία σε σειρά -->
        <div class="grid grid-cols-3 gap-3 mb-3">
          <div class="form-control">
            <label class="label pb-1"><span class="label-text text-xs font-semibold uppercase tracking-wide text-base-content/50">Τεύχος</span></label>
            <select class="select select-bordered select-sm w-full" name="teuchos">
              <option value="">—</option>
              ${TEUCHOS_OPTIONS.map(t => `<option value="${t}" ${meta.teuchos === t ? 'selected' : ''}>${t}</option>`).join('')}
            </select>
          </div>
          <div class="form-control">
            <label class="label pb-1"><span class="label-text text-xs font-semibold uppercase tracking-wide text-base-content/50">Αρ. Φύλλου</span></label>
            <input type="number" min="1" step="1" class="input input-bordered input-sm w-full" name="arithmos"
              value="${meta.arithmos}" placeholder="π.χ. 1234">
          </div>
          <div class="form-control">
            <label class="label pb-1"><span class="label-text text-xs font-semibold uppercase tracking-wide text-base-content/50">Ημερομηνία</span></label>
            <input type="date" class="input input-bordered input-sm w-full" name="hmeromhnia"
              value="${greekDateToIso(meta.hmeromhnia)}">
          </div>
        </div>

        <!-- Τίτλος σε ξεχωριστή σειρά -->
        <div class="form-control mb-3">
          <label class="label pb-1"><span class="label-text text-xs font-semibold uppercase tracking-wide text-base-content/50">Τίτλος νόμου / πράξης</span></label>
          <input type="text" class="input input-bordered input-sm w-full" name="titlos"
            value="${meta.titlos}" placeholder="π.χ. ΝΟΜΟΣ ΥΠ' ΑΡΙΘΜ. 5123 — Τίτλος νόμου">
        </div>

        <!-- Δίστηλη διάταξη -->
        <div class="form-control mb-5">
          <label class="label cursor-pointer justify-start gap-3 pb-1">
            <input type="checkbox" name="twoColumn" class="checkbox checkbox-sm" ${meta.twoColumn ? 'checked' : ''}>
            <span class="label-text text-xs font-semibold uppercase tracking-wide text-base-content/50">Δίστηλη διάταξη (two-column)</span>
          </label>
        </div>

        <!-- Live προεπισκόπηση -->
        <div class="nb-fek-preview-wrap">
          <div class="nb-fek-preview-label">Προεπισκόπηση επικεφαλίδας</div>
          <div id="nb-fek-live-preview" class="nb-fek-preview-body">
            <span class="nb-fek-preview-empty">Συμπληρώστε τα παραπάνω πεδία για προεπισκόπηση</span>
          </div>
        </div>

        <div class="modal-action mt-4">
          <form method="dialog"><button class="btn btn-ghost btn-sm">Άκυρο</button></form>
          <button type="button" id="nb-fek-meta-clear" class="btn btn-ghost btn-sm text-error">Εκκαθάριση</button>
          <button type="button" id="nb-fek-meta-save" class="btn btn-primary btn-sm">Αποθήκευση</button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button>close</button></form>
    `;

    // Live preview on any field change
    modal.querySelectorAll<HTMLElement>('[name]').forEach(el => {
      el.addEventListener('input', () => updateFekPreview(modal!));
      el.addEventListener('change', () => updateFekPreview(modal!));
    });
    updateFekPreview(modal);

    modal.querySelector('#nb-fek-meta-save')?.addEventListener('click', () => {
      saveFekMeta(readModalMeta(modal!));
      modal!.close();
      showSaveStatus('Στοιχεία ΦΕΚ αποθηκεύτηκαν');
    });

    modal.querySelector('#nb-fek-meta-clear')?.addEventListener('click', () => {
      saveFekMeta({ teuchos: '', arithmos: '', hmeromhnia: '', titlos: '', twoColumn: false });
      modal!.close();
      showSaveStatus('Στοιχεία ΦΕΚ διαγράφηκαν');
    });

    modal.showModal();
  });
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
        case 'save-json':       saveAsJson(); break;
        case 'export-html':     exportHtmlFile(); break;
        case 'export-fek-html': exportFekHtmlFile(); break;
        case 'export-latex':    exportLatexFile(); break;
        case 'export-txt':      exportTxtFile(); break;
        case 'export-pdf':      printDocument(); break;
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

// ── Named save slots ──────────────────────────────────────────────

function initSlotsModal(): void {
  const btn = document.getElementById('nb-slots-btn');
  if (!btn) return;
  let modal: HTMLDialogElement | null = null;

  function renderSlotList(modal: HTMLDialogElement): void {
    const list = modal.querySelector<HTMLElement>('#nb-slots-list');
    if (!list) return;
    const slots = listSlots();
    if (slots.length === 0) {
      list.innerHTML = '<p class="text-sm text-base-content/50 text-center py-3">Δεν υπάρχουν αποθηκευμένες συνεδρίες.</p>';
      return;
    }
    list.innerHTML = slots.map(name => `
      <div class="nb-slot-row" data-slot="${name}">
        <div class="nb-slot-info">
          <span class="nb-slot-name">${name}</span>
          <span class="nb-slot-time">${slotTimestamp(name)}</span>
        </div>
        <div class="nb-slot-actions">
          <button type="button" class="btn btn-xs btn-ghost" data-slot-load="${name}">Φόρτωση</button>
          <button type="button" class="btn btn-xs btn-ghost text-error" data-slot-delete="${name}">✕</button>
        </div>
      </div>`).join('');

    list.querySelectorAll<HTMLButtonElement>('[data-slot-load]').forEach(b => {
      b.addEventListener('click', () => {
        const sf = loadSlot(b.dataset.slotLoad!);
        if (!sf || !isSaveFile(sf)) return;
        loadFromSaveFile(sf);
        modal.close();
        showSaveStatus(`Φορτώθηκε: ${b.dataset.slotLoad}`);
      });
    });
    list.querySelectorAll<HTMLButtonElement>('[data-slot-delete]').forEach(b => {
      b.addEventListener('click', () => {
        deleteSlot(b.dataset.slotDelete!);
        renderSlotList(modal);
      });
    });
  }

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
        <h3 class="font-bold text-base mb-4">Αποθηκευμένες Συνεδρίες</h3>
        <div class="flex gap-2 mb-4">
          <input type="text" id="nb-slot-name-input" class="input input-bordered input-sm flex-1"
            placeholder="Όνομα αποθήκευσης…" maxlength="60">
          <button type="button" id="nb-slot-save-btn" class="btn btn-primary btn-sm">Αποθήκευση</button>
        </div>
        <div id="nb-slots-list" class="flex flex-col gap-1 max-h-64 overflow-y-auto"></div>
        <div class="modal-action mt-4">
          <form method="dialog"><button class="btn btn-ghost btn-sm">Κλείσιμο</button></form>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button>close</button></form>`;

    renderSlotList(modal);

    modal.querySelector('#nb-slot-save-btn')?.addEventListener('click', () => {
      const inp = modal!.querySelector<HTMLInputElement>('#nb-slot-name-input');
      const name = inp?.value.trim();
      if (!name) { inp?.focus(); return; }
      saveSlot(name, serializeDocument(paper, instances));
      if (inp) inp.value = '';
      renderSlotList(modal!);
      showSaveStatus(`Αποθηκεύτηκε: ${name}`);
    });

    modal.querySelector<HTMLInputElement>('#nb-slot-name-input')
      ?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') modal!.querySelector<HTMLButtonElement>('#nb-slot-save-btn')?.click();
      });

    modal.showModal();
  });
}

// ── Settings modal ────────────────────────────────────────────────

const SETTINGS_KEY = 'nb_settings_v1';

interface AppSettings {
  theme: 'light' | 'dark';
  fontFamily: 'serif' | 'sans';
  paperWidth: 'narrow' | 'normal';
}

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { theme: 'light', fontFamily: 'serif', paperWidth: 'normal', ...JSON.parse(raw) };
  } catch {}
  return { theme: 'light', fontFamily: 'serif', paperWidth: 'normal' };
}

function saveSettings(s: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

function applySettings(s: AppSettings): void {
  document.documentElement.setAttribute('data-theme', s.theme === 'dark' ? 'dark' : 'light');
  paper.style.fontFamily = s.fontFamily === 'sans'
    ? "system-ui, -apple-system, sans-serif"
    : "";
  if (s.paperWidth === 'narrow') {
    paper.style.maxWidth = '680px';
  } else {
    paper.style.maxWidth = '';
  }
}

function initSettingsModal(): void {
  const btn = document.getElementById('nb-settings-btn');
  if (!btn) return;
  let modal: HTMLDialogElement | null = null;

  // Apply saved settings on load
  applySettings(loadSettings());

  btn.addEventListener('click', () => {
    if (!modal) {
      modal = document.createElement('dialog');
      modal.className = 'modal';
      document.body.appendChild(modal);
    }

    const s = loadSettings();
    modal.innerHTML = `
      <div class="modal-box w-11/12 max-w-sm font-sans">
        <form method="dialog">
          <button class="btn btn-sm btn-circle btn-ghost absolute right-3 top-3">✕</button>
        </form>
        <h3 class="font-bold text-base mb-5">Ρυθμίσεις</h3>

        <div class="space-y-4">
          <div class="form-control">
            <label class="label pb-1"><span class="label-text font-medium text-sm">Θέμα εμφάνισης</span></label>
            <select name="theme" class="select select-bordered select-sm w-full">
              <option value="light" ${s.theme === 'light' ? 'selected' : ''}>Φωτεινό (Light)</option>
              <option value="dark"  ${s.theme === 'dark'  ? 'selected' : ''}>Σκοτεινό (Dark)</option>
            </select>
          </div>

          <div class="form-control">
            <label class="label pb-1"><span class="label-text font-medium text-sm">Γραμματοσειρά εγγράφου</span></label>
            <select name="fontFamily" class="select select-bordered select-sm w-full">
              <option value="serif" ${s.fontFamily === 'serif' ? 'selected' : ''}>Serif (Noto Serif — προεπιλογή)</option>
              <option value="sans"  ${s.fontFamily === 'sans'  ? 'selected' : ''}>Sans-serif (Συστήματος)</option>
            </select>
          </div>

          <div class="form-control">
            <label class="label pb-1"><span class="label-text font-medium text-sm">Πλάτος σελίδας</span></label>
            <select name="paperWidth" class="select select-bordered select-sm w-full">
              <option value="normal" ${s.paperWidth === 'normal' ? 'selected' : ''}>Κανονικό (A4)</option>
              <option value="narrow" ${s.paperWidth === 'narrow' ? 'selected' : ''}>Στενό</option>
            </select>
          </div>
        </div>

        <div class="modal-action mt-6">
          <form method="dialog"><button class="btn btn-ghost btn-sm">Άκυρο</button></form>
          <button type="button" id="nb-settings-save" class="btn btn-primary btn-sm">Εφαρμογή</button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button>close</button></form>
    `;

    modal.querySelector('#nb-settings-save')?.addEventListener('click', () => {
      const newSettings: AppSettings = {
        theme: (modal!.querySelector<HTMLSelectElement>('[name="theme"]')?.value ?? 'light') as AppSettings['theme'],
        fontFamily: (modal!.querySelector<HTMLSelectElement>('[name="fontFamily"]')?.value ?? 'serif') as AppSettings['fontFamily'],
        paperWidth: (modal!.querySelector<HTMLSelectElement>('[name="paperWidth"]')?.value ?? 'normal') as AppSettings['paperWidth'],
      };
      saveSettings(newSettings);
      applySettings(newSettings);
      modal!.close();
      showSaveStatus('Ρυθμίσεις αποθηκεύτηκαν');
    });

    modal.showModal();
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

// ── Init ──────────────────────────────────────────────────────────

initFileMenu();
initRestoreBanner();
initFekMetaModal();
initSlotsModal();
initSettingsModal();
applyModes(['edit']);
