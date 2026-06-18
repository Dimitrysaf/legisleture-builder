import { loadCustomTemplates, getTemplate } from '../templates/registry';
import type { Template, TemplateInstance } from '../templates/types';
import { initToolbar } from '../components/Toolbar';
import { openTemplateModal } from '../components/TemplateModal';
import { openTemplatePicker } from '../components/TemplatePicker';
import { icon, refreshIcons } from '../utils/icons';
import { countBlocksOfType, getSubParaDepth, toGreekSubNum, renumberDocument } from '../utils/numbering';
import { registerEntry, unregisterEntry } from '../utils/docRegistry';
import {
  serializeDocument, isSaveFile,
  type SaveFile, type SavedBlock,
} from '../utils/fileOps';
import { loadFekMeta } from '../utils/fekMeta';
import { newProject, type Project } from '../types/project';
import { pushSnapshot, undoPop, redoPop, pushRedo, pushUndoOnly, clearHistory } from '../utils/history';
import { state } from './state';
import { showSaveStatus } from './toast';
import { triggerAutoSave, markDocChanged } from './autosave';
import { generateTocBody } from './toc';
import { setupDrag, setupDropZone, type DropCallbacks } from './drag';

const NUMBERED_TEMPLATES = new Set(['part', 'chapter', 'section', 'article', 'paragraph']);

export function captureSnapshot(): string {
  return JSON.stringify(serializeDocument(state.paper, state.instances));
}

function applySnapshot(snap: string): void {
  const save = JSON.parse(snap) as SaveFile;
  clearDocument();
  deserializeBlocks(save.blocks, state.paper);
  renumberDocument(state.paper, state.instances);
}

export function undo(): void {
  const snap = undoPop();
  if (!snap) return;
  pushRedo(captureSnapshot());
  applySnapshot(snap);
  markDocChanged();
  showSaveStatus('↩ Αναίρεση');
}

export function redo(): void {
  const snap = redoPop();
  if (!snap) return;
  pushUndoOnly(captureSnapshot());
  applySnapshot(snap);
  markDocChanged();
  showSaveStatus('↪ Επανάληψη');
}

const dropCallbacks: DropCallbacks = {
  captureSnapshot,
  renumber: () => renumberDocument(state.paper, state.instances),
  autoSave: triggerAutoSave,
};

export function initContainerZone(zone: HTMLElement): void {
  if (zone.dataset.nbInit) return;
  zone.dataset.nbInit = '1';
  setupDropZone(zone, dropCallbacks);
}

export function openInsertModal(tpl: Template, targetContainer: HTMLElement, position: 'start' | 'end' = 'end'): void {
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

export function insertBlock(
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
  state.instances.set(instance.id, instance);
  registerEntry(instance.id, instance.templateId, instance.data);

  if (position === 'start') {
    target.insertBefore(wrapper, target.firstChild);
  } else {
    target.appendChild(wrapper);
  }

  if (!opts.noRenumber) renumberDocument(state.paper, state.instances);
  refreshIcons();
  if (!opts.noScroll) wrapper.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  triggerAutoSave();
  return wrapper;
}

export function updateBlock(instanceId: string, html: string, newInstance: TemplateInstance): void {
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
  state.instances.set(instanceId, updated);
  registerEntry(instanceId, updated.templateId, updated.data);
  refreshIcons();
  triggerAutoSave();
}

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

  const dragHandle = actions.querySelector<HTMLElement>('.nb-action-btn--drag')!;
  dragHandle.addEventListener('mousedown', () => {
    wrapper.draggable = true;
    const off = () => { wrapper.draggable = false; };
    document.addEventListener('mouseup', off, { once: true });
    wrapper.addEventListener('dragend', off, { once: true });
  });

  // Touch drag
  let touchDragActive = false;
  let touchLastY = 0;
  dragHandle.addEventListener('touchstart', (e) => {
    if (state.currentMode !== 'edit') return;
    e.preventDefault();
    touchDragActive = true;
    touchLastY = e.touches[0].clientY;
    wrapper.classList.add('nb-dragging');
  }, { passive: false });

  document.addEventListener('touchmove', (e) => {
    if (!touchDragActive) return;
    e.preventDefault();
    const y = e.touches[0].clientY;
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
    renumberDocument(state.paper, state.instances);
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
      renumberDocument(state.paper, state.instances);
      triggerAutoSave();
    }
  });

  actions.querySelector('.nb-action-btn--down')!.addEventListener('click', () => {
    const next = wrapper.nextElementSibling;
    if (next) {
      pushSnapshot(captureSnapshot());
      next.after(wrapper);
      renumberDocument(state.paper, state.instances);
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
    const inst = state.instances.get(instanceId);
    if (!inst) return;
    const tpl = getTemplate(inst.templateId);
    if (!tpl) return;
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
    state.instances.delete(instanceId);
    unregisterEntry(instanceId);
    renumberDocument(state.paper, state.instances);
    triggerAutoSave();
  });

  wrapper.appendChild(actions);
}

export function clearDocument(): void {
  Array.from(state.paper.children)
    .filter(el => (el as HTMLElement).classList.contains('nb-block-wrapper'))
    .forEach(el => {
      const id = (el as HTMLElement).dataset.instanceId;
      if (id) { state.instances.delete(id); unregisterEntry(id); }
      el.remove();
    });
}

export function deserializeBlocks(blocks: SavedBlock[], container: HTMLElement): void {
  for (const block of blocks) {
    const tpl = getTemplate(block.templateId);
    if (!tpl) continue;

    const instance: TemplateInstance = {
      id: block.id,
      templateId: block.templateId,
      data: block.data,
    };

    const wrapper = insertBlock(tpl.render(block.data), instance, container, 'end', {
      noScroll: true, noRenumber: true, noHistory: true,
    });

    for (const [key, childBlocks] of Object.entries(block.zones)) {
      const zone = wrapper.querySelector<HTMLElement>(`.nb-container-zone[data-container-for="${key}"]`);
      if (zone && childBlocks.length > 0) deserializeBlocks(childBlocks, zone);
    }
  }
}

export function loadFromProject(project: Project): void {
  clearDocument();
  clearHistory();
  state.currentProject = project;
  deserializeBlocks(project.blocks, state.paper);
  renumberDocument(state.paper, state.instances);
  refreshIcons();
}

export function loadFromSaveFile(saveFile: SaveFile): void {
  clearDocument();
  clearHistory();
  const project = newProject();
  if (saveFile.savedAt) {
    project.createdAt = saveFile.savedAt;
    project.modifiedAt = saveFile.savedAt;
  }
  project.fekMeta = loadFekMeta();
  state.currentProject = project;
  deserializeBlocks(saveFile.blocks, state.paper);
  renumberDocument(state.paper, state.instances);
  refreshIcons();
}

export function insertPageBreak(position: 'start' | 'end'): void {
  const tpl = getTemplate('pagebreak');
  if (!tpl) return;
  const instance: TemplateInstance = {
    id: `inst_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    templateId: 'pagebreak',
    data: {},
  };
  insertBlock(tpl.render({}), instance, state.paper, position);
}

export { loadCustomTemplates };

export function initToolbarAndPaper(
  toolbarEl: HTMLElement,
  paperEl: HTMLElement,
): void {
  state.paper = paperEl;
  loadCustomTemplates();
  initToolbar(toolbarEl, (tpl: Template) => openInsertModal(tpl, state.paper));
  setupDropZone(state.paper, dropCallbacks);
}
