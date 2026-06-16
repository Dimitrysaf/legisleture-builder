const GR  = ['α','β','γ','δ','ε','στ','ζ','η','θ','ι','ια','ιβ','ιγ','ιδ','ιε','ιστ','ιζ','ιη','ιθ','κ'];
const GRU = ['Α','Β','Γ','Δ','Ε','ΣΤ','Ζ','Η','Θ','Ι','ΙΑ','ΙΒ','ΙΓ','ΙΔ','ΙΕ','ΙΣΤ','ΙΖ','ΙΗ','ΙΘ','Κ'];
const grL  = (i: number) => (GR[i]  ?? String(i + 1)) + ')';
const grLL = (i: number) => { const g = GR[i] ?? String(i + 1); return g + g + ')'; };
const grU  = (i: number) => (GRU[i] ?? String(i + 1)) + '΄';

const paper = document.getElementById('nb-paper') as HTMLElement;
let blockSeq = 0;
let pendingBlockType: string | null = null;
let activeBlock: HTMLElement | null = null;

// ── Dropdown ─────────────────────────────────────────

type DdCtx =
  | { kind: 'block';      block: HTMLElement }
  | { kind: 'para';       para: HTMLElement;  list: HTMLElement }
  | { kind: 'subpara';    sub:  HTMLElement;  list: HTMLElement }
  | { kind: 'subsubpara'; el:   HTMLElement;  list: HTMLElement };

let ddCtx: DdCtx | null = null;
let ddBtn: HTMLElement | null = null;

const dd = document.createElement('div');
dd.className = 'nb-dropdown nb-hidden';
dd.setAttribute('role', 'menu');
document.body.appendChild(dd);

function openDd(btn: HTMLElement, ctx: DdCtx) {
  ddBtn = btn;
  ddCtx = ctx;
  if (ctx.kind === 'block') activeBlock = ctx.block;
  rebuildDd();
  dd.classList.remove('nb-hidden');
  positionDd(btn);
}

function positionDd(btn: HTMLElement) {
  const r = btn.getBoundingClientRect();
  dd.style.top   = (r.bottom + 4) + 'px';
  dd.style.right = (window.innerWidth - r.right) + 'px';
  dd.style.left  = '';
  requestAnimationFrame(() => {
    const h = dd.offsetHeight;
    if (r.bottom + 4 + h > window.innerHeight - 8)
      dd.style.top = Math.max(8, r.top - h - 4) + 'px';
  });
}

function closeDd() { dd.classList.add('nb-hidden'); }

function rebuildDd() {
  dd.innerHTML = '';
  if (!ddCtx) return;
  if      (ddCtx.kind === 'block')      buildBlockDd(ddCtx.block);
  else if (ddCtx.kind === 'para')       buildParaDd(ddCtx.para, ddCtx.list);
  else if (ddCtx.kind === 'subpara')    buildSubParaDd(ddCtx.sub, ddCtx.list);
  else                                  buildSubSubParaDd(ddCtx.el, ddCtx.list);
}

document.addEventListener('click', e => {
  if (!dd.classList.contains('nb-hidden') && !dd.contains(e.target as Node))
    closeDd();
});

// ── Block dropdown ────────────────────────────────────

