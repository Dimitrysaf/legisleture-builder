import { state } from '../state';
import { showSaveStatus } from '../toast';
import { triggerAutoSave } from '../autosave';
import {
  hasFekMeta, buildFekHeaderHtml, EMPTY_META,
  type FekMeta,
} from '../../utils/fekMeta';

const TEUCHOS_OPTIONS = ['Α΄', 'Β΄', 'Γ΄', 'Δ΄', 'ΑΑΠ', 'ΑΑΝ', 'ΥΟΔ΄', 'Δ.Δ.Σ.'];

function greekDateToIso(gdate: string): string {
  const m = gdate.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!m) return '';
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

function isoToGreekDate(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return '';
  return `${parseInt(m[3])}.${parseInt(m[2])}.${m[1]}`;
}

function readModalMeta(modal: HTMLDialogElement): FekMeta {
  const rawDate = (modal.querySelector<HTMLInputElement>('[name="hmeromhnia"]')?.value ?? '').trim();
  return {
    teuchos:    (modal.querySelector<HTMLSelectElement>('[name="teuchos"]')?.value ?? '').trim(),
    arithmos:   (modal.querySelector<HTMLInputElement>('[name="arithmos"]')?.value ?? '').trim(),
    hmeromhnia: rawDate ? isoToGreekDate(rawDate) || rawDate : '',
    titlos:     (modal.querySelector<HTMLInputElement>('[name="titlos"]')?.value ?? '').trim(),
    twoColumn:  (modal.querySelector<HTMLInputElement>('[name="twoColumn"]')?.checked ?? false),
  };
}

function updateFekPreview(modal: HTMLDialogElement): void {
  const preview = modal.querySelector<HTMLElement>('#nb-fek-live-preview');
  if (!preview) return;
  const meta = readModalMeta(modal);
  if (!hasFekMeta(meta)) {
    preview.innerHTML = '<span class="nb-fek-preview-empty">Συμπληρώστε τα παραπάνω πεδία για προεπισκόπηση</span>';
    return;
  }
  preview.innerHTML = buildFekHeaderHtml(meta, '/Coat_of_arms_of_Greece.svg');
}

export function initFekMetaModal(): void {
  const btn = document.getElementById('nb-fek-meta-btn');
  if (!btn) return;

  let modal: HTMLDialogElement | null = null;

  btn.addEventListener('click', () => {
    if (!modal) {
      modal = document.createElement('dialog');
      modal.id = 'nb-fek-meta-modal';
      modal.className = 'modal';
      document.body.appendChild(modal);
    }

    const meta = state.currentProject?.fekMeta ?? { ...EMPTY_META };
    modal.innerHTML = `
      <div class="modal-box w-11/12 max-w-2xl font-sans">
        <form method="dialog">
          <button class="btn btn-sm btn-circle btn-ghost absolute right-3 top-3">✕</button>
        </form>
        <h3 class="font-bold text-base mb-4">Στοιχεία ΦΕΚ</h3>

        <div class="grid grid-cols-3 gap-3 mb-3">
          <div class="form-control">
            <label class="label pb-1"><span class="label-text text-xs font-semibold uppercase tracking-wide text-base-content/50">Τεύχος</span></label>
            <select class="select select-bordered select-sm w-full" name="teuchos">
              <option value="">—</option>
              ${TEUCHOS_OPTIONS.map(t => `<option value="${t}" ${meta.teuchos === t ? 'selected' : ''}>${t}</option>`).join('')}
            </select>
          </div>
          <div class="form-control">
            <label class="label pb-1"><span class="label-text text-xs font-semibold uppercase tracking-wide text-base-content/50">Αρ. Φύλλου</span></label>
            <input type="number" min="1" step="1" class="input input-bordered input-sm w-full" name="arithmos"
              value="${meta.arithmos}" placeholder="π.χ. 1234">
          </div>
          <div class="form-control">
            <label class="label pb-1"><span class="label-text text-xs font-semibold uppercase tracking-wide text-base-content/50">Ημερομηνία</span></label>
            <input type="date" class="input input-bordered input-sm w-full" name="hmeromhnia"
              value="${greekDateToIso(meta.hmeromhnia)}">
          </div>
        </div>

        <div class="form-control mb-3">
          <label class="label pb-1"><span class="label-text text-xs font-semibold uppercase tracking-wide text-base-content/50">Τίτλος νόμου / πράξης</span></label>
          <input type="text" class="input input-bordered input-sm w-full" name="titlos"
            value="${meta.titlos}" placeholder="π.χ. ΝΟΜΟΣ ΥΠ' ΑΡΙΘΜ. 5123 — Τίτλος νόμου">
        </div>

        <div class="form-control mb-5">
          <label class="label cursor-pointer justify-start gap-3 pb-1">
            <input type="checkbox" name="twoColumn" class="checkbox checkbox-sm" ${meta.twoColumn ? 'checked' : ''}>
            <span class="label-text text-xs font-semibold uppercase tracking-wide text-base-content/50">Δίστηλη διάταξη (two-column)</span>
          </label>
        </div>

        <div class="nb-fek-preview-wrap">
          <div class="nb-fek-preview-label">Προεπισκόπηση επικεφαλίδας</div>
          <div id="nb-fek-live-preview" class="nb-fek-preview-body">
            <span class="nb-fek-preview-empty">Συμπληρώστε τα παραπάνω πεδία για προεπισκόπηση</span>
          </div>
        </div>

        <div class="modal-action mt-4">
          <form method="dialog"><button class="btn btn-ghost btn-sm">Άκυρο</button></form>
          <button type="button" id="nb-fek-meta-clear" class="btn btn-ghost btn-sm text-error">Εκκαθάριση</button>
          <button type="button" id="nb-fek-meta-save" class="btn btn-primary btn-sm">Αποθήκευση</button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button>close</button></form>
    `;

    modal.querySelectorAll<HTMLElement>('[name]').forEach(el => {
      el.addEventListener('input', () => updateFekPreview(modal!));
      el.addEventListener('change', () => updateFekPreview(modal!));
    });
    updateFekPreview(modal);

    modal.querySelector('#nb-fek-meta-save')?.addEventListener('click', () => {
      const newMeta = readModalMeta(modal!);
      if (state.currentProject) state.currentProject.fekMeta = newMeta;
      modal!.close();
      triggerAutoSave();
      showSaveStatus('Στοιχεία ΦΕΚ αποθηκεύτηκαν');
    });

    modal.querySelector('#nb-fek-meta-clear')?.addEventListener('click', () => {
      if (state.currentProject) state.currentProject.fekMeta = { ...EMPTY_META };
      modal!.close();
      triggerAutoSave();
      showSaveStatus('Στοιχεία ΦΕΚ διαγράφηκαν');
    });

    modal.showModal();
  });
}
