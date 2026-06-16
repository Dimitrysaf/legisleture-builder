import type { Template, TemplateField, TemplateCategory, FieldType } from '../templates/types';
import { saveCustomTemplate, deleteCustomTemplate } from '../templates/registry';

type OnSaveFn = (template: Template) => void;

let _modal: HTMLDialogElement | null = null;

interface DraftField {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
}

let _fields: DraftField[] = [];
let _editing: Template | null = null;
let _onSave: OnSaveFn | null = null;

export function openCustomTemplateModal(existing: Template | null, onSave?: OnSaveFn): void {
  _editing = existing;
  _onSave = onSave ?? null;
  _fields = existing
    ? existing.fields.map(f => ({ id: f.id, label: f.label, type: f.type, required: f.required ?? false }))
    : [];

  if (!_modal) {
    _modal = document.createElement('dialog');
    _modal.id = 'nb-ctm-modal';
    _modal.className = 'modal';
    document.body.appendChild(_modal);
  }

  render();
  _modal.showModal();
}

function render(): void {
  if (!_modal) return;

  const e = _editing;
  const storedStr = e ? getStoredTemplateStr(e.id) : '';

  _modal.innerHTML = `
    <div class="modal-box w-11/12 max-w-3xl font-sans overflow-y-auto max-h-[90vh]">
      <form method="dialog">
        <button class="btn btn-sm btn-circle btn-ghost absolute right-3 top-3">✕</button>
      </form>

      <h3 class="font-bold text-lg mb-5">${e ? 'Επεξεργασία' : 'Δημιουργία'} Custom Template</h3>

      <!-- Basic info -->
      <div class="grid grid-cols-[56px_1fr] gap-3 mb-4">
        <div class="form-control">
          <label class="label pb-1"><span class="label-text font-medium text-sm">Εικονίδιο</span></label>
          <input id="nb-ctm-icon" type="text" maxlength="4"
            class="input input-bordered text-center text-xl w-full"
            value="${e?.icon ?? '📄'}" placeholder="📄" />
        </div>
        <div class="form-control">
          <label class="label pb-1"><span class="label-text font-medium text-sm">Όνομα template <span class="text-error">*</span></span></label>
          <input id="nb-ctm-name" type="text" class="input input-bordered w-full"
            value="${escHtml(e?.name ?? '')}" placeholder="Π.χ. Ορισμός" />
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3 mb-4">
        <div class="form-control">
          <label class="label pb-1"><span class="label-text font-medium text-sm">Κατηγορία</span></label>
          <select id="nb-ctm-category" class="select select-bordered w-full">
            ${categoryOptions(e?.category ?? 'custom')}
          </select>
        </div>
        <div class="form-control">
          <label class="label pb-1"><span class="label-text font-medium text-sm">Περιγραφή (προαιρετικό)</span></label>
          <input id="nb-ctm-desc" type="text" class="input input-bordered w-full"
            value="${escHtml(e?.description ?? '')}" placeholder="Σύντομη περιγραφή..." />
        </div>
      </div>

      <!-- Fields -->
      <div class="divider text-xs font-semibold text-base-content/50 uppercase tracking-widest">Πεδία</div>
      <div id="nb-ctm-fields" class="space-y-2 mb-3">
        ${_fields.map((f, i) => renderFieldRow(f, i)).join('')}
      </div>
      <button type="button" id="nb-ctm-add-field"
        class="btn btn-outline btn-xs gap-1 mb-5">
        <span>+</span> Προσθήκη πεδίου
      </button>

      <!-- Template string -->
      <div class="divider text-xs font-semibold text-base-content/50 uppercase tracking-widest">HTML Template</div>
      <div class="mb-1">
        <p class="text-xs text-base-content/60 mb-1">
          Χρησιμοποίησε <code class="bg-base-200 px-1 rounded text-xs font-mono">{{field_id}}</code> για να εισάγεις τιμές πεδίων.
        </p>
        <div id="nb-ctm-placeholders" class="flex flex-wrap gap-1 mb-2">
          ${_fields.map(f => `<code class="badge badge-outline badge-sm font-mono text-xs">{{${f.id}}}</code>`).join('')}
        </div>
      </div>
      <textarea id="nb-ctm-template-str" rows="5"
        class="textarea textarea-bordered w-full font-mono text-xs leading-relaxed mb-2"
        placeholder="<p>{{content}}</p>"
      >${escHtml(storedStr)}</textarea>

      <!-- Preview -->
      <button type="button" id="nb-ctm-preview-btn" class="btn btn-ghost btn-xs gap-1 mb-1">
        👁 Προεπισκόπηση
      </button>
      <div id="nb-ctm-preview" class="hidden border border-dashed border-base-300 rounded-lg p-3 text-sm font-serif bg-white mb-4"></div>

      <!-- Delete (only when editing) -->
      ${e?.isCustom ? `
        <div class="divider"></div>
        <button type="button" id="nb-ctm-delete" class="btn btn-error btn-outline btn-sm gap-1">
          🗑 Διαγραφή template
        </button>
      ` : ''}

      <div class="modal-action mt-4">
        <form method="dialog"><button class="btn btn-ghost">Άκυρο</button></form>
        <button type="button" id="nb-ctm-save" class="btn btn-primary">
          ${e ? 'Αποθήκευση' : 'Δημιουργία'}
        </button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop"><button>close</button></form>
  `;

  bindEvents();
}

