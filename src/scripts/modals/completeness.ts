import { state } from '../state';
import { escHtml } from '../../utils/escape';
import { checkDocument } from '../../utils/completeness';

const SEVERITY_ICON: Record<string, string> = {
  error:   '✕',
  warning: '⚠',
  info:    'ℹ',
};

const SEVERITY_CLASS: Record<string, string> = {
  error:   'nb-comp-error',
  warning: 'nb-comp-warning',
  info:    'nb-comp-info',
};

export function initCompletenessModal(): void {
  const btn = document.getElementById('nb-completeness-btn');
  if (!btn) return;

  let modal: HTMLDialogElement | null = null;

  btn.addEventListener('click', () => {
    if (!modal) {
      modal = document.createElement('dialog');
      modal.className = 'modal';
      document.body.appendChild(modal);
    }

    const issues = checkDocument(state.paper, state.instances);

    const rows = issues.length === 0
      ? '<p class="text-sm text-success text-center py-4">Δεν εντοπίστηκαν προβλήματα.</p>'
      : issues.map(iss => `
          <div class="nb-comp-row ${SEVERITY_CLASS[iss.severity]}">
            <span class="nb-comp-icon">${SEVERITY_ICON[iss.severity]}</span>
            <span class="nb-comp-msg">${escHtml(iss.message)}</span>
            ${iss.instanceId
              ? `<button type="button" class="btn btn-ghost btn-xs nb-comp-goto" data-target="${iss.instanceId}">Μετάβαση</button>`
              : ''}
          </div>`).join('');

    modal.innerHTML = `
      <div class="modal-box w-11/12 max-w-lg font-sans">
        <form method="dialog">
          <button class="btn btn-sm btn-circle btn-ghost absolute right-3 top-3">✕</button>
        </form>
        <h3 class="font-bold text-base mb-1">Πληρότητα Εγγράφου</h3>
        <p class="text-xs text-base-content/50 mb-4">
          ${issues.length === 0 ? 'Το έγγραφο πληροί τις βασικές απαιτήσεις ΦΕΚ.' : `${issues.length} θέμα${issues.length !== 1 ? 'τα' : ''} εντοπίστηκε.`}
        </p>
        <div class="flex flex-col gap-1 max-h-80 overflow-y-auto">${rows}</div>
        <div class="modal-action mt-4">
          <form method="dialog"><button class="btn btn-ghost btn-sm">Κλείσιμο</button></form>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button>close</button></form>`;

    modal.querySelectorAll<HTMLButtonElement>('.nb-comp-goto').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = document.querySelector<HTMLElement>(`[data-instance-id="${btn.dataset.target}"]`);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          target.classList.add('nb-highlight');
          setTimeout(() => target.classList.remove('nb-highlight'), 1500);
        }
        modal!.close();
      });
    });

    modal.showModal();
  });
}

