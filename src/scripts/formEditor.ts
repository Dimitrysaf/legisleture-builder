/**
 * Guided form editor — renders the document as structured form cards.
 * The paper canvas remains the backing store; this view reads from it and
 * writes back via patchBlock(). Preview / export / autosave all continue
 * to use the paper DOM unchanged.
 */

import { state } from './state';
import { getTemplate } from '../templates/registry';
import {
  insertBlock, patchBlock, snapForUndo,
  initContainerZone, captureSnapshot,
} from './blocks';
import { sanitizeHtml } from '../utils/sanitize';
import { renumberDocument, toGreekSubNum, getSubParaDepth } from '../utils/numbering';
import { pushSnapshot } from '../utils/history';
import { openTemplateModal } from '../components/TemplateModal';
import { triggerAutoSave } from './autosave';
import { unregisterEntry } from '../utils/docRegistry';
import { showConfirm } from './confirmModal';
import type { TemplateInstance } from '../templates/types';

// ── Module state ───────────────────────────────────────────────────────────

let paneEl: HTMLElement | null = null;
let openAddDropdown: HTMLElement | null = null;

function closeOpenDropdown(): void {
  if (openAddDropdown) {
    openAddDropdown.setAttribute('hidden', '');
    openAddDropdown = null;
  }
}

// ── Public API ─────────────────────────────────────────────────────────────

export function initFormEditor(pane: HTMLElement): void {
  paneEl = pane;
  document.addEventListener('click', closeOpenDropdown);
  pane.addEventListener('scroll', closeOpenDropdown, { passive: true });
}

export function renderFormDoc(): void {
  if (!paneEl) return;
  closeOpenDropdown();
  paneEl.innerHTML = '';
  const doc = document.createElement('div');
  doc.className = 'nb-fe-doc';

  appendAddBar(doc, state.paper, 'start');
  renderZoneCards(state.paper, doc);
  appendAddBar(doc, state.paper, null);

  paneEl.appendChild(doc);
  validateAll();
}

/** Flush any focused rich-text field before switching modes. */
export function flushFormEdits(): void {
  if (!paneEl) return;
  const focused = paneEl.querySelector<HTMLElement>('[contenteditable]:focus');
  if (focused) (focused as HTMLElement).blur();
}

// ── Card rendering ─────────────────────────────────────────────────────────

function renderZoneCards(
  containerEl: HTMLElement,
  targetEl: HTMLElement,
  adds: AddEntry[] = TOP_LEVEL_ADDS,
): void {
  for (const child of Array.from(containerEl.children)) {
    const wrapper = child as HTMLElement;
    if (!wrapper.classList.contains('nb-block-wrapper')) continue;
    const id = wrapper.dataset.instanceId;
    if (!id) continue;
    const inst = state.instances.get(id);
    if (!inst) continue;
    targetEl.appendChild(renderCard(wrapper, inst));
    appendAddBar(targetEl, containerEl, wrapper, adds);
  }
}

function renderCard(wrapper: HTMLElement, inst: TemplateInstance): HTMLElement {
  switch (inst.templateId) {
    case 'article':
    case 'transitional': return renderArticleCard(wrapper, inst);
    case 'final-article': return renderFinalArticleCard(wrapper, inst);
    case 'preamble':     return renderPreambleCard(wrapper, inst);
    case 'closing':      return renderClosingCard(wrapper, inst);
    case 'part':         return renderStructuralCard(wrapper, inst, 'sections');
    case 'section':      return renderStructuralCard(wrapper, inst, 'chapters');
    case 'chapter':      return renderStructuralCard(wrapper, inst, 'articles');
    case 'annex':        return renderStructuralCard(wrapper, inst, 'body');
    case 'amendment':    return renderAmendmentCard(wrapper, inst);
    default:             return renderGenericCard(wrapper, inst);
  }
}

// ── Article card ───────────────────────────────────────────────────────────

