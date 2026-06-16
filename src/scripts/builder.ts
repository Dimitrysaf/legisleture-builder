const GR  = ['α','β','γ','δ','ε','στ','ζ','η','θ','ι','ια','ιβ','ιγ','ιδ','ιε','ιστ','ιζ','ιη','ιθ','κ'];
const GRU = ['Α','Β','Γ','Δ','Ε','ΣΤ','Ζ','Η','Θ','Ι','ΙΑ','ΙΒ','ΙΓ','ΙΔ','ΙΕ','ΙΣΤ','ΙΖ','ΙΗ','ΙΘ','Κ'];
const grL  = (i: number) => (GR[i]  ?? String(i + 1)) + ')';
const grLL = (i: number) => { const g = GR[i] ?? String(i + 1); return g + g + ')'; };
const grU  = (i: number) => (GRU[i] ?? String(i + 1)) + '΄';

const paper   = document.getElementById('nb-paper') as HTMLElement;
let   blockSeq = 0;
let   pendingBlockType: string | null = null;

// ── Toolbar → add block ─────────────────────────────

document.querySelectorAll<HTMLButtonElement>('.nb-tool[data-type]').forEach(btn =>
  btn.addEventListener('click', () => addBlock(btn.dataset.type!))
);

function addBlock(type: string) {
  if (type === 'arithmos-nomou') {
    pendingBlockType = type;
    activeBlock = null;
    populateLawModal(null);
    openModal(lawNumberModal);
    return;
  }

  document.getElementById('nb-empty')?.remove();
  const id  = ++blockSeq;
  const el  = makeBlockEl(type, id);
  paper.appendChild(el);
  renum();
}

// ── Build block element ─────────────────────────────

function makeBlockEl(type: string, id: number): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className  = `nb-block nb-block--${type}`;
  wrap.dataset.id = String(id);
  wrap.dataset.type = type;

  const menuBtn = document.createElement('button');
  menuBtn.type = 'button';
  menuBtn.className = 'nb-block-menu-btn';
  menuBtn.setAttribute('aria-haspopup', 'dialog');
  menuBtn.setAttribute('aria-label', 'Ενέργειες μπλοκ');
  menuBtn.textContent = '⋮';
  menuBtn.addEventListener('click', event => {
    event.stopPropagation();
    openBlockMenuModal(wrap);
  });

  wrap.appendChild(menuBtn);
  wrap.appendChild(blockContent(type, id));
  return wrap;
}

// ── Block content factory ───────────────────────────

