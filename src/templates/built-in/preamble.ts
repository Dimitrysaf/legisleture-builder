import type { Template } from '../types';

const AUTHORITY_OPTIONS = [
  { value: 'Η ΒΟΥΛΗ ΤΩΝ ΕΛΛΗΝΩΝ',                        label: 'Η ΒΟΥΛΗ ΤΩΝ ΕΛΛΗΝΩΝ' },
  { value: 'Ο ΠΡΟΕΔΡΟΣ ΤΗΣ ΕΛΛΗΝΙΚΗΣ ΔΗΜΟΚΡΑΤΙΑΣ',       label: 'Ο ΠΡΟΕΔΡΟΣ ΤΗΣ ΕΛΛΗΝΙΚΗΣ ΔΗΜΟΚΡΑΤΙΑΣ' },
  { value: 'ΤΟ ΥΠΟΥΡΓΙΚΟ ΣΥΜΒΟΥΛΙΟ',                      label: 'ΤΟ ΥΠΟΥΡΓΙΚΟ ΣΥΜΒΟΥΛΙΟ' },
  { value: 'Ο ΥΠΟΥΡΓΟΣ',                                   label: 'Ο ΥΠΟΥΡΓΟΣ (συμπληρώστε)' },
  { value: 'ΟΙ ΥΠΟΥΡΓΟΙ',                                  label: 'ΟΙ ΥΠΟΥΡΓΟΙ (συμπληρώστε)' },
];

const CONCLUSION_OPTIONS = [
  { value: 'ψηφίσαμε',      label: 'ψηφίσαμε (Νόμος)' },
  { value: 'αποφασίζουμε',  label: 'αποφασίζουμε (ΥΑ / ΚΥΑ)' },
  { value: 'εκδίδουμε',     label: 'εκδίδουμε (ΠΔ)' },
  { value: 'διατάσσουμε',   label: 'διατάσσουμε (Πράξη ΥΣ)' },
  { value: 'εγκρίνουμε',    label: 'εγκρίνουμε' },
];

export const preambleTemplate: Template = {
  id: 'preamble',
  name: 'Προοίμιο',
  icon: 'scroll',
  description: 'Εισαγωγικό μέρος πράξης: αρχή, νομικές βάσεις, αποφασιστικό',
  category: 'structure',
  fields: [
    {
      id: 'authority',
      label: 'Εκδίδουσα αρχή',
      type: 'select',
      required: true,
      defaultValue: 'Η ΒΟΥΛΗ ΤΩΝ ΕΛΛΗΝΩΝ',
      options: AUTHORITY_OPTIONS,
    },
    {
      id: 'authority_suffix',
      label: 'Συμπλήρωμα αρχής',
      type: 'text',
      required: false,
      placeholder: 'π.χ. ΕΣΩΤΕΡΙΚΩΝ ή ΟΙΚΟΝΟΜΙΚΩΝ ΚΑΙ ΕΣΩΤΕΡΙΚΩΝ',
      hint: 'Συμπληρώστε μόνο αν επιλέξατε «Ο ΥΠΟΥΡΓΟΣ» / «ΟΙ ΥΠΟΥΡΓΟΙ» παραπάνω.',
    },
    {
      id: 'bases',
      label: 'Νομικές βάσεις — «Έχοντας υπόψη:»',
      type: 'rich-text',
      required: true,
      hint: 'Χρησιμοποιήστε αριθμημένη λίστα. Π.χ. «1. Τις διατάξεις των άρθρων ... του ν. 4622/2019».',
    },
    {
      id: 'proposal',
      label: 'Εισήγηση / Πρόταση',
      type: 'text',
      required: false,
      placeholder: 'π.χ. Με πρόταση του Υπουργού Εσωτερικών,',
      hint: 'Αφήστε κενό αν δεν υπάρχει εισήγηση (π.χ. για Νόμο).',
    },
    {
      id: 'conclusion',
      label: 'Αποφασιστικό',
      type: 'select',
      required: true,
      defaultValue: 'ψηφίσαμε',
      options: CONCLUSION_OPTIONS,
    },
  ],
  render(data) {
    const authority = [
      data.authority?.trim(),
      data.authority_suffix?.trim(),
    ].filter(Boolean).join(' ');

    const bases = data.bases ?? '';
    const proposal = data.proposal?.trim();
    const conclusion = data.conclusion?.trim() || 'αποφασίζουμε';

    const proposalHtml = proposal
      ? `\n  <p class="nb-preamble-proposal">${proposal}</p>`
      : '';

    return `<div class="nb-block nb-block--preamble" data-template="preamble">
  <div class="nb-preamble">
    <p class="nb-preamble-authority">${authority}</p>
    <p class="nb-preamble-having">Έχοντας υπόψη:</p>
    <div class="nb-preamble-bases">${bases}</div>${proposalHtml}
    <p class="nb-preamble-conclusion">${conclusion}:</p>
  </div>
</div>`;
  },
};