function renderArticleCard(wrapper: HTMLElement, inst: TemplateInstance): HTMLElement {
  const label = inst.templateId === 'transitional'
    ? 'ΜΕΤΑΒΑΤΙΚΗ ΔΙΑΤΑΞΗ'
    : inst.templateId === 'final-article'
      ? 'ΤΕΛΙΚΟ ΑΡΘΡΟ'
      : 'ΑΡΘΡΟ';

  const card = el('div', 'nb-fe-card nb-fe-card--article');
  card.dataset.iid = inst.id;

  // Header
  const head = el('div', 'nb-fe-card-head');
  const labelEl = el('span', 'nb-fe-card-label');
  labelEl.textContent = label + ' ' + (inst.data.number ?? '');
  labelEl.dataset.numFor = inst.id;

  const titleIn = el('input', 'nb-fe-title') as HTMLInputElement;
  titleIn.type = 'text';
  titleIn.placeholder = 'Τίτλος άρθρου...';
  titleIn.value = inst.data.title ?? '';
  titleIn.dataset.iid = inst.id;
  titleIn.dataset.field = 'title';

  const delBtn = makeDelBtn(() => deleteTopCard(wrapper));
  head.append(labelEl, titleIn, makeCardMoveBtn('up', wrapper), makeCardMoveBtn('down', wrapper), delBtn);
  card.appendChild(head);

  // Body zone (paragraphs + content)
  const bodyZoneEl = wrapper.querySelector<HTMLElement>('.nb-container-zone[data-container-for="body"]');
  if (bodyZoneEl) {
    const bodyDiv = el('div', 'nb-fe-body');
    bodyDiv.dataset.zoneEl = inst.id;
    renderParaZone(bodyZoneEl, bodyDiv, inst.id);
    card.appendChild(bodyDiv);
    card.appendChild(makeBodyAddRow(bodyZoneEl, bodyDiv, inst.id));
  }

  wireFieldInputs(card);
  return card;
}

// ── Final-article card (no number, fixed title) ────────────────────────────

function renderFinalArticleCard(wrapper: HTMLElement, inst: TemplateInstance): HTMLElement {
  const card = el('div', 'nb-fe-card nb-fe-card--article');
  card.dataset.iid = inst.id;

  const head = el('div', 'nb-fe-card-head');
  const labelEl = el('span', 'nb-fe-card-label');
  labelEl.textContent = 'ΕΝΑΡΞΗ ΙΣΧΥΟΣ';
  head.append(labelEl, makeCardMoveBtn('up', wrapper), makeCardMoveBtn('down', wrapper), makeDelBtn(() => deleteTopCard(wrapper)));
  card.appendChild(head);

  const bodyZoneEl = wrapper.querySelector<HTMLElement>('.nb-container-zone[data-container-for="body"]');
  if (bodyZoneEl) {
    const bodyDiv = el('div', 'nb-fe-body');
    bodyDiv.dataset.zoneEl = inst.id;
    renderParaZone(bodyZoneEl, bodyDiv, inst.id);
    card.appendChild(bodyDiv);
    card.appendChild(makeBodyAddRow(bodyZoneEl, bodyDiv, inst.id));
  }

  wireFieldInputs(card);
  return card;
}

function renderParaZone(zoneEl: HTMLElement, targetEl: HTMLElement, _articleId: string): void {
  for (const child of Array.from(zoneEl.children)) {
    const wrapper = child as HTMLElement;
    if (!wrapper.classList.contains('nb-block-wrapper')) continue;
    const id = wrapper.dataset.instanceId;
    if (!id) continue;
    const inst = state.instances.get(id);
    if (!inst) continue;
    if (inst.templateId === 'paragraph') {
      targetEl.appendChild(renderParaRow(wrapper, inst, zoneEl));
    } else {
      targetEl.appendChild(renderCard(wrapper, inst));
    }
  }
}