function blockContent(type: string, id: number): DocumentFragment {
  const frag = document.createDocumentFragment();

  if (type === 'arithmos-nomou') {
    frag.append(
      ce('div', 'nb-nomou-num govuk-caption-l nb-law-number', {}, "ΝΟΜΟΣ ΥΠ' ΑΡΙΘ. ____/2025"),
      ce('h2', 'nb-nomou-title govuk-heading-l', {}, 'ΤΙΤΛΟΣ ΝΟΜΟΥ'),
      ce('p', 'nb-nomou-subtitle govuk-body', {}, 'ΤΡΟΠΟΠΟΙΗΣΗ / ΣΥΜΠΛΗΡΩΣΗ ΔΙΑΤΑΞΕΩΝ...'),
      ce('p', 'nb-nomou-date govuk-body-s', {}, '(ΦΕΚ Α΄ ___/__.__.2025)')
    );
    return frag;
  }

  if (type === 'prooimio') {
    frag.append(
      ce('h2', 'nb-section-tag govuk-heading-s', {}, 'Προοίμιο'),
      makeEditableText('div', 'nb-prooimio-body govuk-body', 'Η ΒΟΥΛΗ ΤΩΝ ΕΛΛΗΝΩΝ', 'Η ΒΟΥΛΗ ΤΩΝ ΕΛΛΗΝΩΝ...', 'Προοίμιο')
    );
    return frag;
  }

  if (type === 'aitiologiki') {
    const numSpan = ce('span', 'nb-ait-num', { 'data-auto': 'aitiologiki' });
    const body    = makeEditableText('div', 'nb-ait-body', 'Λαμβάνοντας υπόψη...', 'Λαμβάνοντας υπόψη...', 'Αιτιολογική σκέψη');
    frag.append(numSpan, body);
    return frag;
  }

  if (type === 'meros' || type === 'kefalaio' || type === 'tmima') {
    frag.append(makeStructContent(type));
    return frag;
  }

  if (type === 'arthro') {
    frag.append(makeArthroContent(id));
    return frag;
  }

  if (type === 'ermineytiki') {
    frag.append(
      ce('h2', 'nb-section-tag govuk-heading-s', {}, 'Ερμηνευτική Δήλωση'),
      makeEditableText('div', 'nb-ermineytiki-body-ce govuk-body', 'Κείμενο ερμηνευτικής δήλωσης...', 'Κείμενο ερμηνευτικής δήλωσης...', 'Ερμηνευτική δήλωση')
    );
    return frag;
  }

  if (type === 'metabatikes') {
    frag.append(ce('h2', 'nb-diataxi-label govuk-heading-s', {}, 'Μεταβατικές Διατάξεις'));
    return frag;
  }

  if (type === 'telikes') {
    frag.append(ce('h2', 'nb-diataxi-label govuk-heading-s', {}, 'Τελικές Διατάξεις'));
    return frag;
  }

  return frag;
}

// ── Struct block (Μέρος / Κεφάλαιο / Τμήμα) ────────

const STRUCT_PREFIX: Record<string, string> = {
  meros: 'ΜΕΡΟΣ', kefalaio: 'ΚΕΦΑΛΑΙΟ', tmima: 'ΤΜΗΜΑ'
};

function makeStructContent(type: string): HTMLElement {
  const prefix = STRUCT_PREFIX[type];

  const meta = document.createElement('div');
  meta.className = 'nb-meta';

  const chkNum  = mkChk('nb-chk-manual-num', 'Χειροκίνητος αριθμός');
  const numInput = document.createElement('input');
  numInput.type = 'text'; numInput.maxLength = 10;
  numInput.placeholder = "π.χ. Α΄";
  numInput.className = 'nb-hidden';
  numInput.style.width = '64px';

  const chkName = mkChk('nb-chk-name', 'Όνομα');
  const nameInput = makeEditableText('span', 'nb-struct-name-ce nb-hidden', 'Τίτλος...', 'Τίτλος...', 'Όνομα μερους/κεφαλαίου/τμήματος');

  meta.append(chkNum.label, numInput, chkName.label, nameInput);

  const autoNum = ce('span', '', { 'data-auto': type });
  const manNum  = ce('span', 'nb-hidden nb-struct-manual-num');
  const display = document.createElement('h2');
  display.className = 'govuk-heading-s nb-struct-display';
  display.append(document.createTextNode(prefix + ' '), autoNum, manNum);

  const nameLine = ce('p', 'govuk-body govuk-!-margin-bottom-3 nb-struct-name-val nb-hidden');
  nameLine.setAttribute('data-name-mirror', '');

  const wrap = document.createElement('div');
  wrap.append(meta, display, nameLine);

  chkNum.input.addEventListener('change', () => {
    if (chkNum.input.checked) {
      autoNum.classList.add('nb-hidden');
      manNum.classList.add('nb-hidden');
      numInput.classList.remove('nb-hidden');
      numInput.focus();
    } else {
      numInput.classList.add('nb-hidden');
      autoNum.classList.remove('nb-hidden');
      manNum.classList.add('nb-hidden');
      renum();
    }
  });

  numInput.addEventListener('input', () => {
    manNum.textContent = numInput.value;
  });

  chkName.input.addEventListener('change', () => {
    if (chkName.input.checked) {
      nameInput.classList.remove('nb-hidden');
      nameLine.classList.remove('nb-hidden');
      (nameInput as HTMLElement).focus();
    } else {
      nameInput.classList.add('nb-hidden');
      nameLine.classList.add('nb-hidden');
      nameLine.textContent = '';
    }
  });

  nameInput.addEventListener('input', () => {
    nameLine.textContent = (nameInput as HTMLElement).innerText;
  });

  return wrap;
}

