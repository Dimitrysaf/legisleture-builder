import type { Template, TemplateField, TemplateInstance } from '../templates/types';

type OnConfirmFn = (html: string, instance: TemplateInstance) => void;

let _modal: HTMLDialogElement | null = null;

export function openTemplateModal(
  template: Template,
  existing: TemplateInstance | null = null,
  onConfirm?: OnConfirmFn
): void {
  if (!_modal) {
    _modal = document.createElement('dialog');
    _modal.id = 'nb-template-modal';
    _modal.className = 'modal';
    document.body.appendChild(_modal);
  }

  _modal.innerHTML = `
    <div class="modal-box w-11/12 max-w-2xl font-sans">
      <form method="dialog">
        <button class="btn btn-sm btn-circle btn-ghost absolute right-3 top-3">✕</button>
      </form>

      <div class="flex items-center gap-3 mb-5">
        <span class="text-4xl leading-none">${template.icon}</span>
        <div>
          <h3 class="font-bold text-lg leading-tight">
            ${existing ? 'Επεξεργασία' : 'Εισαγωγή'}: ${template.name}
          </h3>
          ${template.description
            ? `<p class="text-sm text-base-content/60 mt-0.5">${template.description}</p>`
            : ''}
        </div>
      </div>

      <div id="nb-tm-fields" class="space-y-4">
        ${template.fields.map(f => renderField(f, existing?.data[f.id] ?? f.defaultValue ?? '')).join('')}
      </div>

      <div class="modal-action mt-6">
        <form method="dialog"><button class="btn btn-ghost">Άκυρο</button></form>
        <button id="nb-tm-confirm" type="button" class="btn btn-primary">
          ${existing ? 'Αποθήκευση' : 'Εισαγωγή'}
        </button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop"><button>close</button></form>
  `;

  _modal.querySelectorAll<HTMLElement>('[data-rich]').forEach(initRichEditor);

  document.getElementById('nb-tm-confirm')!.addEventListener('click', () => {
    const data = collectData(_modal!);
    if (!validateData(data, template, _modal!)) return;
    const instance: TemplateInstance = {
      id: existing?.id ?? `inst_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      templateId: template.id,
      data,
    };
    _modal!.close();
    onConfirm?.(template.render(data), instance);
  });

  _modal.showModal();
}

// ── Field rendering ───────────────────────────────────────────────

function renderField(f: TemplateField, value: string): string {
  const label = `<label class="label pb-1"><span class="label-text font-medium text-sm">${f.label}${f.required ? ' <span class="text-error">*</span>' : ''}</span></label>`;
  const hint = f.hint ? `<div class="label pt-0.5"><span class="label-text-alt text-base-content/50">${f.hint}</span></div>` : '';

  switch (f.type) {
    case 'rich-text':
      return `<div class="form-control" data-field="${f.id}">
        ${label}
        <div class="border border-base-300 rounded-lg overflow-hidden focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-colors">
          <div class="flex flex-wrap gap-0.5 p-1 bg-base-200 border-b border-base-300">
            ${richToolbarBtn('bold',              '<b>B</b>',    'Bold')}
            ${richToolbarBtn('italic',            '<i>I</i>',    'Italic')}
            ${richToolbarBtn('underline',         '<u>U</u>',    'Υπογράμμιση')}
            <div class="w-px h-5 bg-base-300 self-center mx-0.5"></div>
            ${richToolbarBtn('superscript',       'x²',          'Εκθέτης')}
            ${richToolbarBtn('subscript',         'x₂',          'Δείκτης')}
            <div class="w-px h-5 bg-base-300 self-center mx-0.5"></div>
            ${richToolbarBtn('insertOrderedList', '1.',          'Αριθμημένη λίστα')}
            ${richToolbarBtn('removeFormat',      '✕',           'Καθαρισμός μορφοποίησης')}
          </div>
          <div
            class="p-3 min-h-[120px] focus:outline-none font-serif text-sm leading-relaxed"
            contenteditable="true"
            data-rich="${f.id}"
          >${value}</div>
        </div>
        ${hint}
      </div>`;

    case 'textarea':
      return `<div class="form-control" data-field="${f.id}">
        ${label}
        <textarea
          class="textarea textarea-bordered text-sm leading-relaxed"
          name="${f.id}"
          rows="4"
          placeholder="${f.placeholder ?? ''}"
          ${f.required ? 'required' : ''}
        >${value}</textarea>
        ${hint}
      </div>`;

    case 'number':
      return `<div class="form-control" data-field="${f.id}">
        ${label}
        <input
          type="number"
          class="input input-bordered w-full"
          name="${f.id}"
          value="${value}"
          placeholder="${f.placeholder ?? ''}"
          ${f.required ? 'required' : ''}
        />
        ${hint}
      </div>`;

    default:
      return `<div class="form-control" data-field="${f.id}">
        ${label}
        <input
          type="text"
          class="input input-bordered w-full"
          name="${f.id}"
          value="${escHtml(value)}"
          placeholder="${f.placeholder ?? ''}"
          ${f.required ? 'required' : ''}
        />
        ${hint}
      </div>`;
  }
}

function richToolbarBtn(cmd: string, html: string, title: string): string {
  return `<button type="button" class="btn btn-xs btn-ghost font-normal" data-cmd="${cmd}" title="${title}">${html}</button>`;
}

// ── Rich editor init ──────────────────────────────────────────────

function initRichEditor(editor: HTMLElement): void {
  const toolbar = editor.closest('.border')?.querySelector<HTMLElement>('.flex');
  toolbar?.querySelectorAll<HTMLButtonElement>('[data-cmd]').forEach(btn => {
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      editor.focus();
      document.execCommand(btn.dataset.cmd!, false);
    });
  });
}

// ── Data collection & validation ──────────────────────────────────

function collectData(modal: HTMLDialogElement): Record<string, string> {
  const data: Record<string, string> = {};
  modal.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('[name]').forEach(el => {
    data[el.name] = el.value;
  });
  modal.querySelectorAll<HTMLElement>('[data-rich]').forEach(el => {
    data[el.dataset.rich!] = el.innerHTML;
  });
  return data;
}

function validateData(
  data: Record<string, string>,
  template: Template,
  modal: HTMLDialogElement
): boolean {
  for (const f of template.fields) {
    if (!f.required) continue;
    const val = data[f.id]?.replace(/<[^>]+>/g, '').trim();
    if (!val) {
      const fieldEl = modal.querySelector<HTMLElement>(`[data-field="${f.id}"] input, [data-field="${f.id}"] textarea, [data-field="${f.id}"] [data-rich]`);
      fieldEl?.focus();
      fieldEl?.classList.add('input-error', 'textarea-error', 'border-error');
      return false;
    }
  }
  return true;
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
