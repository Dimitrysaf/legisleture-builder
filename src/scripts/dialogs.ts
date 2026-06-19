import { escHtml } from '../utils/escape';

let _alertDlg: HTMLDialogElement | null = null;

export function showAlert(message: string, title = 'Σφάλμα'): void {
  if (!_alertDlg) {
    const dlg = document.createElement('dialog');
    dlg.id = 'nb-alert-modal';
    dlg.className = 'modal';
    dlg.innerHTML = `
      <div class="modal-box max-w-sm font-sans">
        <form method="dialog">
          <button class="btn btn-sm btn-circle btn-ghost absolute right-3 top-3">✕</button>
        </form>
        <h3 id="nb-alert-title" class="font-bold text-base mb-3"></h3>
        <div id="nb-alert-msg" class="text-sm leading-relaxed mb-4"></div>
        <div class="flex justify-end">
          <form method="dialog">
            <button class="btn btn-sm btn-primary">Εντάξει</button>
          </form>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button>close</button></form>`;
    document.body.appendChild(dlg);
    _alertDlg = dlg;
  }

  _alertDlg.querySelector<HTMLElement>('#nb-alert-title')!.textContent = title;
  _alertDlg.querySelector<HTMLElement>('#nb-alert-msg')!.innerHTML =
    escHtml(message).replace(/\n/g, '<br>');
  _alertDlg.showModal();
}

let _confirmDlg: HTMLDialogElement | null = null;
let _confirmResolve: ((v: boolean) => void) | null = null;

export function showConfirm(
  message: string,
  title = 'Επιβεβαίωση',
  confirmLabel = 'Επιβεβαίωση',
): Promise<boolean> {
  return new Promise(resolve => {
    if (!_confirmDlg) {
      const dlg = document.createElement('dialog');
      dlg.id = 'nb-confirm-modal';
      dlg.className = 'modal';
      dlg.innerHTML = `
        <div class="modal-box max-w-sm font-sans">
          <h3 id="nb-confirm-title" class="font-bold text-base mb-3"></h3>
          <div id="nb-confirm-msg" class="text-sm leading-relaxed mb-5"></div>
          <div class="flex justify-end gap-2">
            <button id="nb-confirm-cancel" class="btn btn-ghost btn-sm">Ακύρωση</button>
            <button id="nb-confirm-ok" class="btn btn-error btn-sm"></button>
          </div>
        </div>
        <form method="dialog" class="modal-backdrop"><button>close</button></form>`;
      document.body.appendChild(dlg);

      dlg.querySelector('#nb-confirm-cancel')!.addEventListener('click', () => {
        _confirmResolve?.(false);
        _confirmResolve = null;
        dlg.close();
      });
      dlg.querySelector('#nb-confirm-ok')!.addEventListener('click', () => {
        _confirmResolve?.(true);
        _confirmResolve = null;
        dlg.close();
      });
      // Backdrop or ESC closes the dialog without a button click
      dlg.addEventListener('close', () => {
        _confirmResolve?.(false);
        _confirmResolve = null;
      });

      _confirmDlg = dlg;
    }

    _confirmResolve = resolve;
    _confirmDlg.querySelector<HTMLElement>('#nb-confirm-title')!.textContent = title;
    _confirmDlg.querySelector<HTMLElement>('#nb-confirm-msg')!.innerHTML =
      escHtml(message).replace(/\n/g, '<br>');
    _confirmDlg.querySelector<HTMLElement>('#nb-confirm-ok')!.textContent = confirmLabel;
    _confirmDlg.showModal();
  });
}