// ── Άρθρο block ─────────────────────────────────────

function makeArthroContent(_id: number): HTMLElement {
  const uuid = genId();

  const meta = document.createElement('div');
  meta.className = 'nb-meta';

  const uuidSpan = ce('span', 'nb-uuid', {}, `ID: ${uuid}`);

  const chkNum  = mkChk('nb-chk-manual-num', 'Χειρ. αριθμός');
  const numInput = document.createElement('input');
  numInput.type = 'text'; numInput.maxLength = 8;
  numInput.placeholder = 'Αριθμός'; numInput.style.width = '60px';
  numInput.className = 'nb-hidden';

  const chkTitle = mkChk('nb-chk-title', 'Τίτλος');

  meta.append(uuidSpan, chkNum.label, numInput, chkTitle.label);

  const numLabel   = ce('h2', 'nb-arthro-num-label govuk-heading-s', { 'data-auto': 'arthro' });
  const titleField = makeEditableText('h3', 'nb-arthro-title-field govuk-heading-s nb-hidden', 'Τίτλος άρθρου...', 'Τίτλος άρθρου...', 'Τίτλος άρθρου');
  const display = document.createElement('div');
  display.className = 'nb-arthro-display';
  display.append(numLabel, titleField);

  const parasList = document.createElement('div');
  parasList.className = 'nb-paras-list';

  const btnAddPara = document.createElement('button');
  btnAddPara.className = 'nb-inline-btn';
  btnAddPara.textContent = '+ Παράγραφος';
  btnAddPara.addEventListener('click', () => {
    addPara(parasList);
  });

  const ermSect  = document.createElement('div');
  ermSect.className = 'nb-arthro-ermineytiki';
  const chkErm   = mkChk('nb-chk-ermineytiki', 'Ερμηνευτική Δήλωση');
  const ermMeta  = document.createElement('div');
  ermMeta.className = 'nb-meta';
  ermMeta.append(chkErm.label);

  const ermBlock = document.createElement('div');
  ermBlock.className = 'nb-ermineytiki-block nb-hidden';
  ermBlock.innerHTML = `
    <div class="nb-ermineytiki-block-label">Ερμηνευτική Δήλωση</div>
  `;
  const ermBody = makeEditableText('div', 'nb-ermineytiki-body-ce', 'Κείμενο ερμηνευτικής δήλωσης...', 'Κείμενο ερμηνευτικής δήλωσης...', 'Ερμηνευτική δήλωση');
  ermBlock.append(ermBody);

  chkErm.input.addEventListener('change', () => {
    ermBlock.classList.toggle('nb-hidden', !chkErm.input.checked);
    if (chkErm.input.checked) ermBody.focus();
  });

  ermSect.append(ermMeta, ermBlock);

  chkTitle.input.addEventListener('change', () => {
    titleField.classList.toggle('nb-hidden', !chkTitle.input.checked);
    if (chkTitle.input.checked) (titleField as HTMLElement).focus();
  });

  chkNum.input.addEventListener('change', () => {
    if (chkNum.input.checked) {
      numInput.classList.remove('nb-hidden');
      numInput.focus();
    } else {
      numInput.classList.add('nb-hidden');
      renum();
    }
  });
  numInput.addEventListener('input', () => {
    numLabel.textContent = 'Άρθρο ' + (numInput.value || '?');
  });

  const wrap = document.createElement('div');
  wrap.append(meta, display, parasList, btnAddPara, ermSect);
  return wrap;
}

// ── Paragraph management ────────────────────────────

