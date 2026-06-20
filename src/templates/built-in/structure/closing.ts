import type { Template } from '../../types';

export const closingTemplate: Template = {
  id: 'closing',
  name: 'Υπογραφές',
  icon: 'pen-line',
  description: 'Τόπος, ημερομηνία και υπογράφοντες',
  category: 'structure',
  fields: [
    {
      id: 'place_date',
      label: 'Τόπος και ημερομηνία',
      type: 'text',
      placeholder: 'Αθήνα, 1 Ιανουαρίου 2027',
    },
    {
      id: 'signatories',
      label: 'Υπογράφοντες',
      type: 'textarea',
      hint: 'Κάθε υπογράφων σε ξεχωριστή ομάδα (χωρισμένη με κενή γραμμή). Γραμμή 1: Τίτλος/Ιδιότητα, Γραμμή 2: Ονοματεπώνυμο.',
      placeholder: 'Ο ΠΡΩΘΥΠΟΥΡΓΟΣ\nΚυριάκος Μητσοτάκης\n\nΟ ΥΠΟΥΡΓΟΣ ΟΙΚΟΝΟΜΙΚΩΝ\nΧρήστος Σταϊκούρας',
    },
  ],
  render(data) {
    const placeDate = data.place_date?.trim();
    const placeDateHtml = placeDate
      ? `<div class="nb-closing-date">${placeDate}</div>`
      : '';

    const groups = (data.signatories ?? '')
      .split(/\n\s*\n/)
      .map(g => g.trim())
      .filter(Boolean);

    const sigHtml = groups
      .map(group => {
        const lines = group.split('\n').map(l => l.trim()).filter(Boolean);
        const role = lines[0] ?? '';
        const name = lines[1] ?? '';
        return `<div class="nb-signatory">
    <div class="nb-signatory-role">${role}</div>
    ${name ? `<div class="nb-signatory-name">${name}</div>` : ''}
  </div>`;
      })
      .join('');

    return `<div class="nb-block nb-block--closing" data-template="closing">
  ${placeDateHtml}
  <div class="nb-signatories">${sigHtml}</div>
</div>`;
  },
};
