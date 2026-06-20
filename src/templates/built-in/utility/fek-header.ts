import type { Template } from '../../types';
import { buildFekHeaderHtml } from '../../../utils/fekMeta';

const TEUCHOS_OPTIONS = [
  { value: '',       label: '—' },
  { value: "Α΄",    label: "Α΄" },
  { value: "Β΄",    label: "Β΄" },
  { value: "Γ΄",    label: "Γ΄" },
  { value: "Δ΄",    label: "Δ΄" },
  { value: 'ΑΑΠ',   label: 'ΑΑΠ' },
  { value: 'ΑΑΝ',   label: 'ΑΑΝ' },
  { value: "ΥΟΔ΄",  label: "ΥΟΔ΄" },
  { value: 'Δ.Δ.Σ.', label: 'Δ.Δ.Σ.' },
];

export const fekHeaderTemplate: Template = {
  id: 'fek-header',
  name: 'Επικεφαλίδα ΦΕΚ',
  icon: 'newspaper',
  description: 'Επικεφαλίδα Εφημερίδας της Κυβερνήσεως',
  category: 'utility',
  fields: [
    {
      id: 'teuchos',
      label: 'Τεύχος',
      type: 'select',
      options: TEUCHOS_OPTIONS,
    },
    {
      id: 'arithmos',
      label: 'Αρ. Φύλλου',
      type: 'text',
      placeholder: 'π.χ. 1234',
    },
    {
      id: 'hmeromhnia',
      label: 'Ημερομηνία',
      type: 'text',
      placeholder: 'π.χ. 18.6.2026',
    },
    {
      id: 'titlos',
      label: 'Τίτλος νόμου / πράξης',
      type: 'text',
      placeholder: "π.χ. ΝΟΜΟΣ ΥΠ' ΑΡΙΘΜ. 5123",
    },
    {
      id: 'twoColumn',
      label: 'Διάταξη κειμένου',
      type: 'select',
      defaultValue: 'false',
      options: [
        { value: 'false', label: 'Μονόστηλη' },
        { value: 'true',  label: 'Δίστηλη' },
      ],
    },
  ],
  render(data) {
    const twoColumn = data.twoColumn === 'true';
    return `<div class="nb-block nb-block--fek-header" data-template="fek-header" data-two-column="${twoColumn}">${buildFekHeaderHtml(
      {
        teuchos:    data.teuchos    ?? '',
        arithmos:   data.arithmos   ?? '',
        hmeromhnia: data.hmeromhnia ?? '',
        titlos:     data.titlos     ?? '',
        twoColumn,
      },
      '/Coat_of_arms_of_Greece.svg',
    )}</div>`;
  },
};
