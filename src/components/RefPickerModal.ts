import { getAllEntries, TEMPLATE_ORDER, TEMPLATE_DISPLAY_NAMES, type DocEntry } from '../utils/docRegistry';
import { icon, refreshIcons } from '../utils/icons';

type OnSelectFn = (html: string) => void;

const FORMATS = [
  { id: 'full',     label: 'Ονομαστική',   fn: (e: DocEntry) => e.label              },
  { id: 'lower',    label: 'Πεζή',          fn: (e: DocEntry) => e.label.toLowerCase() },
  { id: 'genitive', label: 'Γενική',        fn: (e: DocEntry) => e.genLabel.toLowerCase() },
  { id: 'abbr',     label: 'Σύντομη',      fn: (e: DocEntry) => e.abbrLabel          },
  { id: 'number',   label: 'Μόνο αριθμός', fn: (e: DocEntry) => e.number             },
] as const;

type FormatId = typeof FORMATS[number]['id'];

let _modal: HTMLDialogElement | null = null;
let _selectedId: string | null = null;
let _fmt: FormatId = 'full';
let _onSelect: OnSelectFn | null = null;

export function openRefPickerModal(onSelect: OnSelectFn): void {
  _onSelect = onSelect;
  _selectedId = null;
  _fmt = 'full';

  if (!_modal) {
    _modal = document.createElement('dialog');
    _modal.id = 'nb-ref-picker';
    _modal.className = 'modal';
    document.body.appendChild(_modal);
  }

  render();
  _modal.showModal();
  refreshIcons();
}

function render(): void {
  if (!_modal) return;
  const entries = getAllEntries();

  const groups: Partial<Record<string, DocEntry[]>> = {};
  for (const e of entries) {
    (groups[e.templateId] ??= []).push(e);
  }
  const hasEntries = entries.length > 0;

  _modal.innerHTML = `
    <div class="modal-box w-11/12 max-w-md font-sans">
      <form method="dialog">
        <button class="btn btn-sm btn-circle btn-ghost absolute right-3 top-3">${icon('x', 'w-4 h-4')}</button>
      </form>
      <h3 class="font-bold text-base mb-4">Εισαγωγή παραπομπής</h3>

      ${!hasEntries ? `
        <p class="text-sm text-base-content/50 text-center py-8">
          Δεν υπάρχουν ακόμη στοιχεία.<br>
          Πρόσθεσε Μέρη, Κεφάλαια, Άρθρα ή Παραγράφους πρώτα.
        </p>
      ` : `
        <div class="border border-base-300 rounded-lg overflow-hidden max-h-52 overflow-y-auto mb-4" id="nb-ref-list">
          ${TEMPLATE_ORDER.filter(tid => groups[tid]?.length).map(tid => `
            <div class="px-3 py-1 bg-base-200 sticky top-0">
              <span class="text-[10px] font-bold uppercase tracking-widest text-base-content/40">${TEMPLATE_DISPLAY_NAMES[tid]}</span>
            </div>
            ${groups[tid]!.map(e => `
              <button type="button"
                class="nb-ref-entry w-full text-left px-3 py-1.5 text-sm hover:bg-base-100 transition-colors"
                data-entry-id="${e.instanceId}">
                ${e.label}
              </button>
            `).join('')}
          `).join('')}
        </div>

        <div class="mb-4">
          <div class="text-xs font-medium text-base-content/50 mb-2">Μορφή εμφάνισης</div>
          <div class="flex flex-wrap gap-x-4 gap-y-1.5">
            ${FORMATS.map(f => `
              <label class="flex items-center gap-1.5 cursor-pointer">
                <input type="radio" name="nb-ref-fmt" class="radio radio-xs radio-primary"
                  value="${f.id}" ${_fmt === f.id ? 'checked' : ''} />
                <span class="text-sm">${f.label}</span>
              </label>
            `).join('')}
          </div>
        </div>

        <div class="p-3 bg-base-200 rounded-lg text-sm font-serif mb-2 min-h-9" id="nb-ref-preview">
          <span class="text-base-content/30 text-xs">Επίλεξε στοιχείο…</span>
        </div>
      `}

      <div class="modal-action mt-4">
        <form method="dialog"><button class="btn btn-ghost btn-sm">Άκυρο</button></form>
        <button type="button" id="nb-ref-confirm" class="btn btn-primary btn-sm" ${!hasEntries ? 'disabled' : ''}>
          Εισαγωγή
        </button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop"><button>close</button></form>
  `;

  bindEvents();
}

function formatText(entryId: string, fmt: FormatId): string {
  const entry = getAllEntries().find(e => e.instanceId === entryId);
  if (!entry) return '';
  return FORMATS.find(f => f.id === fmt)!.fn(entry);
}

function updatePreview(): void {
  const el = document.getElementById('nb-ref-preview');
  if (!el) return;
  if (!_selectedId) {
    el.innerHTML = '<span class="text-base-content/30 text-xs">Επίλεξε στοιχείο…</span>';
    return;
  }
  const text = formatText(_selectedId, _fmt);
  el.innerHTML = `…σύμφωνα με <span class="nb-ref">${text}</span>…`;
}

function bindEvents(): void {
  if (!_modal) return;

  _modal.querySelectorAll<HTMLButtonElement>('.nb-ref-entry').forEach(btn => {
    btn.addEventListener('click', () => {
      _selectedId = btn.dataset.entryId!;
      _modal!.querySelectorAll('.nb-ref-entry').forEach(b =>
        b.classList.remove('bg-primary/10', 'text-primary', 'font-medium'));
      btn.classList.add('bg-primary/10', 'text-primary', 'font-medium');
      updatePreview();
    });
  });

  _modal.querySelectorAll<HTMLInputElement>('input[name="nb-ref-fmt"]').forEach(radio => {
    radio.addEventListener('change', () => {
      _fmt = radio.value as FormatId;
      updatePreview();
    });
  });

  document.getElementById('nb-ref-confirm')?.addEventListener('click', () => {
    if (!_selectedId) return;
    const text = formatText(_selectedId, _fmt);
    const html = `<a class="nb-ref" data-ref-id="${_selectedId}" contenteditable="false">${text}</a>`;
    _modal!.close();
    _onSelect?.(html);
  });
}