function makeBodyAddRow(zoneEl: HTMLElement, bodyDiv: HTMLElement, articleId: string): HTMLElement {
  const row = el('div', 'nb-fe-add-row');

  const addParaBtn = el('button', 'nb-fe-add-child-btn') as HTMLButtonElement;
  addParaBtn.type = 'button';
  addParaBtn.textContent = '+ Παράγραφος';
  addParaBtn.addEventListener('click', () => addParagraph(zoneEl, bodyDiv, articleId));
  row.appendChild(addParaBtn);

  const contentWrap = el('div', 'nb-fe-content-wrap');
  const contentTrigger = el('button', 'nb-fe-content-trigger') as HTMLButtonElement;
  contentTrigger.type = 'button';
  contentTrigger.textContent = '+ Περιεχόμενο';

  const contentDrop = el('div', 'nb-fe-add-dropdown nb-fe-content-drop');
  contentDrop.setAttribute('hidden', '');

  for (const { templateId, label } of CONTENT_ADDS) {
    const tpl = getTemplate(templateId);
    if (!tpl) continue;
    const opt = el('button', 'nb-fe-add-opt') as HTMLButtonElement;
    opt.type = 'button';
    opt.textContent = label;
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      closeOpenDropdown();
      const inst: TemplateInstance = {
        id: `inst_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        templateId,
        data: {},
      };
      insertBlock(tpl.render({}), inst, zoneEl, 'end', { noScroll: true });
      triggerAutoSave();
      const newWrapper = zoneEl.lastElementChild as HTMLElement;
      bodyDiv.appendChild(renderCard(newWrapper, inst));
    });
    contentDrop.appendChild(opt);
  }

  contentTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const wasOpen = !contentDrop.hidden;
    closeOpenDropdown();
    if (!wasOpen) {
      contentDrop.removeAttribute('hidden');
      openAddDropdown = contentDrop;
    }
  });

  contentWrap.append(contentTrigger, contentDrop);
  row.appendChild(contentWrap);
  return row;
}

function renderParaRow(wrapper: HTMLElement, inst: TemplateInstance, zoneEl: HTMLElement): HTMLElement {
  const row = el('div', 'nb-fe-para-row');
  row.dataset.iid = inst.id;

  const num = el('span', 'nb-fe-para-num');
  num.textContent = (inst.data.number ?? '') + '.';
  num.dataset.numFor = inst.id;

  const rich = makeRichField(inst.id, 'content', inst.data.content ?? '');

  const delBtn = makeDelBtn(() => {
    snapForUndo();
    wrapper.remove();
    state.instances.delete(inst.id);
    unregisterEntry(inst.id);
    renumberDocument(state.paper, state.instances);
    triggerAutoSave();
    const parentRow = row.closest<HTMLElement>('.nb-fe-body, .nb-fe-card');
    if (parentRow) {
      const rows = parentRow.querySelectorAll<HTMLElement>('.nb-fe-para-row');
      rows.forEach((r, i) => {
        const n = r.querySelector<HTMLElement>('.nb-fe-para-num');
        if (n) n.textContent = (i + 1) + '.';
      });
    }
    row.remove();
  });

  row.append(num, rich, delBtn);

  // Subparagraphs zone
  const subZoneEl = wrapper.querySelector<HTMLElement>('.nb-container-zone[data-container-for="subparagraphs"]');
  if (subZoneEl) {
    const subDiv = el('div', 'nb-fe-subparas');
    renderSubparaZone(subZoneEl, subDiv);
    const addSubBtn = el('button', 'nb-fe-add-child-btn nb-fe-add-child-btn--sub');
    addSubBtn.type = 'button';
    addSubBtn.textContent = '+ Υποπαράγραφος';
    addSubBtn.addEventListener('click', () => addSubparagraph(subZoneEl, subDiv));
    subDiv.appendChild(addSubBtn);
    row.appendChild(subDiv);
  }

  return row;
}

function renderSubparaZone(zoneEl: HTMLElement, targetEl: HTMLElement): void {
  for (const child of Array.from(zoneEl.children)) {
    const wrapper = child as HTMLElement;
    if (!wrapper.classList.contains('nb-block-wrapper')) continue;
    const id = wrapper.dataset.instanceId;
    if (!id) continue;
    const inst = state.instances.get(id);
    if (!inst || inst.templateId !== 'subparagraph') continue;
    targetEl.insertBefore(renderSubparaRow(wrapper, inst, zoneEl), targetEl.lastElementChild);
  }
}

function renderSubparaRow(wrapper: HTMLElement, inst: TemplateInstance, zoneEl: HTMLElement): HTMLElement {
  const row = el('div', 'nb-fe-subpara-row');
  row.dataset.iid = inst.id;

  const num = el('span', 'nb-fe-subpara-num');
  num.textContent = (inst.data.number ?? '') + ')';
  num.dataset.numFor = inst.id;

  const rich = makeRichField(inst.id, 'content', inst.data.content ?? '');

  const delBtn = makeDelBtn(() => {
    snapForUndo();
    wrapper.remove();
    state.instances.delete(inst.id);
    unregisterEntry(inst.id);
    renumberDocument(state.paper, state.instances);
    triggerAutoSave();
    row.remove();
  });

  row.append(num, rich, delBtn);

  // Nested subparagraphs
  const nestedZone = wrapper.querySelector<HTMLElement>('.nb-container-zone[data-container-for="subparagraphs"]');
  if (nestedZone) {
    const nestedDiv = el('div', 'nb-fe-subparas nb-fe-subparas--nested');
    renderSubparaZone(nestedZone, nestedDiv);
    const addBtn = el('button', 'nb-fe-add-child-btn nb-fe-add-child-btn--sub');
    addBtn.type = 'button';
    addBtn.textContent = '+ Υποπαράγραφος';
    addBtn.addEventListener('click', () => addSubparagraph(nestedZone, nestedDiv));
    nestedDiv.appendChild(addBtn);
    row.appendChild(nestedDiv);
  }

  return row;
}

// ── Preamble card ──────────────────────────────────────────────────────────

function renderPreambleCard(wrapper: HTMLElement, inst: TemplateInstance): HTMLElement {
  const card = el('div', 'nb-fe-card nb-fe-card--preamble');
  card.dataset.iid = inst.id;

  const head = el('div', 'nb-fe-card-head');
  const labelEl = el('span', 'nb-fe-card-label');
  labelEl.textContent = 'ΠΡΟΟΙΜΙΟ';
  head.append(labelEl, makeDelBtn(() => deleteTopCard(wrapper)));
  card.appendChild(head);

  card.appendChild(makeFieldRow('Αρχή εκπροσώπησης', makeTextInput(inst.id, 'authority', inst.data.authority ?? '')));
  card.appendChild(makeFieldRow('Έχοντας υπόψη', makeRichField(inst.id, 'bases', inst.data.bases ?? '')));
  card.appendChild(makeFieldRow('Κατακλείδα', makeTextInput(inst.id, 'conclusion', inst.data.conclusion ?? '')));

  wireFieldInputs(card);
  return card;
}

// ── Closing card ───────────────────────────────────────────────────────────

function renderClosingCard(wrapper: HTMLElement, inst: TemplateInstance): HTMLElement {
  const card = el('div', 'nb-fe-card nb-fe-card--closing');
  card.dataset.iid = inst.id;

  const head = el('div', 'nb-fe-card-head');
  const labelEl = el('span', 'nb-fe-card-label');
  labelEl.textContent = 'ΥΠΟΓΡΑΦΕΣ';
  head.append(labelEl, makeDelBtn(() => deleteTopCard(wrapper)));
  card.appendChild(head);

  card.appendChild(makeFieldRow('Ημερομηνία', makeTextInput(inst.id, 'date', inst.data.date ?? '')));
  card.appendChild(makeFieldRow('Υπογράφοντες', makeRichField(inst.id, 'signatories', inst.data.signatories ?? '')));

  wireFieldInputs(card);
  return card;
}

// ── Structural card (Part / Section / Chapter / Annex) ────────────────────

function renderStructuralCard(wrapper: HTMLElement, inst: TemplateInstance, zoneKey: string): HTMLElement {
  const labels: Record<string, string> = {
    part: 'ΜΕΡΟΣ', section: 'ΤΜΗΜΑ', chapter: 'ΚΕΦΑΛΑΙΟ', annex: 'ΠΑΡΑΡΤΗΜΑ',
  };
  const addLabels: Record<string, string> = {
    sections: '+ Τμήμα', chapters: '+ Κεφάλαιο', articles: '+ Άρθρο', body: '+ Παράγραφος',
  };

  const card = el('div', `nb-fe-card nb-fe-card--structural nb-fe-card--${inst.templateId}`);
  card.dataset.iid = inst.id;

  const head = el('div', 'nb-fe-card-head');
  const labelEl = el('span', 'nb-fe-card-label');
  labelEl.textContent = (labels[inst.templateId] ?? inst.templateId.toUpperCase())
    + (inst.data.number ? ' ' + inst.data.number : '');
  labelEl.dataset.numFor = inst.id;

  const titleIn = makeTextInput(inst.id, 'title', inst.data.title ?? '');
  titleIn.placeholder = 'Τίτλος...';
  (titleIn as HTMLInputElement).classList.add('nb-fe-title');

  head.append(labelEl, titleIn, makeCardMoveBtn('up', wrapper), makeCardMoveBtn('down', wrapper), makeDelBtn(() => deleteTopCard(wrapper)));
  card.appendChild(head);

  // Nested children zone
  const innerZoneEl = wrapper.querySelector<HTMLElement>(`.nb-container-zone[data-container-for="${zoneKey}"]`);
  if (innerZoneEl) {
    const innerDiv = el('div', 'nb-fe-zone-inner');
    if (zoneKey === 'body') {
      renderParaZone(innerZoneEl, innerDiv, inst.id);
      card.appendChild(innerDiv);
      card.appendChild(makeBodyAddRow(innerZoneEl, innerDiv, inst.id));
    } else {
      renderZoneCards(innerZoneEl, innerDiv, CONTENT_ADDS);
      card.appendChild(innerDiv);
      appendAddBar(card, innerZoneEl, null, CONTENT_ADDS);
    }
  }

  wireFieldInputs(card);
  return card;
}

// ── Amendment card ─────────────────────────────────────────────────────────

function renderAmendmentCard(wrapper: HTMLElement, inst: TemplateInstance): HTMLElement {
  const card = el('div', 'nb-fe-card nb-fe-card--amendment');
  card.dataset.iid = inst.id;

  const head = el('div', 'nb-fe-card-head');
  const labelEl = el('span', 'nb-fe-card-label');
  labelEl.textContent = 'ΤΡΟΠΟΠΟΙΗΣΗ';
  head.append(labelEl, makeDelBtn(() => deleteTopCard(wrapper)));
  card.appendChild(head);

  card.appendChild(makeFieldRow('Τροποποιούμενος νόμος', makeTextInput(inst.id, 'targetLawId', inst.data.targetLawId ?? '')));
  card.appendChild(makeFieldRow('Τροποποιούμενη διάταξη', makeTextInput(inst.id, 'targetPath', inst.data.targetPath ?? '')));

  const actionRow = el('div', 'nb-fe-field-row');
  const actionLabel = el('label', 'nb-fe-field-label');
  actionLabel.textContent = 'Είδος';
  const sel = el('select', 'nb-fe-select') as HTMLSelectElement;
  sel.dataset.iid = inst.id;
  sel.dataset.field = 'action';
  [['replace','Αντικατάσταση'],['insert','Προσθήκη'],['repeal','Κατάργηση'],['amend','Τροποποίηση'],['renumber','Αναρίθμηση']].forEach(([v, l]) => {
    const opt = document.createElement('option');
    opt.value = v; opt.textContent = l;
    if (v === (inst.data.action ?? 'replace')) opt.selected = true;
    sel.appendChild(opt);
  });
  sel.addEventListener('change', () => saveField(inst.id, 'action', sel.value));
  actionRow.append(actionLabel, sel);
  card.appendChild(actionRow);

  card.appendChild(makeFieldRow('Νέο κείμενο', makeRichField(inst.id, 'content', inst.data.content ?? '')));

  wireFieldInputs(card);
  return card;
}

// ── Generic fallback ───────────────────────────────────────────────────────

function renderGenericCard(wrapper: HTMLElement, inst: TemplateInstance): HTMLElement {
  const tpl = getTemplate(inst.templateId);
  const card = el('div', 'nb-fe-card nb-fe-card--generic');
  card.dataset.iid = inst.id;

  const head = el('div', 'nb-fe-card-head');
  const labelEl = el('span', 'nb-fe-card-label');
  labelEl.textContent = tpl?.name ?? inst.templateId;

  const editBtn = el('button', 'nb-fe-edit-btn');
  editBtn.type = 'button';
  editBtn.textContent = 'Επεξεργασία';
  editBtn.addEventListener('click', () => {
    if (!tpl) return;
    openTemplateModal(tpl, inst, (html, updated) => {
      const w = document.querySelector<HTMLElement>(`[data-instance-id="${inst.id}"]`);
      if (w) {
        const saved = new Map<string, Node[]>();
        w.querySelectorAll<HTMLElement>('.nb-container-zone').forEach(z => {
          saved.set(z.dataset.containerFor!, Array.from(z.childNodes));
        });
        const actions = w.querySelector<HTMLElement>('.nb-block-actions');
        w.innerHTML = html;
        if (actions) w.appendChild(actions);
        w.querySelectorAll<HTMLElement>('.nb-container-zone').forEach(z => {
          (saved.get(z.dataset.containerFor!) ?? []).forEach(c => z.appendChild(c));
          initContainerZone(z);
        });
        state.instances.set(inst.id, updated);
        triggerAutoSave();
        renderFormDoc();
      }
    });
  });

  head.append(labelEl, editBtn, makeDelBtn(() => deleteTopCard(wrapper)));
  card.appendChild(head);

  // Show a text preview
  if (tpl) {
    const preview = el('div', 'nb-fe-generic-preview');
    const tmp = document.createElement('div');
    tmp.innerHTML = tpl.render(inst.data);
    tmp.querySelectorAll('.nb-block-actions,.nb-container-zone').forEach(e => e.remove());
    preview.textContent = (tmp.textContent ?? '').trim().slice(0, 120) || '—';
    card.appendChild(preview);
  }

  return card;
}

// ── Add bars ───────────────────────────────────────────────────────────────

type AddEntry = { templateId: string; label: string };

const TOP_LEVEL_ADDS: AddEntry[] = [
  { templateId: 'preamble',      label: 'Προοίμιο' },
  { templateId: 'part',          label: 'Μέρος' },
  { templateId: 'chapter',       label: 'Κεφάλαιο' },
  { templateId: 'article',       label: 'Άρθρο' },
  { templateId: 'transitional',  label: 'Μεταβατική Διάταξη' },
  { templateId: 'final-article', label: 'Τελικό Άρθρο' },
  { templateId: 'amendment',     label: 'Τροποποίηση' },
  { templateId: 'annex',         label: 'Παράρτημα' },
  { templateId: 'closing',       label: 'Υπογραφές' },
];

const CONTENT_ADDS: AddEntry[] = [
  { templateId: 'table',         label: 'Πίνακας' },
  { templateId: 'image-block',   label: 'Εικόνα / Γράφημα' },
  { templateId: 'note',          label: 'Σημείωση' },
  { templateId: 'definition',    label: 'Ορισμός' },
  { templateId: 'lawref',        label: 'Παραπομπή Νόμου' },
  { templateId: 'plaintext',     label: 'Απλό Κείμενο' },
  { templateId: 'footnote',      label: 'Υποσημείωση' },
  { templateId: 'interpretive',  label: 'Ερμηνευτική Δήλωση' },
];

function appendAddBar(
  targetEl: HTMLElement,
  containerEl: HTMLElement,
  afterWrapper: HTMLElement | 'start' | null,
  adds: AddEntry[] = TOP_LEVEL_ADDS,
): void {
  const bar = el('div', 'nb-fe-add-bar');
  const wrap = el('div', 'nb-fe-add-wrap');

  const trigger = el('button', 'nb-fe-add-trigger') as HTMLButtonElement;
  trigger.type = 'button';
  trigger.textContent = '+';
  trigger.title = 'Εισαγωγή ενότητας';

  const dropdown = el('div', 'nb-fe-add-dropdown');
  dropdown.setAttribute('hidden', '');

  for (const { templateId, label } of adds) {
    const tpl = getTemplate(templateId);
    if (!tpl) continue;

    const opt = el('button', 'nb-fe-add-opt') as HTMLButtonElement;
    opt.type = 'button';
    opt.textContent = label;

    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      closeOpenDropdown();
      const inst: TemplateInstance = {
        id: `inst_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        templateId,
        data: {},
      };
      const html = tpl.render({});
      if (afterWrapper === 'start') {
        insertBlock(html, inst, containerEl, 'start');
      } else if (afterWrapper !== null) {
        insertBlock(html, inst, containerEl, 'end', { noRenumber: true });
        containerEl.insertBefore(containerEl.lastElementChild!, afterWrapper.nextSibling);
        renumberDocument(state.paper, state.instances);
      } else {
        insertBlock(html, inst, containerEl, 'end');
      }
      triggerAutoSave();
      renderFormDoc();
    });

    dropdown.appendChild(opt);
  }

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const wasOpen = !dropdown.hidden;
    closeOpenDropdown();
    if (!wasOpen) {
      dropdown.removeAttribute('hidden');
      openAddDropdown = dropdown;
    }
  });

  wrap.append(trigger, dropdown);
  bar.appendChild(wrap);
  targetEl.appendChild(bar);
}

