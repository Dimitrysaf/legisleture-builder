import { loadCustomTemplates, getTemplate } from '../templates/registry';
import type { Template, TemplateInstance } from '../templates/types';
import { initToolbar, refreshToolbar } from '../components/Toolbar';
import { openTemplateModal } from '../components/TemplateModal';
import { openCustomTemplateModal } from '../components/CustomTemplateModal';

// ── Bootstrap ─────────────────────────────────────────────────────

loadCustomTemplates();

const paper = document.getElementById('nb-paper') as HTMLElement;
const toolbarEl = document.getElementById('nb-toolbar') as HTMLElement;

initToolbar(
  toolbarEl,
  (tpl: Template) => openInsertModal(tpl),
  () => openCustomTemplateModal(null, () => refreshToolbar(openInsertModal))
);

// ── Block instances ───────────────────────────────────────────────

const instances = new Map<string, TemplateInstance>();

function openInsertModal(tpl: Template): void {
  openTemplateModal(tpl, null, (html, instance) => {
    insertBlock(html, instance);
  });
}

function insertBlock(html: string, instance: TemplateInstance): void {
  const wrapper = document.createElement('div');
  wrapper.className = 'nb-block-wrapper';
  wrapper.dataset.instanceId = instance.id;
  wrapper.innerHTML = html;
  attachActions(wrapper, instance.id);
  instances.set(instance.id, instance);
  paper.appendChild(wrapper);
  wrapper.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function updateBlock(instanceId: string, html: string, newInstance: TemplateInstance): void {
  const wrapper = document.querySelector<HTMLElement>(`[data-instance-id="${instanceId}"]`);
  if (!wrapper) return;
  const actions = wrapper.querySelector<HTMLElement>('.nb-block-actions');
  wrapper.innerHTML = html;
  if (actions) wrapper.appendChild(actions);
  instances.set(instanceId, { ...newInstance, id: instanceId });
}

function attachActions(wrapper: HTMLElement, instanceId: string): void {
  const actions = document.createElement('div');
  actions.className = 'nb-block-actions';
  actions.innerHTML = `
    <button type="button" class="nb-action-btn nb-action-btn--edit" title="Επεξεργασία">✏️</button>
    <button type="button" class="nb-action-btn nb-action-btn--delete" title="Διαγραφή">🗑</button>
  `;

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
  });

  // Keep actions visible when mouse moves between wrapper and action buttons
  let hideTimer: ReturnType<typeof setTimeout> | null = null;
  const show = () => {
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
    actions.style.opacity = '1';
  };
  const hide = () => {
    hideTimer = setTimeout(() => { actions.style.opacity = '0'; }, 80);
  };
  wrapper.addEventListener('mouseenter', show);
  wrapper.addEventListener('mouseleave', hide);
  actions.addEventListener('mouseenter', show);
  actions.addEventListener('mouseleave', hide);

  wrapper.appendChild(actions);
}
