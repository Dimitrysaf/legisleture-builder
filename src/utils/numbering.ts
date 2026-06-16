const GREEK_LETTERS = ['Α', 'Β', 'Γ', 'Δ', 'Ε', 'ΣΤ', 'Ζ', 'Η', 'Θ', 'Ι', 'ΙΑ', 'ΙΒ', 'ΙΓ', 'ΙΔ', 'ΙΕ', 'ΙΣΤ', 'ΙΖ', 'ΙΗ', 'ΙΘ', 'Κ'];
const GREEK_ORDINALS = [
  'Πρώτο', 'Δεύτερο', 'Τρίτο', 'Τέταρτο', 'Πέμπτο',
  'Έκτο', 'Έβδομο', 'Όγδοο', 'Ένατο', 'Δέκατο',
  'Ενδέκατο', 'Δωδέκατο', 'Δέκατο Τρίτο', 'Δέκατο Τέταρτο', 'Δέκατο Πέμπτο',
  'Δέκατο Έκτο', 'Δέκατο Έβδομο', 'Δέκατο Όγδοο', 'Δέκατο Ένατο', 'Εικοστό',
];

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

export function countBlocksOfType(templateId: string, container: HTMLElement): number {
  return Array.from(container.children).filter(
    el => el.querySelector(`[data-template="${templateId}"]`) !== null
  ).length;
}
