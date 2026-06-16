import type { Template } from '../types';

export const chapterTemplate: Template = {
  id: 'chapter',
  name: 'Κεφάλαιο',
  icon: 'layers',
  description: 'Ενότητα νόμου – περιέχει άρθρα',
  category: 'structure',
  fields: [
    { id: 'number', label: 'Αριθμός (π.χ. Α΄, Β΄, Ι, ΙΙ)', type: 'text', required: true, placeholder: 'Α΄' },
    { id: 'title', label: 'Τίτλος κεφαλαίου', type: 'text', required: true, placeholder: 'ΓΕΝΙΚΕΣ ΔΙΑΤΑΞΕΙΣ' },
    { id: 'articles', label: 'Άρθρα', type: 'container' },
  ],
  render(data) {
    return `<div class="nb-block nb-block--chapter" data-template="chapter">
  <h2 class="nb-chapter-heading">Κεφάλαιο ${data.number} – ${data.title}</h2>
  <div class="nb-container-zone nb-chapter-body" data-container-for="articles"></div>
</div>`;
  },
};
