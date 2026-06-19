let dlg: HTMLDialogElement | null = null;

function getDialog(): HTMLDialogElement {
  if (!dlg) {
    dlg = document.createElement('dialog');
    dlg.className = 'modal';
    dlg.innerHTML = `
      <div class="modal-box max-w-sm font-sans">
        <p id="nb-confirm-msg" class="text-sm text-base-content mb-5"></p>
        <div class="modal-action mt-0">
          <form method="dialog">
            <button class="btn btn-ghost btn-sm">Άκυρο</button>
          </form>
          <button type="button" id="nb-confirm-ok" class="btn btn-error btn-sm">Διαγραφή</button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button>close</button></form>
    `;
    document.body.appendChild(dlg);
  }
  return dlg;
}

export function showConfirm(message: string, onConfirm: () => void): void {
  const dialog = getDialog();
  dialog.querySelector<HTMLElement>('#nb-confirm-msg')!.textContent = message;

  const okBtn = dialog.querySelector<HTMLButtonElement>('#nb-confirm-ok')!;
  const fresh = okBtn.cloneNode(true) as HTMLButtonElement;
  okBtn.replaceWith(fresh);
  fresh.addEventListener('click', () => {
    dialog.close();
    onConfirm();
  });

  dialog.showModal();
}