// ── Add paragraph / subparagraph helpers ──────────────────────────────────

function addParagraph(zoneEl: HTMLElement, bodyDiv: HTMLElement, _articleId: string): void {
  const tpl = getTemplate('paragraph');
  if (!tpl) return;
  const count = zoneEl.querySelectorAll(':scope > .nb-block-wrapper').length + 1;
  const inst: TemplateInstance = {
    id: `inst_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    templateId: 'paragraph',
    data: { number: String(count), content: '' },
  };
  insertBlock(tpl.render(inst.data), inst, zoneEl, 'end', { noScroll: true });
  renumberDocument(state.paper, state.instances);

  const wrapper = zoneEl.lastElementChild as HTMLElement;
  const row = renderParaRow(wrapper, inst, zoneEl);
  bodyDiv.appendChild(row);

  row.querySelector<HTMLElement>('.nb-fe-rich')?.focus();
}

function addSubparagraph(zoneEl: HTMLElement, subDiv: HTMLElement): void {
  const tpl = getTemplate('subparagraph');
  if (!tpl) return;
  const count = zoneEl.querySelectorAll(':scope > .nb-block-wrapper').length + 1;
  const depth = getSubParaDepth(zoneEl);
  const label = toGreekSubNum(count, depth);
  const inst: TemplateInstance = {
    id: `inst_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    templateId: 'subparagraph',
    data: { number: label, content: '' },
  };
  insertBlock(tpl.render(inst.data), inst, zoneEl, 'end', { noScroll: true });
  renumberDocument(state.paper, state.instances);

  const wrapper = zoneEl.lastElementChild as HTMLElement;
  const row = renderSubparaRow(wrapper, inst, zoneEl);
  const addBtn = subDiv.querySelector<HTMLElement>(':scope > .nb-fe-add-child-btn');
  if (addBtn) addBtn.before(row);
  else subDiv.appendChild(row);

  row.querySelector<HTMLElement>('.nb-fe-rich')?.focus();
}

