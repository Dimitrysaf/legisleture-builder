import type { Template } from '../types';

export const partTemplate: Template = {
  id: 'part',
  name: 'Μέρος',
  icon: 'bookmark',
  description: 'Ανώτατη διαιρετική ενότητα – περιέχει κεφάλαια',
  category: 'structure',
  fields: [
    { id: 'number', label: 'Αριθμός (π.χ. Α΄, Πρώτο)', type: 'text', required: true, placeholder: 'Α΄' },
    { id: 'title', label: 'Τίτλος μέρους', type: 'text', required: true, placeholder: 'ΓΕΝΙΚΕΣ ΔΙΑΤΑΞΕΙΣ' },
    { id: 'chapters', label: 'Κεφάλαια', type: 'container' },
  ],
  render(data) {
    return `<div class="nb-block nb-block--part" data-template="part">
  <h1 class="nb-part-heading">Μέρος ${data.number} – ${data.title}</h1>
  <div class="nb-container-zone nb-part-body" data-container-for="chapters"></div>
</div>`;
  },
};
