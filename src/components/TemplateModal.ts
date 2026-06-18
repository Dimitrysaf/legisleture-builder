import type { Template, TemplateField, TemplateInstance } from '../templates/types';
import { icon, refreshIcons } from '../utils/icons';
import { allFormats } from '../utils/numbering';
import { openRefPickerModal } from './RefPickerModal';
import { sanitizeHtml } from '../utils/sanitize';

type OnConfirmFn = (html: string, instance: TemplateInstance) => void;

let _modal: HTMLDialogElement | null = null;

export function openTemplateModal(
  template: Template,
  existing: TemplateInstance | null = null,
  onConfirm?: OnConfirmFn,
  opts?: { nextN?: number; nextLabel?: string }
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
        <button class="btn btn-sm btn-circle btn-ghost absolute right-3 top-3">${icon('x', 'w-4 h-4')}</button>
      </form>

      <div class="flex items-center gap-3 mb-5">
        <span class="text-base-content/70">${icon(template.icon, 'w-8 h-8')}</span>
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
        ${template.fields
          .filter(f => f.type !== 'container')
          .map(f => renderField(
            f,
            existing?.data[f.id] ?? f.defaultValue ?? '',
            (!existing && f.id === 'number' && opts?.nextN != null) ? opts.nextN : undefined,
            (!existing && f.id === 'number') ? opts?.nextLabel : undefined,
          ))
          .join('')}
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

  _modal.querySelectorAll<HTMLButtonElement>('.nb-numfmt-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const input = _modal!.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${chip.dataset.field}"]`);
      if (input) {
        input.value = chip.dataset.val!;
        _modal!.querySelectorAll<HTMLButtonElement>(`.nb-numfmt-chip[data-field="${chip.dataset.field}"]`)
          .forEach(c => c.classList.remove('badge-primary'));
        chip.classList.add('badge-primary');
      }
    });
  });

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
  refreshIcons();
}

// ── Field rendering ───────────────────────────────────────────────

function renderField(f: TemplateField, value: string, nextN?: number, nextLabel?: string): string {
  const label = `<label class="label pb-1"><span class="label-text font-medium text-sm">${f.label}${f.required ? ' <span class="text-error">*</span>' : ''}</span></label>`;
  const hint = f.hint ? `<div class="label pt-0.5"><span class="label-text-alt text-base-content/50">${f.hint}</span></div>` : '';

  const numChips = (() => {
    if (nextN != null) {
      const [arabic, letter, word] = allFormats(nextN);
      const chips = f.type === 'number'
        ? `<button type="button" class="nb-numfmt-chip badge badge-outline badge-sm font-mono" data-field="${f.id}" data-val="${arabic}">${arabic}</button>`
        : `<button type="button" class="nb-numfmt-chip badge badge-outline badge-sm font-mono" data-field="${f.id}" data-val="${arabic}">${arabic}</button>
          <button type="button" class="nb-numfmt-chip badge badge-outline badge-sm" data-field="${f.id}" data-val="${letter}">${letter}</button>
          <button type="button" class="nb-numfmt-chip badge badge-outline badge-sm" data-field="${f.id}" data-val="${word}">${word}</button>`;
      return `<div class="flex flex-wrap items-center gap-1.5 mt-1.5">
        <span class="text-[11px] text-base-content/40">Επόμενος:</span>
        ${chips}
      </div>`;
    }
    if (nextLabel) {
      return `<div class="flex flex-wrap items-center gap-1.5 mt-1.5">
        <span class="text-[11px] text-base-content/40">Επόμενος:</span>
        <button type="button" class="nb-numfmt-chip badge badge-outline badge-sm" data-field="${f.id}" data-val="${nextLabel}">${nextLabel}.</button>
      </div>`;
    }
    return '';
  })();

  switch (f.type) {
    case 'rich-text':
      return `<div class="form-control" data-field="${f.id}">
        ${label}
        <div class="border border-base-300 rounded-lg overflow-hidden focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-colors">
          <div class="flex flex-wrap gap-0.5 p-1 bg-base-200 border-b border-base-300">
            ${richToolbarBtn('bold',              '<b class="text-xs leading-none">B</b>',         'Bold')}
            ${richToolbarBtn('italic',            '<i class="text-xs leading-none font-serif">I</i>', 'Italic')}
            ${richToolbarBtn('underline',         '<u class="text-xs leading-none">U</u>',          'Υπογράμμιση')}
            <div class="w-px h-5 bg-base-300 self-center mx-0.5"></div>
            ${richToolbarBtn('superscript',       '<span class="text-xs leading-none">x²</span>',  'Εκθέτης')}
            ${richToolbarBtn('subscript',         '<span class="text-xs leading-none">x₂</span>',  'Δείκτης')}
            <div class="w-px h-5 bg-base-300 self-center mx-0.5"></div>
            ${richToolbarBtn('insertOrderedList', icon('list-ordered', 'w-3.5 h-3.5'),             'Αριθμημένη λίστα')}
            <div class="w-px h-5 bg-base-300 self-center mx-0.5"></div>
            <button type="button" class="btn btn-xs btn-ghost font-normal" data-ref-insert title="Παραπομπή">${icon('link-2', 'w-3.5 h-3.5')}</button>
            ${richToolbarBtn('removeFormat',      icon('x', 'w-3.5 h-3.5'),                        'Καθαρισμός')}
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
        ${numChips}
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
        ${numChips}
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

  // Intercept paste: strip all HTML except our allowlist, convert plain text to <br>
  editor.addEventListener('paste', (e) => {
    e.preventDefault();
    const html = e.clipboardData?.getData('text/html') ?? '';
    const plain = e.clipboardData?.getData('text/plain') ?? '';
    const content = html
      ? sanitizeHtml(html)
      : plain.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br>');
    document.execCommand('insertHTML', false, content);
  });

  toolbar?.querySelectorAll<HTMLButtonElement>('[data-cmd]').forEach(btn => {
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      editor.focus();
      document.execCommand(btn.dataset.cmd!, false);
    });
  });

  toolbar?.querySelector<HTMLButtonElement>('[data-ref-insert]')?.addEventListener('mousedown', (e) => {
    e.preventDefault();
    // Save cursor position before the picker modal steals focus
    const sel = window.getSelection();
    const savedRange = (sel && sel.rangeCount > 0) ? sel.getRangeAt(0).cloneRange() : null;

    openRefPickerModal((html) => {
      // Restore cursor and insert inline HTML
      const sel2 = window.getSelection();
      sel2?.removeAllRanges();
      if (savedRange) sel2?.addRange(savedRange);
      else editor.focus();
      document.execCommand('insertHTML', false, html);
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
    data[el.dataset.rich!] = sanitizeHtml(el.innerHTML);
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