// ── Delete helper ──────────────────────────────────────────────────────────

function deleteTopCard(wrapper: HTMLElement): void {
  showConfirm('Διαγραφή αυτής της ενότητας;', () => {
    snapForUndo();
    const id = wrapper.dataset.instanceId;
    if (id) { state.instances.delete(id); unregisterEntry(id); }
    wrapper.querySelectorAll<HTMLElement>('[data-instance-id]').forEach(el => {
      const nid = el.dataset.instanceId;
      if (nid) { state.instances.delete(nid); unregisterEntry(nid); }
    });
    wrapper.remove();
    renumberDocument(state.paper, state.instances);
    triggerAutoSave();
    renderFormDoc();
  });
}

// ── Field saving ───────────────────────────────────────────────────────────

function saveField(id: string, field: string, value: string): void {
  patchBlock(id, { [field]: value });
  validateCard(id);
}

function wireFieldInputs(card: HTMLElement): void {
  // Plain text inputs
  card.querySelectorAll<HTMLInputElement>('input[data-iid][data-field]').forEach(inp => {
    inp.addEventListener('focus', () => snapForUndo());
    inp.addEventListener('input', () => {
      saveField(inp.dataset.iid!, inp.dataset.field!, inp.value);
      // Update label if it's a title/number display
      syncLabel(card, inp.dataset.iid!);
    });
  });

  // Rich text contenteditable
  card.querySelectorAll<HTMLElement>('[contenteditable][data-iid][data-field]').forEach(div => {
    div.addEventListener('focus', () => snapForUndo());
    div.addEventListener('blur', () => {
      const clean = sanitizeHtml(div.innerHTML);
      saveField(div.dataset.iid!, div.dataset.field!, clean);
    });
    div.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = (e as ClipboardEvent).clipboardData?.getData('text/plain') ?? '';
      document.execCommand('insertText', false, text);
    });
  });
}

