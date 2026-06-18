import type { AppMode } from './state';
import { state } from './state';
import { generateLatex } from '../utils/latex';
import { buildDocHtml } from '../utils/fileOps';
import { loadFekMeta, hasFekMeta, buildFekHeaderHtml } from '../utils/fekMeta';

export function buildPreviewPages(): HTMLElement {
  const fekMeta = loadFekMeta();
  const PADDING_V = (hasFekMeta(fekMeta) ? 20 : 40) + 56;

  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;top:0;left:0;height:297mm;visibility:hidden;pointer-events:none;';
  document.body.appendChild(probe);
  const a4Px = probe.getBoundingClientRect().height;
  document.body.removeChild(probe);
  const maxContentH = a4Px - PADDING_V;

  const measurer = document.createElement('div');
  measurer.className = 'nb-paper';
  measurer.style.cssText =
    'position:fixed;top:0;left:-9999px;visibility:hidden;pointer-events:none;min-height:0;overflow:visible;';
  document.body.appendChild(measurer);

  const topWrappers = Array.from(
    state.paper.querySelectorAll<HTMLElement>(':scope > .nb-block-wrapper'),
  );
  const groups: HTMLElement[][] = [[]];
  for (const w of topWrappers) {
    const inst = state.instances.get(w.dataset.instanceId ?? '');
    if (inst?.templateId === 'pagebreak') {
      groups.push([]);
    } else {
      groups[groups.length - 1].push(w);
    }
  }

  const pagesEl = document.createElement('div');
  pagesEl.className = 'nb-preview-pages';

  function newPage(): HTMLElement {
    const p = document.createElement('div');
    p.className = 'nb-paper nb-preview-page-item';
    pagesEl.appendChild(p);
    return p;
  }

  let firstPageInjected = false;
  function injectFekHeaderIfNeeded(page: HTMLElement): void {
    if (firstPageInjected || !hasFekMeta(fekMeta)) return;
    firstPageInjected = true;
    const headerHtml = buildFekHeaderHtml(fekMeta, '/Coat_of_arms_of_Greece.svg');
    const headerWrapper = document.createElement('div');
    headerWrapper.innerHTML = headerHtml;
    page.insertBefore(headerWrapper.firstElementChild!, page.firstChild);
  }

  for (const group of groups) {
    let pageEl = newPage();
    injectFekHeaderIfNeeded(pageEl);
    let pageH = 0;

    for (const wrapper of group) {
      const clone = wrapper.cloneNode(true) as HTMLElement;
      clone.querySelector('.nb-block-actions')?.remove();

      measurer.appendChild(clone);
      const cs = window.getComputedStyle(clone);
      const blockH =
        clone.getBoundingClientRect().height +
        parseFloat(cs.marginTop || '0') +
        parseFloat(cs.marginBottom || '0');
      measurer.removeChild(clone);

      if (pageH > 0 && pageH + blockH > maxContentH) {
        pageEl = newPage();
        pageH = 0;
      }

      pageEl.appendChild(clone);
      pageH += blockH;
    }
  }

  document.body.removeChild(measurer);

  if (pagesEl.children.length === 0) newPage();

  return pagesEl;
}

export function refreshPreviewPane(): void {
  const pane = document.getElementById('nb-preview-pane');
  if (!pane) return;
  let iframe = pane.querySelector<HTMLIFrameElement>('iframe');
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.className = 'nb-preview-iframe';
    pane.appendChild(iframe);
  }
  const meta = loadFekMeta();
  iframe.srcdoc = buildDocHtml(state.paper, hasFekMeta(meta) ? meta : null);
  iframe.onload = () => {
    const body = (iframe as HTMLIFrameElement).contentDocument?.body;
    if (body) (iframe as HTMLIFrameElement).style.height = body.scrollHeight + 40 + 'px';
  };
}

export function applyModes(modes: AppMode[]): void {
  state.activeModes = modes;
  const isSplit = modes.length === 2;
  const hasEdit    = modes.includes('edit');
  const hasPreview = modes.includes('preview');
  const hasCode    = modes.includes('code');

  state.currentMode = hasEdit ? 'edit' : hasPreview ? 'preview' : 'code';
  document.body.dataset.nbMode = state.currentMode;
  document.body.classList.toggle('nb-split', isSplit);

  document.querySelectorAll<HTMLButtonElement>('.nb-mode-tab').forEach(tab => {
    const m = tab.dataset.mode as AppMode;
    const isActive   = modes.includes(m);
    const isDisabled = isSplit && !isActive;
    tab.classList.toggle('nb-mode-tab--active',   isActive);
    tab.classList.toggle('nb-mode-tab--disabled', isDisabled);
    tab.disabled = isDisabled;
  });

  const canvas      = document.getElementById('nb-canvas');
  const previewPane = document.getElementById('nb-preview-pane');
  const codePanel   = document.getElementById('nb-code-panel');

  if (canvas)      canvas.style.display      = hasEdit    ? ''     : 'none';
  if (previewPane) previewPane.style.display  = hasPreview ? 'flex' : 'none';
  if (codePanel)   codePanel.style.display    = hasCode    ? ''     : 'none';

  if (hasPreview) refreshPreviewPane();

  if (hasCode) {
    const codeEl = document.getElementById('nb-code-content');
    if (codeEl) codeEl.textContent = generateLatex(state.paper, state.instances);
  }
}

export function initModeTabs(): void {
  document.querySelectorAll<HTMLButtonElement>('.nb-mode-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const mode = tab.dataset.mode as AppMode;
      if (!mode) return;

      if (state.activeModes.includes(mode)) {
        if (state.activeModes.length > 1) {
          applyModes(state.activeModes.filter(m => m !== mode));
        }
      } else {
        const next = state.activeModes.length < 2
          ? [...state.activeModes, mode]
          : [state.activeModes[0], mode];
        applyModes(next as AppMode[]);
      }
    });
  });

  document.getElementById('nb-code-copy')?.addEventListener('click', (e) => {
    const content = document.getElementById('nb-code-content')?.textContent ?? '';
    navigator.clipboard.writeText(content).then(() => {
      const btn = e.currentTarget as HTMLButtonElement;
      const orig = btn.innerHTML;
      btn.textContent = 'Αντιγράφηκε!';
      setTimeout(() => { btn.innerHTML = orig; }, 1500);
    });
  });

  document.getElementById('nb-code-download')?.addEventListener('click', () => {
    const content = document.getElementById('nb-code-content')?.textContent ?? '';
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nomos.tex';
    a.click();
    URL.revokeObjectURL(url);
  });
}