function addPara(list: HTMLElement) {
  const para = makePara(list);
  list.appendChild(para);
  renumParas(list);
  (para.querySelector<HTMLElement>('.nb-para-body'))?.focus();
}

function makePara(list: HTMLElement): HTMLElement {
  const para = document.createElement('div');
  para.className = 'nb-para';

  const numSpan = ce('span', 'nb-para-num');
  const body    = makeEditableText('div',  'nb-para-body', 'Κείμενο παραγράφου...', 'Κείμενο παραγράφου...', 'Παράγραφος');

  const btnAddSub = document.createElement('button');
  btnAddSub.className = 'nb-inline-btn-sm';
  btnAddSub.textContent = '+ α)';
  btnAddSub.title = 'Προσθήκη υποπαραγράφου';

  const btnDel = document.createElement('button');
  btnDel.className = 'nb-inline-del';
  btnDel.textContent = '✕';
  btnDel.title = 'Διαγραφή παραγράφου';

  const actions = document.createElement('div');
  actions.className = 'nb-para-actions';
  actions.setAttribute('contenteditable', 'false');
  actions.append(btnAddSub, btnDel);

  const row = document.createElement('div');
  row.className = 'nb-para-row';
  row.append(numSpan, body, actions);

  const subsList = document.createElement('div');
  subsList.className = 'nb-subparas-list';

  para.append(row, subsList);

  btnAddSub.addEventListener('click', () => {
    addSubPara(subsList);
  });

  btnDel.addEventListener('click', () => {
    para.remove();
    renumParas(list);
  });

  return para;
}

function renumParas(list: HTMLElement) {
  list.querySelectorAll<HTMLElement>(':scope > .nb-para .nb-para-num').forEach((el, i) => {
    el.textContent = String(i + 1) + '.';
  });
}

// ── Sub-paragraph management (α β γ) ────────────────

function addSubPara(list: HTMLElement) {
  const sub = makeSubPara(list);
  list.appendChild(sub);
  renumSubParas(list);
  (sub.querySelector<HTMLElement>('.nb-subpara-body'))?.focus();
}

function makeSubPara(list: HTMLElement): HTMLElement {
  const sub = document.createElement('div');
  sub.className = 'nb-subpara';

  const numSpan = ce('span', 'nb-subpara-num');
  const body    = makeEditableText('div',  'nb-subpara-body', 'Κείμενο υποπαραγράφου...', 'Κείμενο υποπαραγράφου...', 'Υποπαράγραφος');

  const btnAddSub2 = document.createElement('button');
  btnAddSub2.className = 'nb-inline-btn-sm';
  btnAddSub2.textContent = '+ αα)';
  btnAddSub2.title = 'Προσθήκη υπο-υποπαραγράφου';

  const btnDel = document.createElement('button');
  btnDel.className = 'nb-inline-del';
  btnDel.textContent = '✕';
  btnDel.title = 'Διαγραφή υποπαραγράφου';

  const actions = document.createElement('div');
  actions.className = 'nb-subpara-actions';
  actions.setAttribute('contenteditable', 'false');
  actions.append(btnAddSub2, btnDel);

  const row = document.createElement('div');
  row.className = 'nb-subpara-row';
  row.append(numSpan, body, actions);

  const subsubs = document.createElement('div');
  subsubs.className = 'nb-subsubparas-list';

  sub.append(row, subsubs);

  btnAddSub2.addEventListener('click', () => {
    addSubSubPara(subsubs);
  });

  btnDel.addEventListener('click', () => {
    sub.remove();
    renumSubParas(list);
  });

  return sub;
}

function renumSubParas(list: HTMLElement) {
  list.querySelectorAll<HTMLElement>(':scope > .nb-subpara .nb-subpara-num').forEach((el, i) => {
    el.textContent = grL(i);
  });
}

// ── Sub-sub-paragraph management (αα ββ) ────────────

