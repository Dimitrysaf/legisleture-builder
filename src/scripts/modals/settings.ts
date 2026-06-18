import { state } from '../state';
import { showSaveStatus } from '../toast';

const SETTINGS_KEY = 'nb_settings_v1';

interface AppSettings {
  theme: 'light' | 'dark' | 'macos';
  fontFamily: 'serif' | 'sans';
  paperWidth: 'narrow' | 'normal';
}

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { theme: 'light', fontFamily: 'serif', paperWidth: 'normal', ...JSON.parse(raw) };
  } catch {}
  return { theme: 'light', fontFamily: 'serif', paperWidth: 'normal' };
}

function saveSettings(s: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

function applySettings(s: AppSettings): void {
  const themeMap: Record<AppSettings['theme'], string> = { light: 'light', dark: 'dark', macos: 'macos' };
  document.documentElement.setAttribute('data-theme', themeMap[s.theme] ?? 'light');
  state.paper.style.fontFamily = s.fontFamily === 'sans'
    ? "system-ui, -apple-system, sans-serif"
    : "";
  if (s.paperWidth === 'narrow') {
    state.paper.style.maxWidth = '680px';
  } else {
    state.paper.style.maxWidth = '';
  }
}

export function initSettingsModal(): void {
  const btn = document.getElementById('nb-settings-btn');
  if (!btn) return;
  let modal: HTMLDialogElement | null = null;

  applySettings(loadSettings());

  btn.addEventListener('click', () => {
    if (!modal) {
      modal = document.createElement('dialog');
      modal.className = 'modal';
      document.body.appendChild(modal);
    }

    const s = loadSettings();
    modal.innerHTML = `
      <div class="modal-box w-11/12 max-w-sm font-sans">
        <form method="dialog">
          <button class="btn btn-sm btn-circle btn-ghost absolute right-3 top-3">✕</button>
        </form>
        <h3 class="font-bold text-base mb-5">Ρυθμίσεις</h3>

        <div class="space-y-4">
          <div class="form-control">
            <label class="label pb-1"><span class="label-text font-medium text-sm">Θέμα εμφάνισης</span></label>
            <select name="theme" class="select select-bordered select-sm w-full">
              <option value="light" ${s.theme === 'light' ? 'selected' : ''}>Φωτεινό (Light)</option>
              <option value="dark"  ${s.theme === 'dark'  ? 'selected' : ''}>Σκοτεινό (Dark)</option>
              <option value="macos" ${s.theme === 'macos' ? 'selected' : ''}>macOS X (Aqua)</option>
            </select>
          </div>

          <div class="form-control">
            <label class="label pb-1"><span class="label-text font-medium text-sm">Γραμματοσειρά εγγράφου</span></label>
            <select name="fontFamily" class="select select-bordered select-sm w-full">
              <option value="serif" ${s.fontFamily === 'serif' ? 'selected' : ''}>Serif (Noto Serif — προεπιλογή)</option>
              <option value="sans"  ${s.fontFamily === 'sans'  ? 'selected' : ''}>Sans-serif (Συστήματος)</option>
            </select>
          </div>

          <div class="form-control">
            <label class="label pb-1"><span class="label-text font-medium text-sm">Πλάτος σελίδας</span></label>
            <select name="paperWidth" class="select select-bordered select-sm w-full">
              <option value="normal" ${s.paperWidth === 'normal' ? 'selected' : ''}>Κανονικό (A4)</option>
              <option value="narrow" ${s.paperWidth === 'narrow' ? 'selected' : ''}>Στενό</option>
            </select>
          </div>
        </div>

        <div class="modal-action mt-6">
          <form method="dialog"><button class="btn btn-ghost btn-sm">Άκυρο</button></form>
          <button type="button" id="nb-settings-save" class="btn btn-primary btn-sm">Εφαρμογή</button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button>close</button></form>
    `;

    modal.querySelector('#nb-settings-save')?.addEventListener('click', () => {
      const newSettings: AppSettings = {
        theme: (modal!.querySelector<HTMLSelectElement>('[name="theme"]')?.value ?? 'light') as AppSettings['theme'],
        fontFamily: (modal!.querySelector<HTMLSelectElement>('[name="fontFamily"]')?.value ?? 'serif') as AppSettings['fontFamily'],
        paperWidth: (modal!.querySelector<HTMLSelectElement>('[name="paperWidth"]')?.value ?? 'normal') as AppSettings['paperWidth'],
      };
      saveSettings(newSettings);
      applySettings(newSettings);
      modal!.close();
      showSaveStatus('Ρυθμίσεις αποθηκεύτηκαν');
    });

    modal.showModal();
  });
}
