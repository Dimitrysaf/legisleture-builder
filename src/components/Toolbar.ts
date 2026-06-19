import { getAllTemplates } from '../templates/registry';
import type { Template } from '../templates/types';
import { icon, refreshIcons } from '../utils/icons';
import { canInsertInContainer } from '../utils/nesting';
import { TEMPLATE_CATEGORIES as CATEGORIES } from '../templates/categories';

type OnSelectFn = (template: Template) => void;

let _paperEl: HTMLElement | null = null;

export function initToolbar(
  container: HTMLElement,
  onSelect: OnSelectFn,
  paperEl?: HTMLElement,
): void {
  _paperEl = paperEl ?? null;
  container.innerHTML = `
    <!-- Header -->
    <div class="nb-sidebar-header">
      <a href="/" class="nb-home-link" title="Αρχική — λίστα έργων">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        Αρχική
      </a>
      <div style="display:flex;align-items:center;gap:4px">
        <button id="nb-settings-btn" type="button" class="btn btn-ghost btn-sm btn-circle" title="Ρυθμίσεις">
          ${icon('settings', 'w-4 h-4')}
        </button>
        <label for="nb-drawer-toggle" class="btn btn-ghost btn-xs btn-circle lg:hidden">
          ${icon('x', 'w-3.5 h-3.5')}
        </label>
      </div>
    </div>

    <!-- View mode (vertical tabs) -->
    <div class="nb-sidebar-modes">
      <button class="nb-mode-tab nb-mode-tab--active" data-mode="edit">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        Επεξεργασία
      </button>
      <button class="nb-mode-tab" data-mode="preview">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        Προεπισκόπηση
      </button>
      <button class="nb-mode-tab" data-mode="code">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
        LaTeX
      </button>
    </div>

    <div class="nb-sidebar-sep"></div>

    <!-- Action buttons grid -->
    <div class="nb-sidebar-actions">
      <button class="nb-sidebar-btn" id="nb-undo-btn" type="button" title="Αναίρεση (Ctrl+Z)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
        Αναίρεση
      </button>
      <button class="nb-sidebar-btn" id="nb-redo-btn" type="button" title="Επανάληψη (Ctrl+Y)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"/></svg>
        Επανάληψη
      </button>
      <button class="nb-sidebar-btn" id="nb-slots-btn" type="button" title="Αποθηκευμένες συνεδρίες">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
        Συνεδρίες
      </button>
      <button class="nb-sidebar-btn" id="nb-versions-btn" type="button" title="Ιστορικό εκδόσεων">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        Ιστορικό
      </button>
      <button class="nb-sidebar-btn" id="nb-completeness-btn" type="button" title="Πληρότητα εγγράφου">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        Πληρότητα
      </button>
      <button class="nb-sidebar-btn" id="nb-law-index-btn" type="button" title="Ευρετήριο cross-document νόμων">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
        Ευρετήριο
      </button>
      <button class="nb-sidebar-btn" id="nb-fek-meta-btn" type="button" title="Στοιχεία ΦΕΚ">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
        ΦΕΚ Στοιχεία
      </button>
      <button class="nb-sidebar-btn" id="nb-import-btn" type="button" title="Φόρτωση αρχείου .json ή .tex">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        Εισαγωγή
      </button>
      <div class="nb-dropdown-wrap">
        <button class="nb-sidebar-btn nb-sidebar-btn--primary" id="nb-export-trigger" type="button">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Εξαγωγή
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
        </button>

        <div class="nb-file-menu" id="nb-file-menu" hidden>
          <div class="nb-file-menu-section">Αποθήκευση έργου</div>
          <button class="nb-file-menu-item" data-file-action="save-json">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            Αποθήκευση ως JSON
            <span class="nb-file-menu-ext">.json</span>
          </button>

          <div class="nb-file-menu-sep"></div>
          <div class="nb-file-menu-section">Εξαγωγή</div>

          <button class="nb-file-menu-item" data-file-action="export-html">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
            Ιστοσελίδα
            <span class="nb-file-menu-ext">.html</span>
          </button>
          <button class="nb-file-menu-item" data-file-action="export-fek-html">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
            Ιστοσελίδα με ΦΕΚ επικεφαλίδα
            <span class="nb-file-menu-ext">.html</span>
          </button>
          <button class="nb-file-menu-item" data-file-action="export-latex">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            LaTeX
            <span class="nb-file-menu-ext">.tex</span>
          </button>
          <a class="nb-file-menu-item" href="/fek.cls" download="fek.cls">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            Κλάση LaTeX ΦΕΚ
            <span class="nb-file-menu-ext">fek.cls</span>
          </a>
          <button class="nb-file-menu-item" data-file-action="export-akoma">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M8 13h8"/><path d="M8 17h5"/></svg>
            Akoma Ntoso
            <span class="nb-file-menu-ext">.xml</span>
          </button>
          <button class="nb-file-menu-item" data-file-action="export-txt">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            Απλό Κείμενο
            <span class="nb-file-menu-ext">.txt</span>
          </button>

          <div class="nb-file-menu-sep"></div>

          <button class="nb-file-menu-item" data-file-action="export-pdf">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Εκτύπωση / PDF
          </button>
        </div>
      </div>

      <input type="file" id="nb-import-input" accept=".json,.tex,.latex"
        style="position:absolute;width:1px;height:1px;opacity:0;overflow:hidden;clip:rect(0,0,0,0);pointer-events:none;">
    </div>

    <div class="nb-sidebar-sep"></div>

    <!-- Templates -->
    <div class="nb-sidebar-section-label">Templates</div>
    <div class="px-3 pb-2 flex-shrink-0">
      <input
        id="nb-template-search"
        type="text"
        placeholder="Αναζήτηση..."
        class="input input-bordered input-sm w-full"
      />
    </div>
    <div class="flex-1 overflow-y-auto px-3 pb-3 min-h-0" id="nb-template-list"></div>
  `;

  renderList('', onSelect);
  refreshIcons();

  document.getElementById('nb-template-search')?.addEventListener('input', (e) => {
    renderList((e.target as HTMLInputElement).value.toLowerCase().trim(), onSelect);
  });
}

export function refreshToolbar(onSelect: OnSelectFn): void {
  const search = (document.getElementById('nb-template-search') as HTMLInputElement | null)?.value?.toLowerCase().trim() ?? '';
  renderList(search, onSelect);
}

export type { OnSelectFn };

function renderList(search: string, onSelect: OnSelectFn): void {
  const container = document.getElementById('nb-template-list');
  if (!container) return;
  container.innerHTML = '';

  const all = _paperEl
    ? getAllTemplates().filter(t => canInsertInContainer(t.id, _paperEl!))
    : getAllTemplates();
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

  refreshIcons();
}

function makeCard(t: Template, onSelect: OnSelectFn): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = [
    'flex flex-col items-center justify-center gap-1.5',
    'rounded-lg border border-base-300 bg-base-100 px-2 py-3',
    'hover:border-primary hover:bg-primary hover:text-primary-content',
    'active:scale-95 transition-all duration-100 cursor-pointer',
  ].join(' ');
  btn.title = t.description ?? t.name;
  btn.innerHTML = `
    <span class="pointer-events-none">${icon(t.icon, 'w-5 h-5')}</span>
    <span class="text-[11px] font-medium leading-tight text-center pointer-events-none">${t.name}</span>
    ${t.isCustom ? '<span class="badge badge-xs badge-secondary pointer-events-none">custom</span>' : ''}
  `;
  btn.addEventListener('click', () => onSelect(t));
  return btn;
}
