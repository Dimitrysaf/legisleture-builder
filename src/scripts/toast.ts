import { state } from './state';

function getToastContainer(): HTMLElement {
  if (!state.toastEl) {
    state.toastEl = document.createElement('div');
    state.toastEl.className = 'nb-toast-container';
    document.body.appendChild(state.toastEl);
  }
  return state.toastEl;
}

export function showSaveStatus(msg: string): void {
  const container = getToastContainer();
  const toast = document.createElement('div');

  const variant = msg.startsWith('⚠') ? 'warning'
    : msg.startsWith('↩') || msg.startsWith('↪') ? 'action'
    : 'info';

  toast.className = `nb-toast nb-toast--${variant}`;
  toast.textContent = msg;
  container.appendChild(toast);

  requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('nb-toast--show')));

  setTimeout(() => {
    toast.classList.remove('nb-toast--show');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  }, 4000);
}