function buildBlockDd(block: HTMLElement) {
  const type = block.dataset.type!;

  if (type === 'arithmos-nomou') {
    ddItem('Επεξεργασία', () => { closeDd(); populateLawModal(block); openModal(lawNumberModal); });
    ddDiv();
  }

  if (type === 'arthro') {
    ddItem('+ Παράγραφος', () => {
      addPara(block.querySelector<HTMLElement>('.nb-paras-list')!);
      closeDd();
    });
    ddDiv();

    const numOn = block.dataset.hasManualNum === 'true';
    ddToggle('Χειρ. Αριθμός', numOn, () => {
      const autoEl = block.querySelector<HTMLElement>('[data-auto="arthro"]')!;
      const manEl  = block.querySelector<HTMLElement>('.nb-arthro-num-ce')!;
      if (numOn) {
        block.dataset.hasManualNum = 'false';
        autoEl.classList.remove('nb-hidden');
        manEl.classList.add('nb-hidden');
        renum();
      } else {
        block.dataset.hasManualNum = 'true';
        if (!manEl.textContent) manEl.textContent = autoEl.textContent;
        autoEl.classList.add('nb-hidden');
        manEl.classList.remove('nb-hidden');
        manEl.focus();
      }
      rebuildDd();
    });

    const titleOn = block.dataset.hasTitle === 'true';
    ddToggle('Τίτλος', titleOn, () => {
      const tf = block.querySelector<HTMLElement>('.nb-arthro-title-field')!;
      if (titleOn) { block.dataset.hasTitle = 'false'; tf.classList.add('nb-hidden'); }
      else         { block.dataset.hasTitle = 'true';  tf.classList.remove('nb-hidden'); tf.focus(); }
      rebuildDd();
    });

    const ermOn = block.dataset.hasErmineytiki === 'true';
    ddToggle('Ερμηνευτική Δήλωση', ermOn, () => {
      const sect = block.querySelector<HTMLElement>('.nb-arthro-ermineytiki')!;
      if (ermOn) { block.dataset.hasErmineytiki = 'false'; sect.classList.add('nb-hidden'); }
      else       { block.dataset.hasErmineytiki = 'true';  sect.classList.remove('nb-hidden'); sect.querySelector<HTMLElement>('.nb-ermineytiki-body-ce')?.focus(); }
      rebuildDd();
    });

    ddDiv();
  }

  if (type === 'meros' || type === 'kefalaio' || type === 'tmima') {
    const numOn = block.dataset.hasManualNum === 'true';
    ddToggle('Χειρ. Αριθμός', numOn, () => {
      const autoEl = block.querySelector<HTMLElement>(`[data-auto="${type}"]`)!;
      const manEl  = block.querySelector<HTMLElement>('.nb-struct-num-ce')!;
      if (numOn) {
        block.dataset.hasManualNum = 'false';
        autoEl.classList.remove('nb-hidden');
        manEl.classList.add('nb-hidden');
        renum();
      } else {
        block.dataset.hasManualNum = 'true';
        if (!manEl.textContent) manEl.textContent = autoEl.textContent;
        autoEl.classList.add('nb-hidden');
        manEl.classList.remove('nb-hidden');
        manEl.focus();
      }
      rebuildDd();
    });

    const nameOn = block.dataset.hasName === 'true';
    ddToggle('Όνομα', nameOn, () => {
      const nl = block.querySelector<HTMLElement>('.nb-struct-name-val')!;
      if (nameOn) {
        block.dataset.hasName = 'false';
        nl.classList.add('nb-hidden');
        nl.removeAttribute('contenteditable');
      } else {
        block.dataset.hasName = 'true';
        nl.classList.remove('nb-hidden');
        nl.setAttribute('contenteditable', 'true');
        (nl as HTMLElement & { dataset: DOMStringMap }).dataset.ph = 'Τίτλος...';
        nl.focus();
      }
      rebuildDd();
    });

    ddDiv();
  }

  const isFirst = !block.previousElementSibling;
  const isLast  = !block.nextElementSibling;

  ddItem('↑ Μετακίνηση επάνω', () => { moveBlock(block, -1); renum(); closeDd(); }, isFirst);
  ddItem('↓ Μετακίνηση κάτω',  () => { moveBlock(block,  1); renum(); closeDd(); }, isLast);
  ddDiv();
  ddItem('Διαγραφή', () => {
    block.remove(); renum();
    if (!paper.querySelector('.nb-block')) showEmpty();
    closeDd();
  }, false, true);
}

function buildParaDd(para: HTMLElement, list: HTMLElement) {
  ddItem('+ α) Υποπαράγραφος', () => { addSubPara(para.querySelector<HTMLElement>('.nb-subparas-list')!); closeDd(); });
  ddDiv();
  ddItem('Διαγραφή', () => { para.remove(); renumParas(list); closeDd(); }, false, true);
}

function buildSubParaDd(sub: HTMLElement, list: HTMLElement) {
  ddItem('+ αα) Υπο-υποπαράγραφος', () => { addSubSubPara(sub.querySelector<HTMLElement>('.nb-subsubparas-list')!); closeDd(); });
  ddDiv();
  ddItem('Διαγραφή', () => { sub.remove(); renumSubParas(list); closeDd(); }, false, true);
}

function buildSubSubParaDd(el: HTMLElement, list: HTMLElement) {
  ddItem('Διαγραφή', () => { el.remove(); renumSubSubParas(list); closeDd(); }, false, true);
}

