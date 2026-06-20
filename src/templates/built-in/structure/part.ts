import type { Template } from '../../types';

export const partTemplate: Template = {
  id: 'part',
  name: 'Μέρος',
  icon: 'bookmark',
  description: 'Ανώτατη διαιρετική ενότητα – περιέχει τμήματα',
  category: 'structure',
  fields: [
    { id: 'number', label: 'Αριθμός (π.χ. Α΄, Πρώτο)', type: 'text', required: true, placeholder: 'Α΄' },
    { id: 'title', label: 'Τίτλος μέρους', type: 'text', required: true, placeholder: 'ΓΕΝΙΚΕΣ ΔΙΑΤΑΞΕΙΣ' },
    { id: 'sections', label: 'Τμήματα', type: 'container' },
  ],
  render(data) {
    return `<div class="nb-block nb-block--part" data-template="part">
  <div class="nb-struct-heading nb-struct-heading--part">
    <span class="nb-struct-role">Μέρος ${data.number}</span>
    <span class="nb-struct-rule"></span>
    <span class="nb-struct-title">${data.title}</span>
  </div>
  <div class="nb-container-zone nb-part-body" data-container-for="sections"></div>
</div>`;
  },
};
