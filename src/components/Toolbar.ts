import { icon, refreshIcons } from '../utils/icons';

export function initToolbar(container: HTMLElement): void {
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

    <!-- View mode tabs -->
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

    <!-- Actions -->
    <div class="nb-sidebar-actions">

      <!-- Save -->
      <button class="nb-sidebar-btn nb-sidebar-btn--save" id="nb-save-btn" type="button" title="Αποθήκευση (Ctrl+S)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
        Αποθήκευση
        <span class="nb-autosave-indicator" id="nb-autosave-dot" title="Αυτόματη αποθήκευση ενεργή"></span>
      </button>

      <!-- ΦΕΚ metadata -->
      <button class="nb-sidebar-btn" id="nb-fek-meta-btn" type="button" title="Στοιχεία ΦΕΚ">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
        ΦΕΚ Στοιχεία
      </button>

      <!-- Import -->
      <button class="nb-sidebar-btn" id="nb-import-btn" type="button" title="Φόρτωση αρχείου .json ή .tex">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        Εισαγωγή
      </button>

      <!-- Export dropdown -->
      <div class="nb-dropdown-wrap">
        <button class="nb-sidebar-btn nb-sidebar-btn--primary" id="nb-export-trigger" type="button">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Εξαγωγή
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
        </button>

        <div class="nb-file-menu" id="nb-file-menu" hidden>
          <div class="nb-file-menu-section">Αποθήκευση αρχείου</div>
          <button class="nb-file-menu-item" data-file-action="save-json">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            Αποθήκευση ως JSON
            <span class="nb-file-menu-ext">.json</span>
          </button>

          <div class="nb-file-menu-sep"></div>
          <div class="nb-file-menu-section">Εξαγωγή</div>

          <button class="nb-file-menu-item" data-file-action="export-fek-html">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
            Ιστοσελίδα ΦΕΚ
            <span class="nb-file-menu-ext">.html</span>
          </button>
          <button class="nb-file-menu-item" data-file-action="export-akoma">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M8 13h8"/><path d="M8 17h5"/></svg>
            Akoma Ntoso
            <span class="nb-file-menu-ext">.xml</span>
          </button>
          <button class="nb-file-menu-item" data-file-action="export-latex">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            LaTeX (XeLaTeX)
            <span class="nb-file-menu-ext">.tex</span>
          </button>
          <a class="nb-file-menu-item" href="/fek.cls" download="fek.cls">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            Κλάση LaTeX ΦΕΚ
            <span class="nb-file-menu-ext">fek.cls</span>
          </a>

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
  `;

  refreshIcons();
}
