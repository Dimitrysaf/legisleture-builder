import { getEntry, type DocEntry } from '../utils/docRegistry';
import { icon, refreshIcons } from '../utils/icons';
import { state } from '../scripts/state';

type OnSelectFn = (html: string) => void;

interface TreeNode {
  instanceId: string;
  entry: DocEntry;
  children: TreeNode[];
}

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

  _render();
  _modal.showModal();
  refreshIcons();
}

// ── Tree building ──────────────────────────────────────────────────────────

function _getDirectZones(wrapper: HTMLElement): HTMLElement[] {
  return Array.from(wrapper.querySelectorAll<HTMLElement>('.nb-container-zone')).filter(zone => {
    let p = zone.parentElement;
    while (p && p !== wrapper) {
      if (p.classList.contains('nb-block-wrapper')) return false;
      p = p.parentElement;
    }
    return true;
  });
}

function _buildTree(el: HTMLElement): TreeNode[] {
  const nodes: TreeNode[] = [];
  for (const child of Array.from(el.children)) {
    const wrapper = child as HTMLElement;
    if (!wrapper.classList.contains('nb-block-wrapper')) continue;
    const id = wrapper.dataset.instanceId;
    if (!id) continue;
    const entry = getEntry(id);
    if (!entry) continue;

    const children: TreeNode[] = [];
    for (const zone of _getDirectZones(wrapper)) {
      _buildTree(zone).forEach(n => children.push(n));
    }

    nodes.push({ instanceId: id, entry, children });
  }
  return nodes;
}

// ── Tree rendering ──────────────────────────────────────────────────────────

function _renderTree(nodes: TreeNode[], depth = 0): string {
  if (nodes.length === 0) return '';
  const childrenHidden = depth > 0 ? 'hidden' : '';
  return `<ul class="nb-ref-tree ${depth === 0 ? 'nb-ref-tree--root' : ''}" ${childrenHidden}>
    ${nodes.map(node => `
      <li class="nb-ref-tree-li" data-tree-id="${node.instanceId}">
        <div class="nb-ref-tree-row" style="--depth:${depth}">
          ${node.children.length > 0
            ? `<button type="button" class="nb-ref-tree-toggle" data-toggle="${node.instanceId}" aria-label="Ανάπτυξη">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
               </button>`
            : `<span class="nb-ref-tree-leaf"></span>`
          }
          <button type="button" class="nb-ref-tree-item" data-entry-id="${node.instanceId}">
            ${node.entry.label}
          </button>
        </div>
        ${node.children.length > 0 ? _renderTree(node.children, depth + 1) : ''}
      </li>
    `).join('')}
  </ul>`;
}

// ── Modal render ───────────────────────────────────────────────────────────

function _render(): void {
  if (!_modal) return;
  const tree = _buildTree(state.paper);
  const hasEntries = tree.length > 0;

  _modal.innerHTML = `
    <div class="modal-box w-11/12 max-w-3xl font-sans flex flex-col" style="height:90vh;max-height:90vh;padding-bottom:0;">
      <form method="dialog">
        <button class="btn btn-sm btn-circle btn-ghost absolute right-3 top-3">${icon('x', 'w-4 h-4')}</button>
      </form>
      <h3 class="font-bold text-base mb-3 flex-shrink-0">Εισαγωγή παραπομπής</h3>

      ${!hasEntries ? `
        <p class="text-sm text-base-content/50 text-center py-12">
          Δεν υπάρχουν ακόμη στοιχεία.<br>
          Πρόσθεσε Μέρη, Κεφάλαια, Άρθρα ή Παραγράφους πρώτα.
        </p>
      ` : `
        <!-- Tree -->
        <div class="nb-ref-tree-wrap flex-1 min-h-0 overflow-y-auto border border-base-300 rounded-lg mb-3" id="nb-ref-tree-wrap">
          ${_renderTree(tree)}
        </div>

        <!-- Format options -->
        <div class="flex-shrink-0 mb-3">
          <div class="text-xs font-semibold text-base-content/50 uppercase tracking-wide mb-2">Μορφή εμφάνισης</div>
          <div class="flex flex-wrap gap-x-5 gap-y-1.5">
            ${FORMATS.map(f => `
              <label class="flex items-center gap-1.5 cursor-pointer">
                <input type="radio" name="nb-ref-fmt" class="radio radio-xs radio-primary"
                  value="${f.id}" ${_fmt === f.id ? 'checked' : ''} />
                <span class="text-sm">${f.label}</span>
              </label>
            `).join('')}
          </div>
        </div>

        <!-- Preview -->
        <div class="flex-shrink-0 p-3 bg-base-200 rounded-lg text-sm font-serif min-h-10" id="nb-ref-preview">
          <span class="text-base-content/30 text-xs">Επίλεξε στοιχείο…</span>
        </div>
      `}

      <div class="modal-action flex-shrink-0 mt-3">
        <form method="dialog"><button class="btn btn-ghost btn-sm">Άκυρο</button></form>
        <button type="button" id="nb-ref-confirm" class="btn btn-primary btn-sm" ${!hasEntries || !_selectedId ? 'disabled' : ''}>
          Εισαγωγή
        </button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop"><button>close</button></form>
  `;

  _bindEvents();
}