function addSubSubPara(list: HTMLElement) {
  const el = makeSubSubPara(list);
  list.appendChild(el);
  renumSubSubParas(list);
  (el.querySelector<HTMLElement>('.nb-subsubpara-body'))?.focus();
}

function makeSubSubPara(list: HTMLElement): HTMLElement {
  const el = document.createElement('div');
  el.className = 'nb-subsubpara';

  const numSpan = ce('span', 'nb-subsubpara-num');
  const body    = makeEditableText('div',  'nb-subsubpara-body', 'Κείμενο...', 'Κείμενο...', 'Υπο-υποπαράγραφος');

  const btnDel = document.createElement('button');
  btnDel.className = 'nb-inline-del';
  btnDel.textContent = '✕';
  btnDel.title = 'Διαγραφή';

  const actions = document.createElement('div');
  actions.className = 'nb-subsubpara-actions';
  actions.setAttribute('contenteditable', 'false');
  actions.append(btnDel);

  el.append(numSpan, body, actions);

  btnDel.addEventListener('click', () => {
    el.remove();
    renumSubSubParas(list);
  });

  return el;
}

function renumSubSubParas(list: HTMLElement) {
  list.querySelectorAll<HTMLElement>(':scope > .nb-subsubpara .nb-subsubpara-num').forEach((el, i) => {
    el.textContent = grLL(i);
  });
}

// ── Global auto-numbering ────────────────────────────

function renum() {
  let artN = 0, merosN = 0, kefN = 0, tmimaN = 0, aitN = 0;

  paper.querySelectorAll<HTMLElement>('.nb-block').forEach(block => {
    const type = block.dataset.type!;

    if (type === 'aitiologiki') {
      aitN++;
      const el = block.querySelector<HTMLElement>('[data-auto="aitiologiki"]');
      if (el) el.textContent = String(aitN) + '.';
    }

    if (type === 'meros') {
      merosN++;
      const el    = block.querySelector<HTMLElement>('[data-auto="meros"]');
      const chk   = block.querySelector<HTMLInputElement>('.nb-chk-manual-num');
      if (el && !chk?.checked) el.textContent = grU(merosN - 1);
    }

    if (type === 'kefalaio') {
      kefN++;
      const el  = block.querySelector<HTMLElement>('[data-auto="kefalaio"]');
      const chk = block.querySelector<HTMLInputElement>('.nb-chk-manual-num');
      if (el && !chk?.checked) el.textContent = grU(kefN - 1);
    }

    if (type === 'tmima') {
      tmimaN++;
      const el  = block.querySelector<HTMLElement>('[data-auto="tmima"]');
      const chk = block.querySelector<HTMLInputElement>('.nb-chk-manual-num');
      if (el && !chk?.checked) el.textContent = grU(tmimaN - 1);
    }

    if (type === 'arthro') {
      artN++;
      const numLabel = block.querySelector<HTMLElement>('[data-auto="arthro"]');
      const chk      = block.querySelector<HTMLInputElement>('.nb-chk-manual-num');
      if (numLabel && !chk?.checked) numLabel.textContent = 'Άρθρο ' + artN;
    }
  });
}

// ── Move block ───────────────────────────────────────

function moveBlock(el: HTMLElement, dir: -1 | 1) {
  if (dir === -1) {
    const prev = el.previousElementSibling as HTMLElement | null;
    if (prev) paper.insertBefore(el, prev);
  } else {
    const next = el.nextElementSibling as HTMLElement | null;
    if (next) paper.insertBefore(next, el);
  }
}

// ── Empty state ──────────────────────────────────────

function showEmpty() {
  const p    = document.createElement('p');
  p.id        = 'nb-empty';
  p.className = 'nb-empty';
  p.textContent = 'Κάντε κλικ σε ένα στοιχείο για να ξεκινήσετε.';
  paper.appendChild(p);
}

// ── Print / Clear ────────────────────────────────────

