/**
 * Floating rich-text formatting toolbar.
 * Appears above whichever .nb-fe-rich field currently has focus.
 * Uses mousedown + preventDefault to keep focus in the contenteditable
 * while clicking toolbar buttons.
 */

import { openRefPickerModal } from './RefPickerModal';

let _toolbar: HTMLElement | null = null;
let _activeRich: HTMLElement | null = null;
let _savedRange: Range | null = null;
let _hideTimer: ReturnType<typeof setTimeout> | null = null;

const TOOLBAR_H = 40;

function svg(d: string, w = 13, h = 13): string {
  return `<svg width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
}

export function initRichToolbar(): void {
  if (_toolbar) return;

  _toolbar = document.createElement('div');
  _toolbar.className = 'nb-rich-toolbar';
  _toolbar.setAttribute('hidden', '');
  _toolbar.innerHTML = `
    <button type="button" class="nb-rich-tb-btn" data-cmd="bold" title="Έντονα (Ctrl+B)">
      ${svg('<path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>')}
    </button>
    <button type="button" class="nb-rich-tb-btn" data-cmd="italic" title="Πλάγια (Ctrl+I)">
      ${svg('<line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/>')}
    </button>
    <button type="button" class="nb-rich-tb-btn" data-cmd="underline" title="Υπογράμμιση (Ctrl+U)">
      ${svg('<path d="M6 4v6a6 6 0 0 0 12 0V4"/><line x1="4" y1="20" x2="20" y2="20"/>')}
    </button>
    <div class="nb-rich-tb-sep"></div>
    <button type="button" class="nb-rich-tb-btn" data-cmd="superscript" title="Εκθέτης">
      ${svg('<path d="M4 19l8-8"/><path d="M12 19L4 11"/><path d="M20 12h-4c0-1.5.44-2 1.5-2.5S20 8.33 20 7a2 2 0 0 0-2-2 2 2 0 0 0-2 2"/>')}
    </button>
    <button type="button" class="nb-rich-tb-btn" data-cmd="subscript" title="Δείκτης">
      ${svg('<path d="M4 5l8 8"/><path d="M12 5L4 13"/><path d="M20 21h-4c0-1.5.44-2 1.5-2.5S20 17.33 20 16a2 2 0 0 0-2-2 2 2 0 0 0-2 2"/>')}
    </button>
    <div class="nb-rich-tb-sep"></div>
    <button type="button" class="nb-rich-tb-btn nb-rich-tb-btn--clear" id="nb-rich-clear-btn" title="Αφαίρεση μορφοποίησης">
      ${svg('<path d="M20 20H7L3 16l10-10 7 7-2 3z"/><path d="M6 10l8 8"/>', 13, 13)}
    </button>
    <div class="nb-rich-tb-sep"></div>
    <button type="button" class="nb-rich-tb-btn nb-rich-tb-btn--ref" id="nb-rich-ref-btn" title="Εισαγωγή παραπομπής">
      ${svg('<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>')}
      Παραπομπή
    </button>
  `;
  document.body.appendChild(_toolbar);

  // Formatting buttons — mousedown prevents blur on contenteditable
  _toolbar.addEventListener('mousedown', (e) => {
    const btn = (e.target as Element).closest<HTMLButtonElement>('[data-cmd]');
    if (!btn) return;
    e.preventDefault();
    _execCmd(btn.dataset.cmd!);
    _updateActiveStates();
  });

  // Clear formatting button
  _toolbar.querySelector('#nb-rich-clear-btn')?.addEventListener('mousedown', (e) => {
    e.preventDefault();
    _clearFormat();
  });

  // Reference insert button — capture rich element and range NOW, before the
  // modal's showModal() steals focus and clears _activeRich via the blur timer.
  _toolbar.querySelector('#nb-rich-ref-btn')?.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const rich = _activeRich;
    if (!rich) return;
    _saveRange();
    const savedRange = _savedRange;
    openRefPickerModal((html) => {
      rich.focus();
      const sel = window.getSelection();
      if (sel && savedRange) {
        sel.removeAllRanges();
        sel.addRange(savedRange);
      }
      document.execCommand('insertHTML', false, html);
      rich.dispatchEvent(new Event('blur', { bubbles: true }));
      rich.focus();
    });
  });

  // Reposition when form pane scrolls
  document.getElementById('nb-form-pane')?.addEventListener('scroll', () => {
    if (_activeRich && !_toolbar?.hasAttribute('hidden')) {
      _reposition(_activeRich);
    }
  }, { passive: true });
}

export function attachRichToolbar(richEl: HTMLElement): void {
  richEl.addEventListener('focus', () => {
    _activeRich = richEl;
    if (_hideTimer) { clearTimeout(_hideTimer); _hideTimer = null; }
    _reposition(richEl);
    _toolbar?.removeAttribute('hidden');
    _updateActiveStates();
  });

  richEl.addEventListener('blur', () => {
    _hideTimer = setTimeout(() => {
      _toolbar?.setAttribute('hidden', '');
      _activeRich = null;
    }, 200);
  });

  richEl.addEventListener('keyup', _updateActiveStates);
  richEl.addEventListener('mouseup', _updateActiveStates);
}

function _reposition(el: HTMLElement): void {
  if (!_toolbar) return;
  const rect = el.getBoundingClientRect();
  let top = rect.top - TOOLBAR_H - 6;
  if (top < 58) top = rect.bottom + 4;
  const left = Math.max(8, Math.min(rect.left, window.innerWidth - 340));
  _toolbar.style.top = top + 'px';
  _toolbar.style.left = left + 'px';
}

function _saveRange(): void {
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) {
    _savedRange = sel.getRangeAt(0).cloneRange();
  }
}

// execCommand wrapper that reliably toggles superscript/subscript off.
// When the cursor is collapsed inside a <sup>/<sub>, execCommand alone
// won't toggle it off — we first expand the selection to the whole element.
function _execCmd(cmd: string): void {
  if ((cmd === 'superscript' || cmd === 'subscript') && document.queryCommandState(cmd)) {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && sel.isCollapsed) {
      const tag = cmd === 'superscript' ? 'sup' : 'sub';
      let node: Node | null = sel.getRangeAt(0).startContainer;
      if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
      const ancestor = (node as Element)?.closest?.(tag);
      if (ancestor) {
        const range = document.createRange();
        range.selectNodeContents(ancestor);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
  }
  document.execCommand(cmd);
}

// Remove all inline formatting from the current selection.
// removeFormat handles b/i/u/s; we manually unwrap <sup>/<sub> afterwards
// because browsers don't include them in removeFormat.
function _clearFormat(): void {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;

  if (sel.isCollapsed) {
    // Cursor only — unwrap the enclosing <sup>/<sub> if any, then removeFormat
    let node: Node | null = sel.getRangeAt(0).startContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
    for (const tag of ['sup', 'sub'] as const) {
      const ancestor = (node as Element)?.closest?.(tag);
      if (ancestor) {
        const r = document.createRange();
        r.selectNodeContents(ancestor);
        sel.removeAllRanges();
        sel.addRange(r);
        document.execCommand(tag === 'sup' ? 'superscript' : 'subscript');
        break;
      }
    }
    document.execCommand('removeFormat');
    _updateActiveStates();
    return;
  }

  // Selection exists — removeFormat first (b/i/u/s)
  document.execCommand('removeFormat');

  // Then unwrap any <sup>/<sub> that overlap the (now-updated) selection
  if (sel.rangeCount === 0) { _updateActiveStates(); return; }
  const freshRange = sel.getRangeAt(0);
  const root = freshRange.commonAncestorContainer;
  const container = (root.nodeType === Node.TEXT_NODE ? root.parentElement : root) as Element;
  if (!container) { _updateActiveStates(); return; }

  for (const tag of ['sup', 'sub']) {
    Array.from(container.querySelectorAll(tag)).forEach(el => {
      if (!freshRange.intersectsNode(el)) return;
      const parent = el.parentNode!;
      while (el.firstChild) parent.insertBefore(el.firstChild, el);
      parent.removeChild(el);
    });
  }

  _updateActiveStates();
}

function _updateActiveStates(): void {
  if (!_toolbar) return;
  for (const cmd of ['bold', 'italic', 'underline', 'superscript', 'subscript']) {
    const btn = _toolbar.querySelector<HTMLElement>(`[data-cmd="${cmd}"]`);
    btn?.classList.toggle('nb-rich-tb-btn--active', document.queryCommandState(cmd));
  }
}