function syncLabel(card: HTMLElement, id: string): void {
  const inst = state.instances.get(id);
  if (!inst) return;
  card.querySelectorAll<HTMLElement>(`[data-num-for="${id}"]`).forEach(el => {
    if (inst.templateId === 'paragraph') {
      el.textContent = (inst.data.number ?? '') + '.';
    } else if (inst.templateId === 'subparagraph') {
      el.textContent = (inst.data.number ?? '') + ')';
    }
  });
}

// ── Validation ─────────────────────────────────────────────────────────────

function validateCard(id: string): void {
  if (!paneEl) return;
  const inst = state.instances.get(id);
  if (!inst) return;
  const tpl = getTemplate(inst.templateId);
  if (!tpl) return;

  paneEl.querySelectorAll<HTMLElement>(`[data-iid="${id}"] [data-field]`).forEach(field => {
    const fieldId = (field as HTMLInputElement | HTMLElement).dataset.field!;
    const def = tpl.fields.find(f => f.id === fieldId);
    if (!def?.required) return;
    const val = (field as HTMLInputElement).value !== undefined
      ? (field as HTMLInputElement).value
      : field.textContent ?? '';
    field.classList.toggle('nb-fe-field-empty', val.trim() === '');
  });
}

function validateAll(): void {
  if (!paneEl) return;
  paneEl.querySelectorAll<HTMLElement>('[data-iid]').forEach(card => {
    const id = card.dataset.iid;
    if (id) validateCard(id);
  });
}