// ── Events ────────────────────────────────────────────────────────────────

function _formatText(entryId: string, fmt: FormatId): string {
  const entry = getEntry(entryId);
  if (!entry) return '';
  return FORMATS.find(f => f.id === fmt)!.fn(entry);
}

function _updatePreview(): void {
  const el = document.getElementById('nb-ref-preview');
  if (!el) return;
  if (!_selectedId) {
    el.innerHTML = '<span class="text-base-content/30 text-xs">Επίλεξε στοιχείο…</span>';
    return;
  }
  const text = _formatText(_selectedId, _fmt);
  el.innerHTML = `…σύμφωνα με <span class="nb-ref">${text}</span>…`;
}

function _setSelected(id: string): void {
  _selectedId = id;
  _modal!.querySelectorAll<HTMLElement>('.nb-ref-tree-item').forEach(b => {
    b.classList.toggle('nb-ref-tree-item--selected', b.dataset.entryId === id);
  });
  const confirmBtn = document.getElementById('nb-ref-confirm') as HTMLButtonElement | null;
  if (confirmBtn) confirmBtn.disabled = false;
  _updatePreview();
}

function _bindEvents(): void {
  if (!_modal) return;

  // Expand/collapse toggles
  _modal.querySelectorAll<HTMLButtonElement>('.nb-ref-tree-toggle').forEach(toggle => {
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const li = toggle.closest<HTMLElement>('.nb-ref-tree-li')!;
      const childrenList = li.querySelector<HTMLElement>(':scope > ul.nb-ref-tree');
      if (!childrenList) return;
      const isOpen = !childrenList.hasAttribute('hidden');
      if (isOpen) {
        childrenList.setAttribute('hidden', '');
        toggle.classList.remove('nb-ref-tree-toggle--open');
      } else {
        childrenList.removeAttribute('hidden');
        toggle.classList.add('nb-ref-tree-toggle--open');
      }
    });
  });

  // Select items
  _modal.querySelectorAll<HTMLButtonElement>('.nb-ref-tree-item').forEach(btn => {
    btn.addEventListener('click', () => _setSelected(btn.dataset.entryId!));
  });

  // Format radio buttons
  _modal.querySelectorAll<HTMLInputElement>('input[name="nb-ref-fmt"]').forEach(radio => {
    radio.addEventListener('change', () => {
      _fmt = radio.value as FormatId;
      _updatePreview();
    });
  });

  // Confirm button
  document.getElementById('nb-ref-confirm')?.addEventListener('click', () => {
    if (!_selectedId) return;
    const text = _formatText(_selectedId, _fmt);
    const html = `<a class="nb-ref" data-ref-id="${_selectedId}" data-ref-fmt="${_fmt}" contenteditable="false">${text}</a>`;
    _modal!.close();
    _onSelect?.(html);
  });
}
