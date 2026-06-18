import { state } from './state';
import { pushSnapshot } from '../utils/history';

export interface DropCallbacks {
  captureSnapshot: () => string;
  renumber: () => void;
  autoSave: () => void;
}

const dropLine = (() => {
  const el = document.createElement('div');
  el.className = 'nb-drop-indicator';
  document.body.appendChild(el);
  return el;
})();

function showDropLine(rect: DOMRect, atBottom: boolean): void {
  const y = atBottom ? rect.bottom + 2 : rect.top - 2;
  Object.assign(dropLine.style, {
    display: 'block',
    top: `${y}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
  });
}

function hideDropLine(): void {
  dropLine.style.display = 'none';
  state.pendingDrop = null;
}

function computeDrop(
  e: DragEvent,
  container: HTMLElement,
): { before: HTMLElement | null; ref: DOMRect | null; atBottom: boolean } {
  const siblings = Array.from(container.children).filter(
    (c): c is HTMLElement =>
      (c as HTMLElement).classList.contains('nb-block-wrapper') && c !== state.dragSrc,
  );

  for (const s of siblings) {
    const rect = s.getBoundingClientRect();
    if (e.clientY < rect.top + rect.height / 2) {
      return { before: s, ref: rect, atBottom: false };
    }
  }

  const last = siblings[siblings.length - 1];
  if (last) return { before: null, ref: last.getBoundingClientRect(), atBottom: true };

  return { before: null, ref: container.getBoundingClientRect(), atBottom: false };
}

export function setupDrag(wrapper: HTMLElement): void {
  wrapper.addEventListener('dragstart', (e) => {
    if (state.currentMode !== 'edit') { e.preventDefault(); return; }
    state.dragSrc = wrapper;
    e.dataTransfer!.effectAllowed = 'move';
    requestAnimationFrame(() => wrapper.classList.add('nb-dragging'));
  });

  wrapper.addEventListener('dragend', () => {
    wrapper.classList.remove('nb-dragging');
    hideDropLine();
    state.dragSrc = null;
  });
}

export function setupDropZone(container: HTMLElement, cbs: DropCallbacks): void {
  container.addEventListener('dragover', (e) => {
    if (!state.dragSrc || state.dragSrc.parentElement !== container) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer!.dropEffect = 'move';

    const { before, ref, atBottom } = computeDrop(e, container);
    state.pendingDrop = { before, parent: container };
    if (ref) showDropLine(ref, atBottom);
  });

  container.addEventListener('dragleave', (e) => {
    if (!container.contains(e.relatedTarget as Node)) hideDropLine();
  });

  container.addEventListener('drop', (e) => {
    if (!state.dragSrc || !state.pendingDrop || state.dragSrc.parentElement !== container) return;
    e.preventDefault();
    e.stopPropagation();

    pushSnapshot(cbs.captureSnapshot());
    const { before, parent } = state.pendingDrop;
    if (before) parent.insertBefore(state.dragSrc, before);
    else parent.appendChild(state.dragSrc);

    hideDropLine();
    cbs.renumber();
    cbs.autoSave();
  });
}