// ── Move up / down ─────────────────────────────────────────────────────────

function makeCardMoveBtn(dir: 'up' | 'down', wrapper: HTMLElement): HTMLButtonElement {
  const btn = el('button', 'nb-fe-move-btn') as HTMLButtonElement;
  btn.type = 'button';
  btn.title = dir === 'up' ? 'Μετακίνηση πάνω' : 'Μετακίνηση κάτω';
  btn.innerHTML = dir === 'up'
    ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>`
    : `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;
  btn.addEventListener('click', () => {
    snapForUndo();
    if (dir === 'up') {
      const prev = wrapper.previousElementSibling;
      if (prev) wrapper.parentElement!.insertBefore(wrapper, prev);
    } else {
      const next = wrapper.nextElementSibling;
      if (next) next.after(wrapper);
    }
    renumberDocument(state.paper, state.instances);
    triggerAutoSave();
    renderFormDoc();
  });
  return btn as HTMLButtonElement;
}

// ── DOM helpers ────────────────────────────────────────────────────────────

function el(tag: string, classes: string): HTMLElement {
  const e = document.createElement(tag);
  if (classes) e.className = classes;
  return e;
}

function makeDelBtn(handler: () => void): HTMLButtonElement {
  const btn = el('button', 'nb-fe-del-btn') as HTMLButtonElement;
  btn.type = 'button';
  btn.title = 'Διαγραφή';
  btn.textContent = '×';
  btn.addEventListener('click', handler);
  return btn;
}

function makeTextInput(iid: string, field: string, value: string): HTMLInputElement {
  const inp = el('input', 'nb-fe-text-input') as HTMLInputElement;
  inp.type = 'text';
  inp.value = value;
  inp.dataset.iid = iid;
  inp.dataset.field = field;
  return inp;
}

function makeRichField(iid: string, field: string, html: string): HTMLElement {
  const div = el('div', 'nb-fe-rich');
  div.contentEditable = 'true';
  div.dataset.iid = iid;
  div.dataset.field = field;
  div.innerHTML = html || '';
  if (!html) {
    div.dataset.placeholder = 'Πληκτρολογήστε κείμενο...';
  }
  return div;
}

function makeFieldRow(label: string, fieldEl: HTMLElement): HTMLElement {
  const row = el('div', 'nb-fe-field-row');
  const lbl = el('label', 'nb-fe-field-label');
  lbl.textContent = label;
  row.append(lbl, fieldEl);
  return row;
}
