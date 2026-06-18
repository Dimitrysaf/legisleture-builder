import type { TemplateInstance } from '../templates/types';
import { registerEntry, getEntry } from './docRegistry';

const GREEK_LETTERS = ['Α', 'Β', 'Γ', 'Δ', 'Ε', 'ΣΤ', 'Ζ', 'Η', 'Θ', 'Ι', 'ΙΑ', 'ΙΒ', 'ΙΓ', 'ΙΔ', 'ΙΕ', 'ΙΣΤ', 'ΙΖ', 'ΙΗ', 'ΙΘ', 'Κ'];
const GREEK_ORDINALS = [
  'Πρώτο', 'Δεύτερο', 'Τρίτο', 'Τέταρτο', 'Πέμπτο',
  'Έκτο', 'Έβδομο', 'Όγδοο', 'Ένατο', 'Δέκατο',
  'Ενδέκατο', 'Δωδέκατο', 'Δέκατο Τρίτο', 'Δέκατο Τέταρτο', 'Δέκατο Πέμπτο',
  'Δέκατο Έκτο', 'Δέκατο Έβδομο', 'Δέκατο Όγδοο', 'Δέκατο Ένατο', 'Εικοστό',
];

// Lowercase Greek alphabet used for sub-paragraph hierarchical numbering
const GREEK_LOWER = ['α','β','γ','δ','ε','ζ','η','θ','ι','κ','λ','μ','ν','ξ','ο','π','ρ','σ','τ','υ','φ','χ','ψ','ω'];

export function toArabic(n: number): string {
  return String(n);
}

export function toGreekLetter(n: number): string {
  return n >= 1 && n <= GREEK_LETTERS.length ? `${GREEK_LETTERS[n - 1]}΄` : String(n);
}

export function toGreekWord(n: number): string {
  return n >= 1 && n <= GREEK_ORDINALS.length ? GREEK_ORDINALS[n - 1] : String(n);
}

export function allFormats(n: number): [string, string, string] {
  return [toArabic(n), toGreekLetter(n), toGreekWord(n)];
}

/**
 * Generates a Greek lowercase sub-paragraph label.
 *   depth 1 → α, β, γ …
 *   depth 2 → αα, αβ, αγ … βα, ββ …
 *   depth 3 → ααα, ααβ … etc.
 */
export function toGreekSubNum(n: number, depth: number): string {
  if (depth <= 1) return GREEK_LOWER[(n - 1) % GREEK_LOWER.length] ?? String(n);
  const base = GREEK_LOWER.length;
  const firstIdx = Math.floor((n - 1) / base);
  const rest = ((n - 1) % base) + 1;
  return (GREEK_LOWER[firstIdx] ?? String(firstIdx)) + toGreekSubNum(rest, depth - 1);
}

/**
 * Returns the nesting depth for a sub-paragraph being inserted into `container`.
 * Depth 1 = directly inside a paragraph, depth 2 = inside a sub-paragraph, etc.
 */
export function getSubParaDepth(container: HTMLElement): number {
  let depth = 0;
  let el: HTMLElement | null = container;
  while (el) {
    if ((el as HTMLElement).dataset?.template === 'subparagraph') depth++;
    el = el.parentElement;
  }
  return depth + 1;
}

/**
 * Count direct-child blocks of a given template type within a container zone.
 * Uses :scope to avoid counting deeply nested blocks of the same type.
 */
export function countBlocksOfType(templateId: string, container: HTMLElement): number {
  return Array.from(container.children).filter(el => {
    const block = (el as HTMLElement).querySelector(':scope > .nb-block');
    return block?.getAttribute('data-template') === templateId;
  }).length;
}

// ── Auto-renumbering ──────────────────────────────────────────────────────────

// Display prefix used in .nb-struct-role for each auto-numbered structural type.
const STRUCT_PREFIX: Record<string, string> = {
  article:      'Άρθρο',
  transitional: 'Μεταβατική Διάταξη',
};

/** Returns the direct container zone element for `key` within a block wrapper. */
function zoneEl(wrapper: HTMLElement, key: string): HTMLElement | null {
  return wrapper.querySelector<HTMLElement>(
    `:scope > .nb-block > .nb-container-zone[data-container-for="${key}"]`,
  );
}

/**
 * Updates a block's number in memory, the docRegistry, and the DOM heading.
 * No-ops if the number is already correct.
 */