function renderFieldRow(f: DraftField, i: number): string {
  return `
    <div class="flex gap-2 items-end" data-field-row="${i}">
      <div class="form-control flex-1">
        ${i === 0 ? '<label class="label pb-1"><span class="label-text text-xs">Label</span></label>' : ''}
        <input type="text" class="input input-bordered input-sm w-full"
          data-field-label="${i}" value="${escHtml(f.label)}" placeholder="Π.χ. Κείμενο" />
      </div>
      <div class="form-control w-32">
        ${i === 0 ? '<label class="label pb-1"><span class="label-text text-xs">Τύπος</span></label>' : ''}
        <select class="select select-bordered select-sm" data-field-type="${i}">
          ${typeOptions(f.type)}
        </select>
      </div>
      <div class="form-control flex-shrink-0 self-${i === 0 ? 'end' : 'start'} pb-0.5">
        ${i === 0 ? '<div class="label pb-1"><span class="label-text text-xs">Υποχρ.</span></div>' : ''}
        <input type="checkbox" class="checkbox checkbox-sm" data-field-req="${i}" ${f.required ? 'checked' : ''} />
      </div>
      <div class="flex-shrink-0 self-${i === 0 ? 'end' : 'start'} pb-0.5">
        <button type="button" class="btn btn-ghost btn-xs text-error" data-remove-field="${i}">✕</button>
      </div>
    </div>
  `;
}

function bindEvents(): void {
  if (!_modal) return;

  document.getElementById('nb-ctm-add-field')?.addEventListener('click', () => {
    syncFields();
    _fields.push({ id: '', label: '', type: 'text', required: false });
    render();
  });

  _modal.querySelectorAll('[data-remove-field]').forEach(btn => {
    (btn as HTMLButtonElement).addEventListener('click', () => {
      syncFields();
      const i = parseInt((btn as HTMLElement).dataset.removeField!);
      _fields.splice(i, 1);
      render();
    });
  });

  document.getElementById('nb-ctm-preview-btn')?.addEventListener('click', () => {
    syncFields();
    const templateStr = (document.getElementById('nb-ctm-template-str') as HTMLTextAreaElement).value;
    const preview = document.getElementById('nb-ctm-preview')!;
    let html = templateStr;
    for (const f of _fields) {
      html = html.replaceAll(`{{${f.id}}}`, `<mark class="bg-yellow-100">[${f.label || f.id}]</mark>`);
    }
    preview.innerHTML = html || '<span class="text-base-content/40">Κενό template</span>';
    preview.classList.remove('hidden');
  });

  document.getElementById('nb-ctm-save')?.addEventListener('click', () => {
    syncFields();
    if (!saveTemplate()) return;
  });

  document.getElementById('nb-ctm-delete')?.addEventListener('click', () => {
    if (!_editing) return;
    if (!confirm(`Διαγραφή template «${_editing.name}»; Αυτή η ενέργεια δεν αναιρείται.`)) return;
    deleteCustomTemplate(_editing.id);
    _modal?.close();
    _onSave?.(null as any);
  });

  // Sync field id from label on blur
  _modal.querySelectorAll<HTMLInputElement>('[data-field-label]').forEach(inp => {
    inp.addEventListener('blur', () => {
      const i = parseInt(inp.dataset.fieldLabel!);
      if (!_fields[i].id || _fields[i].id === slugify(_fields[i].label)) {
        _fields[i].label = inp.value;
        _fields[i].id = slugify(inp.value);
        updatePlaceholders();
      }
    });
  });
}

