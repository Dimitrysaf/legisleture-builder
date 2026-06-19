import type { Template, TemplateField, TemplateInstance } from '../templates/types';
import { icon, refreshIcons } from '../utils/icons';
import { allFormats } from '../utils/numbering';
import { openRefPickerModal } from './RefPickerModal';
import { sanitizeHtml } from '../utils/sanitize';
import { storeImageAsset, resolveAssetUrl } from '../utils/assets';
import { state } from '../scripts/state';
import { initTableGridEditor } from './TableGridEditor';

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
          .filter(f => template.id === 'table' && (f.id === 'headers' || f.id === 'rows') ? false : true)
          .map(f => renderField(
            f,
            existing?.data[f.id] ?? f.defaultValue ?? '',
            (!existing && f.id === 'number' && opts?.nextN != null) ? opts.nextN : undefined,
            (!existing && f.id === 'number') ? opts?.nextLabel : undefined,
            existing?.data,
          ))
          .join('')}
        ${template.id === 'table' ? `
          <div class="form-control" data-table-grid>
            <label class="label pb-1"><span class="label-text font-medium text-sm">Δεδομένα Πίνακα</span></label>
            <input type="hidden" name="headers" value="${escHtml(existing?.data.headers ?? 'Στήλη 1 | Στήλη 2')}">
            <input type="hidden" name="rows"    value="${escHtml(existing?.data.rows ?? ' | ')}">
          </div>` : ''}
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
  _modal.querySelectorAll<HTMLElement>('[data-image-field]').forEach(initImageField);
  _modal.querySelectorAll<HTMLElement>('[data-table-grid]').forEach(initTableGridEditor);

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

function renderField(f: TemplateField, value: string, nextN?: number, nextLabel?: string, allData?: Record<string, string>): string {
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

    case 'image': {
      const hasImg = value.startsWith('data:') || value.startsWith('http');
      const existingAssetId = allData?.assetId ?? '';
      const hasAsset = !!existingAssetId;
      // If assetId exists but src is empty, show loading placeholder; initImageField resolves it
      const previewInner = hasImg
        ? `<img src="${escHtml(value)}" alt="Προεπισκόπηση" class="nb-imgfield-preview-img">`
        : hasAsset
          ? `<span class="nb-imgfield-placeholder nb-imgfield-loading">Φόρτωση εικόνας…</span>`
          : `<span class="nb-imgfield-placeholder"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><span>Δεν έχει επιλεγεί εικόνα</span></span>`;
      return `<div class="form-control" data-field="${f.id}">
        ${label}
        <div class="nb-imgfield" data-image-field="${f.id}" data-existing-asset="${escHtml(existingAssetId)}">
          <div class="nb-imgfield-preview">${previewInner}</div>
          <div class="nb-imgfield-actions">
            <label class="btn btn-sm btn-outline gap-1.5 cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Επιλογή εικόνας
              <input type="file" accept="image/*" class="sr-only" data-imgfile="${f.id}">
            </label>
            <button type="button" class="btn btn-sm btn-ghost text-error" data-imgclear="${f.id}" ${(hasImg || hasAsset) ? '' : 'hidden'}>Αφαίρεση</button>
          </div>
          <input type="hidden" name="${f.id}" value="${escHtml(value)}">
          <input type="hidden" name="assetId" value="${escHtml(existingAssetId)}">
        </div>
        ${hint}
      </div>`;
    }

    case 'select':
      return `<div class="form-control" data-field="${f.id}">
        ${label}
        <select class="select select-bordered w-full" name="${f.id}" ${f.required ? 'required' : ''}>
          ${(f.options ?? []).map(o =>
            `<option value="${escHtml(o.value)}" ${value === o.value ? 'selected' : ''}>${escHtml(o.label)}</option>`
          ).join('')}
        </select>
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

// ── Image field ───────────────────────────────────────────────────

function initImageField(container: HTMLElement): void {
  const fieldId       = container.dataset.imageField!;
  const fileInput     = container.querySelector<HTMLInputElement>(`[data-imgfile="${fieldId}"]`);
  const hiddenSrc     = container.querySelector<HTMLInputElement>(`[name="${fieldId}"]`);
  const hiddenAssetId = container.querySelector<HTMLInputElement>('[name="assetId"]');
  const preview       = container.querySelector<HTMLElement>('.nb-imgfield-preview');
  const clearBtn      = container.querySelector<HTMLButtonElement>(`[data-imgclear="${fieldId}"]`);

  const PLACEHOLDER = `<span class="nb-imgfield-placeholder"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><span>Δεν έχει επιλεγεί εικόνα</span></span>`;

  function showPreview(dataUrl: string): void {
    if (preview) preview.innerHTML = `<img src="${dataUrl}" alt="Προεπισκόπηση" class="nb-imgfield-preview-img">`;
    clearBtn?.removeAttribute('hidden');
  }

  async function setImage(dataUrl: string, filename = 'image'): Promise<void> {
    if (hiddenSrc) hiddenSrc.value = dataUrl;
    showPreview(dataUrl);
    // Save to IndexedDB as an asset
    const projectId = state.currentProject?.id ?? 'default';
    try {
      const assetId = await storeImageAsset(dataUrl, projectId, filename);
      if (hiddenAssetId) hiddenAssetId.value = assetId;
    } catch { /* non-fatal — src fallback still works */ }
  }

  function clearImage(): void {
    if (hiddenSrc)     hiddenSrc.value = '';
    if (hiddenAssetId) hiddenAssetId.value = '';
    if (fileInput)     fileInput.value = '';
    if (preview)       preview.innerHTML = PLACEHOLDER;
    clearBtn?.setAttribute('hidden', '');
  }

  // Async-resolve preview for existing blocks with assetId but no src
  const existingAsset = container.dataset.existingAsset;
  if (existingAsset && !hiddenSrc?.value) {
    resolveAssetUrl(existingAsset).then(url => {
      if (url) {
        if (hiddenSrc) hiddenSrc.value = url;
        showPreview(url);
      }
    });
  }

  fileInput?.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      if (url) setImage(url, file.name);
    };
    reader.readAsDataURL(file);
  });

  // Drag-and-drop
  preview?.addEventListener('dragover', (e) => { e.preventDefault(); preview.classList.add('nb-imgfield-preview--drag'); });
  preview?.addEventListener('dragleave', ()   => { preview.classList.remove('nb-imgfield-preview--drag'); });
  preview?.addEventListener('drop', (e) => {
    e.preventDefault();
    preview.classList.remove('nb-imgfield-preview--drag');
    const file = e.dataTransfer?.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (ev) => { const url = ev.target?.result as string; if (url) setImage(url, file.name); };
    reader.readAsDataURL(file);
  });

  clearBtn?.addEventListener('click', clearImage);
}

// ── Data collection & validation ──────────────────────────────────

function collectData(modal: HTMLDialogElement): Record<string, string> {
  const data: Record<string, string> = {};
  modal.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('[name]').forEach(el => {
    data[(el as HTMLElement & { name: string }).name] = el.value;
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
      if (f.type === 'image') {
        const preview = modal.querySelector<HTMLElement>(`[data-field="${f.id}"] .nb-imgfield-preview`);
        preview?.classList.add('nb-imgfield-preview--error');
      } else {
        const fieldEl = modal.querySelector<HTMLElement>(`[data-field="${f.id}"] input, [data-field="${f.id}"] textarea, [data-field="${f.id}"] [data-rich]`);
        fieldEl?.focus();
        fieldEl?.classList.add('input-error', 'textarea-error', 'border-error');
      }
      return false;
    }
  }
  return true;
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