function applyNumber(
  wrapper: HTMLElement,
  inst: TemplateInstance,
  newNum: string,
): void {
  if (inst.data.number === newNum) return;
  inst.data.number = newNum;
  registerEntry(inst.id, inst.templateId, inst.data);

  const tid = inst.templateId;
  if (tid === 'paragraph' || tid === 'subparagraph') {
    const numEl = wrapper.querySelector<HTMLElement>(':scope > .nb-block .nb-para-num');
    if (numEl) numEl.textContent = `${newNum}.`;
  } else {
    const prefix = STRUCT_PREFIX[tid];
    if (prefix) {
      const roleEl = wrapper.querySelector<HTMLElement>(':scope > .nb-block .nb-struct-role');
      if (roleEl) roleEl.textContent = `${prefix} ${newNum}`;
    }
  }
}

function walkSubparagraphZone(
  container: HTMLElement,
  instances: Map<string, TemplateInstance>,
  depth: number,
): void {
  let count = 0;
  for (const el of Array.from(container.children) as HTMLElement[]) {
    if (!el.classList.contains('nb-block-wrapper')) continue;
    const id = el.dataset.instanceId;
    if (!id) continue;
    const inst = instances.get(id);
    if (!inst || inst.templateId !== 'subparagraph') continue;
    count++;
    applyNumber(el, inst, toGreekSubNum(count, depth));
    const sub = zoneEl(el, 'subparagraphs');
    if (sub) walkSubparagraphZone(sub, instances, depth + 1);
  }
}

function walkParagraphZone(
  container: HTMLElement,
  instances: Map<string, TemplateInstance>,
): void {
  let count = 0;
  for (const el of Array.from(container.children) as HTMLElement[]) {
    if (!el.classList.contains('nb-block-wrapper')) continue;
    const id = el.dataset.instanceId;
    if (!id) continue;
    const inst = instances.get(id);
    if (!inst || inst.templateId !== 'paragraph') continue;
    count++;
    applyNumber(el, inst, String(count));
    const sub = zoneEl(el, 'subparagraphs');
    if (sub) walkSubparagraphZone(sub, instances, 1);
  }
}

function walkStructure(
  container: HTMLElement,
  instances: Map<string, TemplateInstance>,
  counters: { article: number; transitional: number },
): void {
  for (const el of Array.from(container.children) as HTMLElement[]) {
    if (!el.classList.contains('nb-block-wrapper')) continue;
    const id = el.dataset.instanceId;
    if (!id) continue;
    const inst = instances.get(id);
    if (!inst) continue;

    switch (inst.templateId) {
      case 'part': {
        const z = zoneEl(el, 'sections');
        if (z) walkStructure(z, instances, counters);
        break;
      }
      case 'section': {
        const z = zoneEl(el, 'chapters');
        if (z) walkStructure(z, instances, counters);
        break;
      }
      case 'chapter': {
        const z = zoneEl(el, 'articles');
        if (z) walkStructure(z, instances, counters);
        break;
      }
      case 'article': {
        counters.article++;
        applyNumber(el, inst, String(counters.article));
        const z = zoneEl(el, 'body');
        if (z) walkParagraphZone(z, instances);
        break;
      }
      case 'transitional': {
        counters.transitional++;
        applyNumber(el, inst, String(counters.transitional));
        const z = zoneEl(el, 'body');
        if (z) walkParagraphZone(z, instances);
        break;
      }
      case 'annex': {
        const z = zoneEl(el, 'body');
        if (z) walkParagraphZone(z, instances);
        break;
      }
    }
  }
}

/**
 * Refreshes the text of all live cross-reference anchors that carry
 * a `data-ref-fmt` attribute (set at insertion time by RefPickerModal).
 * Refs without the attribute (from older saves) are left untouched.
 */
function refreshCrossRefs(paper: HTMLElement): void {
  paper.querySelectorAll<HTMLElement>('.nb-ref[data-ref-id][data-ref-fmt]').forEach(el => {
    const entry = getEntry(el.dataset.refId!);
    if (!entry) return;
    let text: string;
    switch (el.dataset.refFmt) {
      case 'lower':    text = entry.label.toLowerCase(); break;
      case 'genitive': text = entry.genLabel.toLowerCase(); break;
      case 'abbr':     text = entry.abbrLabel; break;
      case 'number':   text = entry.number; break;
      default:         text = entry.label; break;
    }
    el.textContent = text;
  });
}

/**
 * Walks the entire document tree and reassigns sequential numbers to:
 *   - articles (globally continuous arabic)
 *   - transitional provisions (globally continuous arabic, separate counter)
 *   - paragraphs (arabic, reset per article/transitional)
 *   - subparagraphs (Greek lowercase, reset per paragraph, depth-aware)
 *
 * Parts, sections, chapters, and annexes keep user-defined numbers.
 * After renumbering, all live cross-reference anchors are refreshed.
 */
export function renumberDocument(
  paper: HTMLElement,
  instances: Map<string, TemplateInstance>,
): void {
  const counters = { article: 0, transitional: 0 };
  walkStructure(paper, instances, counters);
  refreshCrossRefs(paper);
}
