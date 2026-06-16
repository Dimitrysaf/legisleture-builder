import { loadCustomTemplates, getTemplate } from '../templates/registry';
import type { Template, TemplateInstance } from '../templates/types';
import { initToolbar, refreshToolbar } from '../components/Toolbar';
import { openTemplateModal } from '../components/TemplateModal';
import { openCustomTemplateModal } from '../components/CustomTemplateModal';
import { openTemplatePicker } from '../components/TemplatePicker';
import { icon, refreshIcons } from '../utils/icons';
import { countBlocksOfType } from '../utils/numbering';
import { registerEntry, unregisterEntry } from '../utils/docRegistry';

const NUMBERED_TEMPLATES = new Set(['part', 'chapter', 'section', 'article', 'paragraph']);

// ── Bootstrap ─────────────────────────────────────────────────────

loadCustomTemplates();

const paper = document.getElementById('nb-paper') as HTMLElement;
const toolbarEl = document.getElementById('nb-toolbar') as HTMLElement;

initToolbar(
  toolbarEl,
  (tpl: Template) => openInsertModal(tpl, paper),
  () => openCustomTemplateModal(null, () => refreshToolbar((tpl) => openInsertModal(tpl, paper)))
);

// ── Block instances ───────────────────────────────────────────────

const instances = new Map<string, TemplateInstance>();

function openInsertModal(tpl: Template, targetContainer: HTMLElement): void {
  const nextN = NUMBERED_TEMPLATES.has(tpl.id)
    ? countBlocksOfType(tpl.id, targetContainer) + 1
    : undefined;
  openTemplateModal(tpl, null, (html, instance) => {
    insertBlock(html, instance, targetContainer);
  }, { nextN });
}

function insertBlock(html: string, instance: TemplateInstance, target: HTMLElement): void {
  const wrapper = document.createElement('div');
  wrapper.className = 'nb-block-wrapper';
  wrapper.dataset.instanceId = instance.id;
  wrapper.innerHTML = html;

  // Initialize any container zones within the new block
  wrapper.querySelectorAll<HTMLElement>('.nb-container-zone').forEach(zone => {
    initContainerZone(zone);
  });

  attachActions(wrapper, instance.id, target);
  instances.set(instance.id, instance);
  registerEntry(instance.id, instance.templateId, instance.data);
  target.appendChild(wrapper);
  refreshIcons();
  wrapper.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function updateBlock(instanceId: string, html: string, newInstance: TemplateInstance): void {
  const wrapper = document.querySelector<HTMLElement>(`[data-instance-id="${instanceId}"]`);
  if (!wrapper) return;

  // Preserve children of each container zone before re-render
  const savedChildren = new Map<string, Node[]>();
  wrapper.querySelectorAll<HTMLElement>('.nb-container-zone').forEach(zone => {
    const key = zone.dataset.containerFor!;
    savedChildren.set(key, Array.from(zone.childNodes));
  });

  const actions = wrapper.querySelector<HTMLElement>('.nb-block-actions');
  wrapper.innerHTML = html;
  if (actions) wrapper.appendChild(actions);

  // Restore children and re-init zones
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
}

// ── Container zones ───────────────────────────────────────────────

function initContainerZone(zone: HTMLElement): void {
  if (zone.dataset.nbInit) return;
  zone.dataset.nbInit = '1';
}

// ── Block actions ─────────────────────────────────────────────────

function attachActions(wrapper: HTMLElement, instanceId: string, _target: HTMLElement): void {
  const hasContainers = wrapper.querySelector('.nb-container-zone') !== null;

  const actions = document.createElement('div');
  actions.className = 'nb-block-actions';
  actions.innerHTML = `
    <button type="button" class="nb-action-btn nb-action-btn--up" title="Μετακίνηση πάνω">${icon('arrow-up', 'w-3.5 h-3.5')}</button>
    <button type="button" class="nb-action-btn nb-action-btn--down" title="Μετακίνηση κάτω">${icon('arrow-down', 'w-3.5 h-3.5')}</button>
    ${hasContainers ? `<button type="button" class="nb-action-btn nb-action-btn--add" title="Εισαγωγή μέσα">${icon('plus', 'w-3.5 h-3.5')}</button>` : ''}
    <button type="button" class="nb-action-btn nb-action-btn--edit" title="Επεξεργασία">${icon('pencil', 'w-3.5 h-3.5')}</button>
    <button type="button" class="nb-action-btn nb-action-btn--delete" title="Διαγραφή">${icon('trash-2', 'w-3.5 h-3.5')}</button>
  `;

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
  });

  wrapper.appendChild(actions);
}
