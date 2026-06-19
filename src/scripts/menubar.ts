import { undo, redo } from './blocks';
import { renderFormDoc } from './formEditor';

// ── SVG helpers ────────────────────────────────────────────────────

function svg(d: string): string {
  return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
}

const SAVE_ICO   = svg('<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>');
const IMPORT_ICO = svg('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>');
const FOLDER_ICO = svg('<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>');
const HTML_ICO   = svg('<rect x="3" y="3" width="18" height="18"/><path d="M3 9h18"/><path d="M9 21V9"/>');
const XML_ICO    = svg('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M8 13h8"/><path d="M8 17h5"/>');
const TEX_ICO    = svg('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>');
const PRINT_ICO  = svg('<polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>');
const EXIT_ICO   = svg('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>');
const UNDO_ICO   = svg('<polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.36"/>');
const REDO_ICO   = svg('<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.49-3.36"/>');
const META_ICO   = svg('<rect x="3" y="3" width="18" height="18"/><path d="M3 9h18"/><path d="M9 21V9"/>');
const COG_ICO    = svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>');
const EDIT_ICO   = svg('<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>');
const EYE_ICO    = svg('<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>');
const CODE_ICO   = svg('<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>');

// ── Helpers ────────────────────────────────────────────────────────

function btn(icon: string, label: string, attrs: string, kbd = ''): string {
  const kbdHtml = kbd ? `<span class="nb-menu-kbd">${kbd}</span>` : '';
  return `<button class="nb-file-menu-item" type="button" ${attrs}>${icon}${label}${kbdHtml}</button>`;
}

function extBtn(icon: string, label: string, attrs: string, ext: string): string {
  return `<button class="nb-file-menu-item" type="button" ${attrs}>${icon}${label}<span class="nb-file-menu-ext">${ext}</span></button>`;
}

function extLink(icon: string, label: string, href: string, dl: string, ext: string): string {
  return `<a class="nb-file-menu-item" href="${href}" download="${dl}">${icon}${label}<span class="nb-file-menu-ext">${ext}</span></a>`;
}

function sep(): string  { return '<div class="nb-file-menu-sep"></div>'; }
function sect(t: string): string { return `<div class="nb-file-menu-section">${t}</div>`; }

// ── Init ───────────────────────────────────────────────────────────

