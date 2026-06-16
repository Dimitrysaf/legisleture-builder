import { getAllTemplates } from '../templates/registry';
import type { Template } from '../templates/types';

const CATEGORIES = [
  { id: 'structure', label: 'Δομή' },
  { id: 'content',   label: 'Περιεχόμενο' },
  { id: 'reference', label: 'Παραπομπές' },
  { id: 'custom',    label: 'Custom' },
] as const;

type OnSelectFn = (template: Template) => void;
type OnNewTemplateFn = () => void;

export function initToolbar(
  container: HTMLElement,
  onSelect: OnSelectFn,
  onNewTemplate: OnNewTemplateFn
): void {
  container.innerHTML = `
    <div class="flex items-center justify-between px-4 py-3 border-b border-base-300">
      <span class="font-semibold text-sm tracking-wide text-base-content">Templates</span>
      <label for="nb-drawer-toggle" class="btn btn-ghost btn-xs btn-circle lg:hidden">✕</label>
    </div>
    <div class="px-3 py-2">
      <input
        id="nb-template-search"
        type="text"
        placeholder="Αναζήτηση..."
        class="input input-bordered input-sm w-full"
      />
    </div>
    <div class="flex-1 overflow-y-auto px-3 pb-3" id="nb-template-list"></div>
    <div class="p-3 border-t border-base-300">
      <button id="nb-new-template-btn" class="btn btn-outline btn-primary btn-sm w-full gap-1">
        <span class="text-base leading-none">+</span> Νέο Template
      </button>
    </div>
  `;

  renderList('', onSelect);

  document.getElementById('nb-template-search')?.addEventListener('input', (e) => {
    renderList((e.target as HTMLInputElement).value.toLowerCase().trim(), onSelect);
  });

  document.getElementById('nb-new-template-btn')?.addEventListener('click', onNewTemplate);
}

export function refreshToolbar(onSelect: OnSelectFn): void {
  const search = (document.getElementById('nb-template-search') as HTMLInputElement | null)?.value?.toLowerCase().trim() ?? '';
  renderList(search, onSelect);
}

function renderList(search: string, onSelect: OnSelectFn): void {
  const container = document.getElementById('nb-template-list');
  if (!container) return;
  container.innerHTML = '';

  const all = getAllTemplates();
  const filtered = search
    ? all.filter(t => t.name.toLowerCase().includes(search) || t.description?.toLowerCase().includes(search))
    : all;

  if (filtered.length === 0) {
    container.innerHTML = '<p class="text-xs text-base-content/50 text-center py-6">Δεν βρέθηκαν templates</p>';
    return;
  }

  for (const cat of CATEGORIES) {
    const templates = filtered.filter(t => t.category === cat.id);
    if (templates.length === 0) continue;

    const section = document.createElement('div');
    section.className = 'mb-4';
    section.innerHTML = `
      <div class="text-[10px] font-bold uppercase tracking-widest text-base-content/40 mb-1.5 px-0.5">
        ${cat.label}
      </div>
      <div class="grid grid-cols-2 gap-1.5" id="nb-cat-${cat.id}"></div>
    `;

    const grid = section.querySelector(`#nb-cat-${cat.id}`)!;
    for (const t of templates) {
      grid.appendChild(makeCard(t, onSelect));
    }
    container.appendChild(section);
  }
}

function makeCard(t: Template, onSelect: OnSelectFn): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = [
    'flex flex-col items-center justify-center gap-1',
    'rounded-lg border border-base-300 bg-base-100 px-2 py-3',
    'hover:border-primary hover:bg-primary hover:text-primary-content',
    'active:scale-95 transition-all duration-100 cursor-pointer',
    'group',
  ].join(' ');
  btn.title = t.description ?? t.name;
  btn.innerHTML = `
    <span class="text-2xl leading-none pointer-events-none">${t.icon}</span>
    <span class="text-[11px] font-medium leading-tight text-center pointer-events-none">${t.name}</span>
    ${t.isCustom ? '<span class="badge badge-xs badge-secondary pointer-events-none">custom</span>' : ''}
  `;
  btn.addEventListener('click', () => onSelect(t));
  return btn;
}
