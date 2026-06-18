import { state } from '../state';
import { showSaveStatus } from '../toast';
import { loadFromSaveFile } from '../blocks';
import { serializeDocument, isSaveFile } from '../../utils/fileOps';
import { listSlots, saveSlot, loadSlot, deleteSlot, slotTimestamp } from '../../utils/saveSlots';

export function initSlotsModal(): void {
  const btn = document.getElementById('nb-slots-btn');
  if (!btn) return;
  let modal: HTMLDialogElement | null = null;

  function renderSlotList(modal: HTMLDialogElement): void {
    const list = modal.querySelector<HTMLElement>('#nb-slots-list');
    if (!list) return;
    const slots = listSlots();
    if (slots.length === 0) {
      list.innerHTML = '<p class="text-sm text-base-content/50 text-center py-3">Δεν υπάρχουν αποθηκευμένες συνεδρίες.</p>';
      return;
    }
    list.innerHTML = slots.map(name => `
      <div class="nb-slot-row" data-slot="${name}">
        <div class="nb-slot-info">
          <span class="nb-slot-name">${name}</span>
          <span class="nb-slot-time">${slotTimestamp(name)}</span>
        </div>
        <div class="nb-slot-actions">
          <button type="button" class="btn btn-xs btn-ghost" data-slot-load="${name}">Φόρτωση</button>
          <button type="button" class="btn btn-xs btn-ghost text-error" data-slot-delete="${name}">✕</button>
        </div>
      </div>`).join('');

    list.querySelectorAll<HTMLButtonElement>('[data-slot-load]').forEach(b => {
      b.addEventListener('click', () => {
        const sf = loadSlot(b.dataset.slotLoad!);
        if (!sf || !isSaveFile(sf)) return;
        loadFromSaveFile(sf);
        modal.close();
        showSaveStatus(`Φορτώθηκε: ${b.dataset.slotLoad}`);
      });
    });
    list.querySelectorAll<HTMLButtonElement>('[data-slot-delete]').forEach(b => {
      b.addEventListener('click', () => {
        deleteSlot(b.dataset.slotDelete!);
        renderSlotList(modal);
      });
    });
  }

  btn.addEventListener('click', () => {
    if (!modal) {
      modal = document.createElement('dialog');
      modal.className = 'modal';
      document.body.appendChild(modal);
    }
    modal.innerHTML = `
      <div class="modal-box w-11/12 max-w-lg font-sans">
        <form method="dialog">
          <button class="btn btn-sm btn-circle btn-ghost absolute right-3 top-3">✕</button>
        </form>
        <h3 class="font-bold text-base mb-4">Αποθηκευμένες Συνεδρίες</h3>
        <div class="flex gap-2 mb-4">
          <input type="text" id="nb-slot-name-input" class="input input-bordered input-sm flex-1"
            placeholder="Όνομα αποθήκευσης…" maxlength="60">
          <button type="button" id="nb-slot-save-btn" class="btn btn-primary btn-sm">Αποθήκευση</button>
        </div>
        <div id="nb-slots-list" class="flex flex-col gap-1 max-h-64 overflow-y-auto"></div>
        <div class="modal-action mt-4">
          <form method="dialog"><button class="btn btn-ghost btn-sm">Κλείσιμο</button></form>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button>close</button></form>`;

    renderSlotList(modal);

    modal.querySelector('#nb-slot-save-btn')?.addEventListener('click', () => {
      const inp = modal!.querySelector<HTMLInputElement>('#nb-slot-name-input');
      const name = inp?.value.trim();
      if (!name) { inp?.focus(); return; }
      saveSlot(name, serializeDocument(state.paper, state.instances));
      if (inp) inp.value = '';
      renderSlotList(modal!);
      showSaveStatus(`Αποθηκεύτηκε: ${name}`);
    });

    modal.querySelector<HTMLInputElement>('#nb-slot-name-input')
      ?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') modal!.querySelector<HTMLButtonElement>('#nb-slot-save-btn')?.click();
      });

    modal.showModal();
  });
}
