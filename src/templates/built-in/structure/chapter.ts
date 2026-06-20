import type { Template } from '../../types';

export const chapterTemplate: Template = {
  id: 'chapter',
  name: 'Κεφάλαιο',
  icon: 'layers',
  description: 'Υποδιαίρεση τμήματος – περιέχει άρθρα',
  category: 'structure',
  fields: [
    { id: 'number', label: 'Αριθμός (π.χ. Α΄, Β΄, Ι, ΙΙ)', type: 'text', required: true, placeholder: 'Α΄' },
    { id: 'title', label: 'Τίτλος κεφαλαίου', type: 'text', required: true, placeholder: 'ΓΕΝΙΚΕΣ ΔΙΑΤΑΞΕΙΣ' },
    { id: 'articles', label: 'Άρθρα', type: 'container' },
  ],
  render(data) {
    return `<div class="nb-block nb-block--chapter" data-template="chapter">
  <div class="nb-struct-heading nb-struct-heading--chapter">
    <span class="nb-struct-role">Κεφάλαιο ${data.number}</span>
    <span class="nb-struct-rule"></span>
    <span class="nb-struct-title">${data.title}</span>
  </div>
  <div class="nb-container-zone nb-chapter-body" data-container-for="articles"></div>
</div>`;
  },
};