const clearModal = document.getElementById('nb-clear-modal') as HTMLElement;
const clearConfirm = document.getElementById('nb-clear-confirm') as HTMLButtonElement;
const clearCancel = document.getElementById('nb-clear-cancel') as HTMLButtonElement;

const blockActionModal = document.getElementById('nb-block-action-modal') as HTMLElement;
const blockActionLabel = document.getElementById('nb-block-action-modal-label') as HTMLElement;
const blockEditBtn = document.getElementById('nb-block-edit') as HTMLButtonElement;
const blockUpBtn = document.getElementById('nb-block-up') as HTMLButtonElement;
const blockDownBtn = document.getElementById('nb-block-down') as HTMLButtonElement;
const blockDeleteBtn = document.getElementById('nb-block-delete') as HTMLButtonElement;
const blockActionCancel = document.getElementById('nb-block-action-cancel') as HTMLButtonElement;

const lawNumberModal = document.getElementById('nb-law-number-modal') as HTMLElement;
const lawNumberInput = document.getElementById('nb-law-number') as HTMLInputElement;
const lawTitleInput = document.getElementById('nb-law-title') as HTMLInputElement;
const lawSubtitleInput = document.getElementById('nb-law-subtitle') as HTMLInputElement;
const lawDateInput = document.getElementById('nb-law-date') as HTMLInputElement;
const lawSaveBtn = document.getElementById('nb-law-save') as HTMLButtonElement;
const lawCancelBtn = document.getElementById('nb-law-cancel') as HTMLButtonElement;

let activeBlock: HTMLElement | null = null;

document.getElementById('btn-print')!.addEventListener('click', () => window.print());

document.getElementById('btn-clear')!.addEventListener('click', () => openModal(clearModal));

clearConfirm.addEventListener('click', () => {
  paper.innerHTML = '';
  blockSeq = 0;
  closeModal(clearModal);
  showEmpty();
});

clearCancel.addEventListener('click', () => closeModal(clearModal));

clearModal.addEventListener('click', event => {
  if (event.target === clearModal) closeModal(clearModal);
});

lawSaveBtn.addEventListener('click', () => {
  const values = {
    number: lawNumberInput.value,
    title: lawTitleInput.value,
    subtitle: lawSubtitleInput.value,
    date: lawDateInput.value,
  };

  if (activeBlock) {
    updateLawNumberBlock(activeBlock, values);
  } else if (pendingBlockType === 'arithmos-nomou') {
    document.getElementById('nb-empty')?.remove();
    const id = ++blockSeq;
    const block = makeBlockEl(pendingBlockType, id);
    paper.appendChild(block);
    updateLawNumberBlock(block, values);
    renum();
  }

  pendingBlockType = null;
  closeModal(lawNumberModal);
});

lawCancelBtn.addEventListener('click', () => {
  pendingBlockType = null;
  closeModal(lawNumberModal);
});

lawNumberModal.addEventListener('click', event => {
  if (event.target === lawNumberModal) {
    pendingBlockType = null;
    closeModal(lawNumberModal);
  }
});

blockEditBtn.addEventListener('click', () => {
  if (!activeBlock) return;
  if (activeBlock.dataset.type === 'arithmos-nomou') {
    populateLawModal(activeBlock);
    openModal(lawNumberModal);
  }
  closeModal(blockActionModal);
});

blockUpBtn.addEventListener('click', () => {
  if (!activeBlock) return;
  moveBlock(activeBlock, -1);
  renum();
  closeModal(blockActionModal);
});

blockDownBtn.addEventListener('click', () => {
  if (!activeBlock) return;
  moveBlock(activeBlock, 1);
  renum();
  closeModal(blockActionModal);
});

blockDeleteBtn.addEventListener('click', () => {
  if (!activeBlock) return;
  activeBlock.remove();
  renum();
  if (!paper.querySelector('.nb-block')) showEmpty();
  closeModal(blockActionModal);
});

blockActionCancel.addEventListener('click', () => closeModal(blockActionModal));