export function initMenubar(container: HTMLElement): void {
  container.innerHTML = `
    <div class="nb-mb-brand">
      <span class="nb-mb-title">Legisleture Builder</span>
    </div>

    <nav class="nb-mb-nav" id="nb-mb-nav">

      <!-- ── Αρχείο ── -->
      <div class="nb-mb-menu-wrap">
        <button class="nb-mb-menu-btn" type="button" id="nb-export-trigger" data-mb-menu="file">Αρχείο</button>
        <div class="nb-file-menu nb-mb-dropdown" id="nb-file-menu" hidden>
          ${sect('Αποθήκευση')}
          ${btn(SAVE_ICO,   'Αποθήκευση',             'data-mb-action="save"',      'Ctrl+S')}
          ${extBtn(SAVE_ICO,   'Αποθήκευση ως JSON',  'data-file-action="save-json"', '.json')}
          ${extBtn(FOLDER_ICO, 'Αποθήκευση ως φάκελο','data-file-action="save-package"', '')}
          ${sep()}
          ${sect('Εισαγωγή')}
          ${btn(IMPORT_ICO, 'Εισαγωγή αρχείου&hellip;', 'id="nb-import-btn"')}
          ${btn(FOLDER_ICO, 'Φόρτωση από φάκελο',     'data-file-action="load-package"')}
          ${sep()}
          ${sect('Εξαγωγή')}
          ${extBtn(HTML_ICO, 'Ιστοσελίδα ΦΕΚ',        'data-file-action="export-fek-html"', '.html')}
          ${extBtn(XML_ICO,  'Akoma Ntoso',             'data-file-action="export-akoma"',    '.xml')}
          ${extBtn(TEX_ICO,  'LaTeX (XeLaTeX)',         'data-file-action="export-latex"',    '.tex')}
          ${extLink(TEX_ICO, 'Κλάση LaTeX ΦΕΚ',        '/fek.cls', 'fek.cls',                'fek.cls')}
          ${sep()}
          ${btn(PRINT_ICO, 'Εκτύπωση / PDF',           'data-file-action="export-pdf"')}
          ${sep()}
          <a class="nb-file-menu-item" href="/">${EXIT_ICO}Έξοδο</a>
        </div>
      </div>

      <!-- ── Επεξεργασία ── -->
      <div class="nb-mb-menu-wrap">
        <button class="nb-mb-menu-btn" type="button" data-mb-menu="edit">Επεξεργασία</button>
        <div class="nb-mb-dropdown" hidden>
          ${btn(UNDO_ICO, 'Αναίρεση',   'data-mb-action="undo"', 'Ctrl+Z')}
          ${btn(REDO_ICO, 'Επανάληψη',  'data-mb-action="redo"', 'Ctrl+Y')}
          ${sep()}
          ${btn(META_ICO, 'ΦΕΚ Στοιχεία&hellip;', 'id="nb-fek-meta-btn"')}
          ${sep()}
          ${btn(COG_ICO,  'Ρυθμίσεις&hellip;',     'id="nb-settings-btn"')}
        </div>
      </div>

      <!-- ── Προβολή ── -->
      <div class="nb-mb-menu-wrap">
        <button class="nb-mb-menu-btn" type="button" data-mb-menu="view">Προβολή</button>
        <div class="nb-mb-dropdown" hidden>
          <button class="nb-file-menu-item nb-mode-tab" type="button" data-mode="edit">${EDIT_ICO}Επεξεργασία</button>
          <button class="nb-file-menu-item nb-mode-tab" type="button" data-mode="preview">${EYE_ICO}Προεπισκόπηση</button>
        </div>
      </div>

    </nav>

    <div class="nb-mb-right">
      <!-- Save pill — compact icon that expands on save -->
      <button class="nb-mb-save-pill" id="nb-save-btn" type="button" title="Αποθήκευση (Ctrl+S)">
        <span class="nb-mb-save-icon">${SAVE_ICO}</span>
        <span class="nb-mb-save-text" id="nb-save-text"></span>
      </button>
    </div>
  `;

  const nav = container.querySelector<HTMLElement>('#nb-mb-nav')!;

  // ── Dropdown open/close ──────────────────────────────────────────

  function closeAll(): void {
    nav.querySelectorAll<HTMLElement>('.nb-mb-dropdown').forEach(d => d.setAttribute('hidden', ''));
    nav.querySelectorAll<HTMLElement>('.nb-mb-menu-btn').forEach(b => b.classList.remove('nb-mb-menu-btn--open'));
  }

  nav.addEventListener('click', (e) => {
    const trigger = (e.target as Element).closest<HTMLButtonElement>('.nb-mb-menu-btn');
    if (!trigger) return;
    e.stopPropagation();
    const wrap = trigger.closest<HTMLElement>('.nb-mb-menu-wrap')!;
    const dropdown = wrap.querySelector<HTMLElement>('.nb-mb-dropdown')!;
    const wasOpen = !dropdown.hidden;
    closeAll();
    if (!wasOpen) {
      dropdown.removeAttribute('hidden');
      trigger.classList.add('nb-mb-menu-btn--open');
    }
  });

  nav.addEventListener('mouseover', (e) => {
    const trigger = (e.target as Element).closest<HTMLButtonElement>('.nb-mb-menu-btn');
    if (!trigger) return;
    const anyOpen = Array.from(nav.querySelectorAll<HTMLElement>('.nb-mb-dropdown')).some(d => !d.hidden);
    if (!anyOpen) return;
    const wrap = trigger.closest<HTMLElement>('.nb-mb-menu-wrap')!;
    const dropdown = wrap.querySelector<HTMLElement>('.nb-mb-dropdown')!;
    closeAll();
    dropdown.removeAttribute('hidden');
    trigger.classList.add('nb-mb-menu-btn--open');
  });

  document.addEventListener('click', () => closeAll());

  nav.querySelectorAll<HTMLElement>('.nb-mb-dropdown').forEach(d => {
    d.addEventListener('click', (e) => e.stopPropagation());
  });

  // ── Menu item actions ────────────────────────────────────────────

  container.addEventListener('click', (e) => {
    const target = (e.target as Element).closest<HTMLElement>('[data-mb-action]');
    if (!target) return;
    closeAll();
    switch (target.dataset.mbAction) {
      case 'save':
        document.dispatchEvent(new CustomEvent('nb:save'));
        break;
      case 'undo':
        undo();
        renderFormDoc();
        break;
      case 'redo':
        redo();
        renderFormDoc();
        break;
    }
  });

  // Close dropdown when an item is clicked
  container.addEventListener('click', (e) => {
    const item = (e.target as Element).closest<HTMLElement>(
      '[data-file-action], .nb-mode-tab, #nb-import-btn, #nb-fek-meta-btn, #nb-settings-btn'
    );
    if (item) closeAll();
  });

  // ── Save pill animation ──────────────────────────────────────────

  let pillTimer: ReturnType<typeof setTimeout> | null = null;

  document.addEventListener('nb:saved', (e: Event) => {
    const pill = container.querySelector<HTMLElement>('.nb-mb-save-pill');
    const textEl = container.querySelector<HTMLElement>('#nb-save-text');
    if (!pill || !textEl) return;

    if (pillTimer) { clearTimeout(pillTimer); pillTimer = null; }

    const text = (e as CustomEvent<{ text: string }>).detail?.text ?? 'Αποθηκεύτηκε';
    textEl.textContent = text;
    pill.classList.remove('nb-mb-save-pill--unsaved');
    pill.classList.add('nb-mb-save-pill--saved');

    pillTimer = setTimeout(() => {
      pill.classList.remove('nb-mb-save-pill--saved');
      pillTimer = null;
    }, 3000);
  });

  document.addEventListener('nb:unsaved', () => {
    const pill = container.querySelector<HTMLElement>('.nb-mb-save-pill');
    if (!pill || pill.classList.contains('nb-mb-save-pill--saved')) return;
    pill.classList.add('nb-mb-save-pill--unsaved');
  });
}
