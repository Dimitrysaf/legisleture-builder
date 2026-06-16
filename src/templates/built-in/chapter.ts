import type { Template } from '../types';

export const chapterTemplate: Template = {
  id: 'chapter',
  name: 'Κεφάλαιο',
  icon: '≡',
  description: 'Ενότητα νόμου με ρωμαϊκό αριθμό και τίτλο',
  category: 'structure',
  fields: [
    { id: 'number', label: 'Αριθμός (π.χ. Α΄, Β΄, Ι, ΙΙ)', type: 'text', required: true, placeholder: 'Α΄' },
    { id: 'title', label: 'Τίτλος κεφαλαίου', type: 'text', required: true, placeholder: 'ΓΕΝΙΚΕΣ ΔΙΑΤΑΞΕΙΣ' },
  ],
  render(data) {
    return `<div class="nb-block nb-block--chapter" data-template="chapter">
  <h1 class="nb-chapter-heading">ΚΕΦΑΛΑΙΟ ${data.number} – ${data.title.toUpperCase()}</h1>
</div>`;
  },
};