blockActionModal.addEventListener('click', event => {
  if (event.target === blockActionModal) closeModal(blockActionModal);
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    if (!clearModal.classList.contains('nb-hidden')) closeModal(clearModal);
    if (!blockActionModal.classList.contains('nb-hidden')) closeModal(blockActionModal);
  }
});

function openBlockMenuModal(block: HTMLElement) {
  activeBlock = block;

  const type = block.dataset.type ?? 'μπλοκ';
  if (type === 'arithmos-nomou') {
    populateLawModal(block);
    openModal(lawNumberModal);
    return;
  }

  blockActionLabel.textContent = `Ενέργειες για το μπλοκ: ${type}`;
  blockUpBtn.disabled = !block.previousElementSibling;
  blockDownBtn.disabled = !block.nextElementSibling;

  openModal(blockActionModal);
}

function populateLawModal(block: HTMLElement | null) {
  lawNumberInput.value = block?.querySelector<HTMLElement>('.nb-nomou-num')?.textContent?.trim() ?? "ΝΟΜΟΣ ΥΠ' ΑΡΙΘ. ____/2025";
  lawTitleInput.value = block?.querySelector<HTMLElement>('.nb-nomou-title')?.textContent?.trim() ?? 'ΤΙΤΛΟΣ ΝΟΜΟΥ';
  lawSubtitleInput.value = block?.querySelector<HTMLElement>('.nb-nomou-subtitle')?.textContent?.trim() ?? 'ΤΡΟΠΟΠΟΙΗΣΗ / ΣΥΜΠΛΗΡΩΣΗ ΔΙΑΤΑΞΕΩΝ...';
  lawDateInput.value = block?.querySelector<HTMLElement>('.nb-nomou-date')?.textContent?.trim() ?? '(ΦΕΚ Α΄ ___/__.__.2025)';
}

function makeEditableText(tag: string, cls: string, text: string, placeholder: string, _label: string): HTMLElement {
  const el = ce(tag, cls, {contenteditable: 'true'}, text);
  el.dataset.ph = placeholder;
  return el;
}

function updateLawNumberBlock(block: HTMLElement, values: { number: string; title: string; subtitle: string; date: string; }) {
  const number = values.number.trim().toUpperCase() || "ΝΟΜΟΣ ΥΠ' ΑΡΙΘ. ____/2025";
  const title = values.title.trim() || 'Τίτλος νόμου';
  const subtitle = values.subtitle.trim() || 'Τροποποίηση / συμπλήρωση διατάξεων...';
  const date = values.date.trim() || '(ΦΕΚ Α΄ ___/__.__.2025)';

  block.querySelector<HTMLElement>('.nb-nomou-num')!.textContent = number;
  block.querySelector<HTMLElement>('.nb-nomou-title')!.textContent = title;
  block.querySelector<HTMLElement>('.nb-nomou-subtitle')!.textContent = subtitle;
  block.querySelector<HTMLElement>('.nb-nomou-date')!.textContent = date;
}

function openModal(modal: HTMLElement) {
  modal.classList.remove('nb-hidden');
  document.body.classList.add('nb-modal-open');
}

function closeModal(modal: HTMLElement) {
  modal.classList.add('nb-hidden');
  document.body.classList.remove('nb-modal-open');
}

// ── Helpers ──────────────────────────────────────────

function genId(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
}

function ce(tag: string, cls: string, attrs: Record<string, string> = {}, text?: string): HTMLElement {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  if (text !== undefined) el.textContent = text;
  return el;
}

function mkChk(cls: string, label: string): { label: HTMLElement; input: HTMLInputElement } {
  const lbl = document.createElement('label');
  lbl.className = 'nb-toggle-label';
  const inp = document.createElement('input');
  inp.type = 'checkbox';
  inp.className = cls;
  const txt = document.createTextNode(' ' + label);
  lbl.append(inp, txt);
  return { label: lbl, input: inp };
}
