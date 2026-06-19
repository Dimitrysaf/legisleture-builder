import { getAllTemplates } from '../templates/registry';
import type { Template } from '../templates/types';
import { icon, refreshIcons } from '../utils/icons';
import { canInsertInContainer } from '../utils/nesting';

type OnSelectFn = (template: Template) => void;

const CATEGORIES = [
  { id: 'structure', label: 'Δομή' },
  { id: 'content',   label: 'Περιεχόμενο' },
  { id: 'reference', label: 'Παραπομπές' },
  { id: 'custom',    label: 'Custom' },
] as const;

let _picker: HTMLDialogElement | null = null;

export function openTemplatePicker(onSelect: OnSelectFn, container?: HTMLElement): void {
  if (!_picker) {
    _picker = document.createElement('dialog');
    _picker.id = 'nb-template-picker';
    _picker.className = 'modal';
    document.body.appendChild(_picker);
  }

  const allTemplates = getAllTemplates();
  const all = container
    ? allTemplates.filter(t => canInsertInContainer(t.id, container))
    : allTemplates;

  _picker.innerHTML = `
    <div class="modal-box w-11/12 max-w-lg font-sans">
      <form method="dialog">
        <button class="btn btn-sm btn-circle btn-ghost absolute right-3 top-3">${icon('x', 'w-4 h-4')}</button>
      </form>
      <h3 class="font-bold text-base mb-1">Εισαγωγή template</h3>
      <p class="text-xs text-base-content/50 mb-4">Επίλεξε τι θέλεις να προσθέσεις σε αυτή την ενότητα</p>
      <div class="space-y-4" id="nb-picker-list"></div>
    </div>
    <form method="dialog" class="modal-backdrop"><button>close</button></form>
  `;

  const list = _picker.querySelector('#nb-picker-list')!;

  for (const cat of CATEGORIES) {
    const templates = all.filter(t => t.category === cat.id);
    if (templates.length === 0) continue;

    const section = document.createElement('div');
    section.innerHTML = `
      <div class="text-[10px] font-bold uppercase tracking-widest text-base-content/40 mb-1.5">${cat.label}</div>
      <div class="grid grid-cols-3 gap-2" id="nb-pick-cat-${cat.id}"></div>
    `;

    const grid = section.querySelector(`#nb-pick-cat-${cat.id}`)!;
    for (const t of templates) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = [
        'flex flex-col items-center gap-1 p-3 rounded-lg',
        'border border-base-300 bg-base-100',
        'hover:border-primary hover:bg-primary hover:text-primary-content',
        'active:scale-95 transition-all duration-100 cursor-pointer',
      ].join(' ');
      btn.title = t.description ?? t.name;
      btn.innerHTML = `
        <span class="pointer-events-none">${icon(t.icon, 'w-5 h-5')}</span>
        <span class="text-xs font-medium leading-tight text-center pointer-events-none">${t.name}</span>
        ${t.isCustom ? '<span class="badge badge-xs badge-secondary pointer-events-none">custom</span>' : ''}
      `;
      btn.addEventListener('click', () => {
        _picker!.close();
        onSelect(t);
      });
      grid.appendChild(btn);
    }
    list.appendChild(section);
  }

  _picker.showModal();
  refreshIcons();
}