// ── Dropdown helpers ──────────────────────────────────

function ddItem(label: string, onClick: () => void, disabled = false, danger = false): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'nb-dd-item' + (danger ? ' nb-dd-item--danger' : '');
  btn.textContent = label;
  btn.disabled = disabled;
  btn.addEventListener('click', e => { e.stopPropagation(); onClick(); });
  dd.appendChild(btn);
  return btn;
}

function ddToggle(label: string, on: boolean, onClick: () => void) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'nb-dd-item nb-dd-item--toggle';
  const chk = ce('span', 'nb-dd-check', {}, on ? '✓' : '');
  btn.append(chk, label);
  btn.addEventListener('click', e => { e.stopPropagation(); onClick(); });
  dd.appendChild(btn);
}

function ddDiv() {
  const hr = document.createElement('hr');
  hr.className = 'nb-dd-divider';
  dd.appendChild(hr);
}

// ── Toolbar ───────────────────────────────────────────

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
  const el = makeBlockEl(type, ++blockSeq);
  paper.appendChild(el);
  renum();
}

// ── Block element factory ─────────────────────────────

function makeBlockEl(type: string, id: number): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className  = `nb-block nb-block--${type}`;
  wrap.dataset.id   = String(id);
  wrap.dataset.type = type;

  const menuBtn = document.createElement('button');
  menuBtn.type = 'button';
  menuBtn.className = 'nb-block-menu-btn';
  menuBtn.setAttribute('aria-label', 'Επιλογές μπλοκ');
  menuBtn.textContent = '⋮';
  menuBtn.addEventListener('click', e => { e.stopPropagation(); openDd(menuBtn, { kind: 'block', block: wrap }); });

  wrap.appendChild(menuBtn);
  wrap.appendChild(blockContent(type, id));
  return wrap;
}

// ── Block content ─────────────────────────────────────