function syncFields(): void {
  if (!_modal) return;
  _modal.querySelectorAll<HTMLElement>('[data-field-row]').forEach((row, i) => {
    const label = row.querySelector<HTMLInputElement>(`[data-field-label="${i}"]`)?.value ?? '';
    const type = (row.querySelector<HTMLSelectElement>(`[data-field-type="${i}"]`)?.value ?? 'text') as FieldType;
    const required = row.querySelector<HTMLInputElement>(`[data-field-req="${i}"]`)?.checked ?? false;
    _fields[i] = { id: _fields[i]?.id || slugify(label), label, type, required };
  });
}

function updatePlaceholders(): void {
  const el = document.getElementById('nb-ctm-placeholders');
  if (el) {
    el.innerHTML = _fields.map(f => `<code class="badge badge-outline badge-sm font-mono text-xs">{{${f.id}}}</code>`).join('');
  }
}

function saveTemplate(): boolean {
  if (!_modal) return false;

  const name = (document.getElementById('nb-ctm-name') as HTMLInputElement).value.trim();
  const icon = (document.getElementById('nb-ctm-icon') as HTMLInputElement).value.trim() || '📄';
  const category = (document.getElementById('nb-ctm-category') as HTMLSelectElement).value as TemplateCategory;
  const description = (document.getElementById('nb-ctm-desc') as HTMLInputElement).value.trim();
  const templateStr = (document.getElementById('nb-ctm-template-str') as HTMLTextAreaElement).value;

  if (!name) {
    (document.getElementById('nb-ctm-name') as HTMLInputElement).focus();
    return false;
  }

  const fields: TemplateField[] = _fields.map(f => ({
    id: f.id || slugify(f.label),
    label: f.label,
    type: f.type,
    required: f.required,
  }));

  const id = _editing?.id ?? `custom_${slugify(name)}_${Date.now()}`;
  const template: Template = { id, name, icon, category, description, fields, render: () => '', isCustom: true };

  saveCustomTemplate(template, templateStr);
  _modal.close();
  _onSave?.(template);
  return true;
}

function getStoredTemplateStr(id: string): string {
  try {
    const stored = localStorage.getItem('nb_custom_templates');
    if (!stored) return '';
    const customs = JSON.parse(stored);
    return customs.find((c: any) => c.id === id)?.templateStr ?? '';
  } catch { return ''; }
}

function categoryOptions(selected: string): string {
  const cats = [
    ['structure', 'Δομή'],
    ['content', 'Περιεχόμενο'],
    ['reference', 'Παραπομπές'],
    ['custom', 'Custom'],
  ];
  return cats.map(([v, l]) => `<option value="${v}" ${v === selected ? 'selected' : ''}>${l}</option>`).join('');
}

function typeOptions(selected: string): string {
  const types: [FieldType, string][] = [
    ['text', 'Κείμενο'],
    ['textarea', 'Κείμενο (πολλές γραμμές)'],
    ['rich-text', 'Μορφοποιημένο κείμενο'],
    ['number', 'Αριθμός'],
  ];
  return types.map(([v, l]) => `<option value="${v}" ${v === selected ? 'selected' : ''}>${l}</option>`).join('');
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[άαΆΑ]/g, 'a').replace(/[έεΈΕ]/g, 'e').replace(/[ήηΉΗ]/g, 'i')
    .replace(/[ίιΊΙϊΪ]/g, 'i').replace(/[όοΌΟ]/g, 'o').replace(/[ύυΎΥϋΫ]/g, 'u')
    .replace(/[ώωΏΩ]/g, 'o')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    || 'field';
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
