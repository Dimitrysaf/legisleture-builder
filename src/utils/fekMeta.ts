const STORAGE_KEY = 'nb_fek_meta_v1';

export interface FekMeta {
  teuchos: string;    // Τεύχος: Α΄ | Β΄ | Γ΄ | Δ΄ | ...
  arithmos: string;   // Αριθμός ΦΕΚ: π.χ. 1234
  hmeromhnia: string; // Ημερομηνία: π.χ. 18.6.2026
  titlos: string;     // Τίτλος νόμου / πράξης
}

export const EMPTY_META: FekMeta = {
  teuchos: '', arithmos: '', hmeromhnia: '', titlos: '',
};

export function loadFekMeta(): FekMeta {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY_META };
    return { ...EMPTY_META, ...JSON.parse(raw) };
  } catch {
    return { ...EMPTY_META };
  }
}

export function saveFekMeta(meta: FekMeta): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(meta));
}

export function hasFekMeta(meta: FekMeta): boolean {
  return !!(meta.teuchos || meta.arithmos || meta.hmeromhnia || meta.titlos);
}

/**
 * Builds the ΦΕΚ header HTML fragment.
 * `coatOfArmsSrc` is either a URL ("/Coat_of_arms_of_Greece.svg") for browser
 * rendering or an inline SVG string for self-contained HTML export.
 */
export function buildFekHeaderHtml(meta: FekMeta, coatOfArmsSrc: string): string {
  const isInlineSvg = coatOfArmsSrc.trimStart().startsWith('<');
  const emblemHtml = isInlineSvg
    ? `<div class="nb-fek-emblem">${coatOfArmsSrc}</div>`
    : `<div class="nb-fek-emblem"><img src="${coatOfArmsSrc}" alt="Εθνόσημο" class="nb-fek-emblem-img"></div>`;

  const metaRight = [
    meta.teuchos   ? `ΤΕΥΧΟΣ ${meta.teuchos}` : '',
    meta.arithmos  ? `Αρ. Φύλλου ${meta.arithmos}` : '',
    meta.hmeromhnia ? meta.hmeromhnia : '',
  ].filter(Boolean).join(' · ');

  const titlosRow = meta.titlos
    ? `<div class="nb-fek-law-title">${meta.titlos}</div>`
    : '';

  return `<header class="nb-fek-header">
  <div class="nb-fek-head-row">
    <div class="nb-fek-identity">
      ${emblemHtml}
      <svg class="nb-fek-gazette-svg" xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 247 66" preserveAspectRatio="none"
        role="img" aria-label="ΕΦΗΜΕΡΙΔΑ ΤΗΣ ΚΥΒΕΡΝΗΣΕΩΣ ΤΗΣ ΕΛΛΗΝΙΚΗΣ ΔΗΜΟΚΡΑΤΙΑΣ">
        <text x="1" y="28"
          font-family="'Noto Serif',Georgia,'Times New Roman',serif"
          font-weight="900" font-size="30" fill="#003476"
          textLength="245" lengthAdjust="spacingAndGlyphs">ΕΦΗΜΕΡΙΔΑ ΤΗΣ ΚΥΒΕΡΝΗΣΕΩΣ</text>
        <text x="1" y="60"
          font-family="'Noto Serif',Georgia,'Times New Roman',serif"
          font-weight="900" font-size="30" fill="#003476"
          textLength="245" lengthAdjust="spacingAndGlyphs">ΤΗΣ ΕΛΛΗΝΙΚΗΣ ΔΗΜΟΚΡΑΤΙΑΣ</text>
      </svg>
    </div>
    ${metaRight ? `<div class="nb-fek-meta-right">${metaRight.replace(/ · /g, '<br>')}</div>` : ''}
  </div>
  <hr class="nb-fek-rule">
  ${titlosRow}
</header>`;
}