function blockContent(type: string, id: number): DocumentFragment {
  const frag = document.createDocumentFragment();

  if (type === 'arithmos-nomou') {
    frag.append(
      ce('div', 'nb-nomou-num govuk-caption-l nb-law-number', {}, "ΝΟΜΟΣ ΥΠ' ΑΡΙΘ. ____/2025"),
      ce('h2',  'nb-nomou-title govuk-heading-l', {}, 'ΤΙΤΛΟΣ ΝΟΜΟΥ'),
      ce('p',   'nb-nomou-subtitle govuk-body',   {}, 'ΤΡΟΠΟΠΟΙΗΣΗ / ΣΥΜΠΛΗΡΩΣΗ ΔΙΑΤΑΞΕΩΝ...'),
      ce('p',   'nb-nomou-date govuk-body-s',     {}, '(ΦΕΚ Α΄ ___/__.__.2025)')
    );
    return frag;
  }

  if (type === 'prooimio') {
    frag.append(
      ce('h2', 'nb-section-tag govuk-heading-s', {}, 'Προοίμιο'),
      editable('div', 'nb-prooimio-body govuk-body', 'Η ΒΟΥΛΗ ΤΩΝ ΕΛΛΗΝΩΝ', 'Η ΒΟΥΛΗ ΤΩΝ ΕΛΛΗΝΩΝ...')
    );
    return frag;
  }

  if (type === 'aitiologiki') {
    frag.append(
      ce('span', 'nb-ait-num', { 'data-auto': 'aitiologiki' }),
      editable('div', 'nb-ait-body', 'Λαμβάνοντας υπόψη...', 'Λαμβάνοντας υπόψη...')
    );
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
      editable('div', 'nb-ermineytiki-body-ce govuk-body', 'Κείμενο ερμηνευτικής δήλωσης...', 'Κείμενο ερμηνευτικής δήλωσης...')
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

// ── Struct block (Μέρος / Κεφάλαιο / Τμήμα) ──────────

const STRUCT_PREFIX: Record<string, string> = {
  meros: 'ΜΕΡΟΣ', kefalaio: 'ΚΕΦΑΛΑΙΟ', tmima: 'ΤΜΗΜΑ'
};

function makeStructContent(type: string): HTMLElement {
  const prefix = STRUCT_PREFIX[type];

  const autoNum = ce('span', '', { 'data-auto': type });
  const manNum  = editable('span', 'nb-struct-num-ce nb-hidden', '', 'π.χ. Α΄');

  const display = document.createElement('h2');
  display.className = 'govuk-heading-s nb-struct-display';
  display.append(document.createTextNode(prefix + ' '), autoNum, manNum);

  const nameLine = ce('p', 'nb-struct-name-val nb-hidden');

  const wrap = document.createElement('div');
  wrap.append(display, nameLine);
  return wrap;
}

// ── Άρθρο block ───────────────────────────────────────

function makeArthroContent(_id: number): HTMLElement {
  const autoNum  = ce('h2', 'nb-arthro-num-label govuk-heading-s', { 'data-auto': 'arthro' });
  const manNum   = editable('span', 'nb-arthro-num-label govuk-heading-s nb-arthro-num-ce nb-hidden', '', 'Άρθρο...');
  const titleField = editable('h3', 'nb-arthro-title-field govuk-heading-s nb-hidden', '', 'Τίτλος άρθρου...');

  const display = ce('div', 'nb-arthro-display');
  display.append(autoNum, manNum, titleField);

  const parasList = ce('div', 'nb-paras-list');

  const ermLabel = ce('div', 'nb-ermineytiki-block-label', {}, 'Ερμηνευτική Δήλωση');
  const ermBody  = editable('div', 'nb-ermineytiki-body-ce', '', 'Κείμενο ερμηνευτικής δήλωσης...');
  const ermBlock = ce('div', 'nb-ermineytiki-block');
  ermBlock.append(ermLabel, ermBody);
  const ermSect = ce('div', 'nb-arthro-ermineytiki nb-hidden');
  ermSect.append(ermBlock);

  const wrap = document.createElement('div');
  wrap.append(display, parasList, ermSect);
  return wrap;
}

// ── Paragraph management ──────────────────────────────

function addPara(list: HTMLElement) {
  const para = makePara(list);
  list.appendChild(para);
  renumParas(list);
  para.querySelector<HTMLElement>('.nb-para-body')?.focus();
}

function makePara(list: HTMLElement): HTMLElement {
  const para = document.createElement('div');
  para.className = 'nb-para';

  const numSpan = ce('span', 'nb-para-num');
  const body    = editable('div', 'nb-para-body', '', 'Κείμενο παραγράφου...');

  const menuBtn = document.createElement('button');
  menuBtn.type = 'button';
  menuBtn.className = 'nb-para-menu-btn';
  menuBtn.setAttribute('aria-label', 'Επιλογές παραγράφου');
  menuBtn.textContent = '⋮';
  menuBtn.addEventListener('click', e => { e.stopPropagation(); openDd(menuBtn, { kind: 'para', para, list }); });

  const row = ce('div', 'nb-para-row');
  row.append(numSpan, body, menuBtn);

  const subsList = ce('div', 'nb-subparas-list');
  para.append(row, subsList);
  return para;
}

function renumParas(list: HTMLElement) {
  list.querySelectorAll<HTMLElement>(':scope > .nb-para .nb-para-num').forEach((el, i) => {
    el.textContent = String(i + 1) + '.';
  });
}

// ── Sub-paragraph management (α β γ) ─────────────────

function addSubPara(list: HTMLElement) {
  const sub = makeSubPara(list);
  list.appendChild(sub);
  renumSubParas(list);
  sub.querySelector<HTMLElement>('.nb-subpara-body')?.focus();
}

function makeSubPara(list: HTMLElement): HTMLElement {
  const sub = document.createElement('div');
  sub.className = 'nb-subpara';

  const numSpan = ce('span', 'nb-subpara-num');
  const body    = editable('div', 'nb-subpara-body', '', 'Κείμενο υποπαραγράφου...');

  const menuBtn = document.createElement('button');
  menuBtn.type = 'button';
  menuBtn.className = 'nb-para-menu-btn';
  menuBtn.setAttribute('aria-label', 'Επιλογές υποπαραγράφου');
  menuBtn.textContent = '⋮';
  menuBtn.addEventListener('click', e => { e.stopPropagation(); openDd(menuBtn, { kind: 'subpara', sub, list }); });

  const row = ce('div', 'nb-subpara-row');
  row.append(numSpan, body, menuBtn);

  const subsubs = ce('div', 'nb-subsubparas-list');
  sub.append(row, subsubs);
  return sub;
}

function renumSubParas(list: HTMLElement) {
  list.querySelectorAll<HTMLElement>(':scope > .nb-subpara .nb-subpara-num').forEach((el, i) => {
    el.textContent = grL(i);
  });
}

// ── Sub-sub-paragraph management (αα ββ) ─────────────

function addSubSubPara(list: HTMLElement) {
  const el = makeSubSubPara(list);
  list.appendChild(el);
  renumSubSubParas(list);
  el.querySelector<HTMLElement>('.nb-subsubpara-body')?.focus();
}

function makeSubSubPara(list: HTMLElement): HTMLElement {
  const el = document.createElement('div');
  el.className = 'nb-subsubpara';

  const numSpan = ce('span', 'nb-subsubpara-num');
  const body    = editable('div', 'nb-subsubpara-body', '', 'Κείμενο...');

  const menuBtn = document.createElement('button');
  menuBtn.type = 'button';
  menuBtn.className = 'nb-para-menu-btn';
  menuBtn.setAttribute('aria-label', 'Επιλογές υπο-υποπαραγράφου');
  menuBtn.textContent = '⋮';
  menuBtn.addEventListener('click', e => { e.stopPropagation(); openDd(menuBtn, { kind: 'subsubpara', el, list }); });

  el.append(numSpan, body, menuBtn);
  return el;
}

function renumSubSubParas(list: HTMLElement) {
  list.querySelectorAll<HTMLElement>(':scope > .nb-subsubpara .nb-subsubpara-num').forEach((el, i) => {
    el.textContent = grLL(i);
  });
}

// ── Auto-numbering ────────────────────────────────────

function renum() {
  let artN = 0, merosN = 0, kefN = 0, tmimaN = 0, aitN = 0;

  paper.querySelectorAll<HTMLElement>('.nb-block').forEach(block => {
    const type = block.dataset.type!;
    const manual = block.dataset.hasManualNum === 'true';

    if (type === 'aitiologiki') {
      aitN++;
      const el = block.querySelector<HTMLElement>('[data-auto="aitiologiki"]');
      if (el) el.textContent = String(aitN) + '.';
    }
    if (type === 'meros') {
      merosN++;
      const el = block.querySelector<HTMLElement>('[data-auto="meros"]');
      if (el && !manual) el.textContent = grU(merosN - 1);
    }
    if (type === 'kefalaio') {
      kefN++;
      const el = block.querySelector<HTMLElement>('[data-auto="kefalaio"]');
      if (el && !manual) el.textContent = grU(kefN - 1);
    }
    if (type === 'tmima') {
      tmimaN++;
      const el = block.querySelector<HTMLElement>('[data-auto="tmima"]');
      if (el && !manual) el.textContent = grU(tmimaN - 1);
    }
    if (type === 'arthro') {
      artN++;
      const el = block.querySelector<HTMLElement>('[data-auto="arthro"]');
      if (el && !manual) el.textContent = 'Άρθρο ' + artN;
    }
  });
}

// ── Move block ────────────────────────────────────────

function moveBlock(el: HTMLElement, dir: -1 | 1) {
  if (dir === -1) {
    const prev = el.previousElementSibling as HTMLElement | null;
    if (prev) paper.insertBefore(el, prev);
  } else {
    const next = el.nextElementSibling as HTMLElement | null;
    if (next) paper.insertBefore(next, el);
  }
}

// ── Empty state ───────────────────────────────────────

function showEmpty() {
  const p = document.createElement('p');
  p.id = 'nb-empty';
  p.className = 'nb-empty';
  p.textContent = 'Κάντε κλικ σε ένα στοιχείο για να ξεκινήσετε.';
  paper.appendChild(p);
}

// ── Modals ────────────────────────────────────────────

const clearModal    = document.getElementById('nb-clear-modal')      as HTMLElement;
const lawNumberModal = document.getElementById('nb-law-number-modal') as HTMLElement;
const lawNumberInput  = document.getElementById('nb-law-number')   as HTMLInputElement;
const lawTitleInput   = document.getElementById('nb-law-title')    as HTMLInputElement;
const lawSubtitleInput = document.getElementById('nb-law-subtitle') as HTMLInputElement;
const lawDateInput    = document.getElementById('nb-law-date')     as HTMLInputElement;

document.getElementById('btn-print')!.addEventListener('click', () => window.print());
document.getElementById('btn-clear')!.addEventListener('click', () => openModal(clearModal));

document.getElementById('nb-clear-confirm')!.addEventListener('click', () => {
  paper.innerHTML = '';
  blockSeq = 0;
  closeModal(clearModal);
  showEmpty();
});
document.getElementById('nb-clear-cancel')!.addEventListener('click', () => closeModal(clearModal));
clearModal.addEventListener('click', e => { if (e.target === clearModal) closeModal(clearModal); });

document.getElementById('nb-law-save')!.addEventListener('click', () => {
  const vals = {
    number:   lawNumberInput.value,
    title:    lawTitleInput.value,
    subtitle: lawSubtitleInput.value,
    date:     lawDateInput.value,
  };
  if (activeBlock) {
    updateLawBlock(activeBlock, vals);
  } else if (pendingBlockType === 'arithmos-nomou') {
    document.getElementById('nb-empty')?.remove();
    const block = makeBlockEl(pendingBlockType, ++blockSeq);
    paper.appendChild(block);
    updateLawBlock(block, vals);
    renum();
  }
  pendingBlockType = null;
  closeModal(lawNumberModal);
});

document.getElementById('nb-law-cancel')!.addEventListener('click', () => {
  pendingBlockType = null;
  closeModal(lawNumberModal);
});
lawNumberModal.addEventListener('click', e => {
  if (e.target === lawNumberModal) { pendingBlockType = null; closeModal(lawNumberModal); }
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeDd();
    if (!clearModal.classList.contains('nb-hidden'))     closeModal(clearModal);
    if (!lawNumberModal.classList.contains('nb-hidden')) closeModal(lawNumberModal);
  }
});

// ── Helpers ───────────────────────────────────────────

function populateLawModal(block: HTMLElement | null) {
  lawNumberInput.value   = block?.querySelector<HTMLElement>('.nb-nomou-num')?.textContent?.trim()      ?? "ΝΟΜΟΣ ΥΠ' ΑΡΙΘ. ____/2025";
  lawTitleInput.value    = block?.querySelector<HTMLElement>('.nb-nomou-title')?.textContent?.trim()    ?? 'ΤΙΤΛΟΣ ΝΟΜΟΥ';
  lawSubtitleInput.value = block?.querySelector<HTMLElement>('.nb-nomou-subtitle')?.textContent?.trim() ?? 'ΤΡΟΠΟΠΟΙΗΣΗ / ΣΥΜΠΛΗΡΩΣΗ ΔΙΑΤΑΞΕΩΝ...';
  lawDateInput.value     = block?.querySelector<HTMLElement>('.nb-nomou-date')?.textContent?.trim()     ?? '(ΦΕΚ Α΄ ___/__.__.2025)';
}

function updateLawBlock(block: HTMLElement, v: { number: string; title: string; subtitle: string; date: string }) {
  block.querySelector<HTMLElement>('.nb-nomou-num')!.textContent      = v.number.trim().toUpperCase()  || "ΝΟΜΟΣ ΥΠ' ΑΡΙΘ. ____/2025";
  block.querySelector<HTMLElement>('.nb-nomou-title')!.textContent    = v.title.trim()                 || 'Τίτλος νόμου';
  block.querySelector<HTMLElement>('.nb-nomou-subtitle')!.textContent = v.subtitle.trim()              || 'Τροποποίηση / συμπλήρωση διατάξεων...';
  block.querySelector<HTMLElement>('.nb-nomou-date')!.textContent     = v.date.trim()                  || '(ΦΕΚ Α΄ ___/__.__.2025)';
}

function editable(tag: string, cls: string, text: string, placeholder: string): HTMLElement {
  const el = ce(tag, cls, { contenteditable: 'true' }, text || undefined);
  el.dataset.ph = placeholder;
  return el;
}

function openModal(modal: HTMLElement) {
  modal.classList.remove('nb-hidden');
  document.body.classList.add('nb-modal-open');
}

function closeModal(modal: HTMLElement) {
  modal.classList.add('nb-hidden');
  document.body.classList.remove('nb-modal-open');
}

function ce(tag: string, cls: string, attrs: Record<string, string> = {}, text?: string): HTMLElement {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  if (text !== undefined) el.textContent = text;
  return el;
}
