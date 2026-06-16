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

export function countBlocksOfType(templateId: string, container: HTMLElement): number {
  return Array.from(container.children).filter(
    el => el.querySelector(`[data-template="${templateId}"]`) !== null
  ).length;
}
