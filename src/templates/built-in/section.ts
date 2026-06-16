import type { Template } from '../types';

export const sectionTemplate: Template = {
  id: 'section',
  name: 'Τμήμα',
  icon: 'file-text',
  description: 'Υποδιαίρεση κεφαλαίου – περιέχει άρθρα',
  category: 'structure',
  fields: [
    { id: 'number', label: 'Αριθμός (π.χ. Α΄, 1)', type: 'text', required: true, placeholder: 'Α΄' },
    { id: 'title', label: 'Τίτλος τμήματος', type: 'text', required: true, placeholder: 'Αρμόδιες Αρχές' },
    { id: 'articles', label: 'Άρθρα', type: 'container' },
  ],
  render(data) {
    return `<div class="nb-block nb-block--section" data-template="section">
  <h3 class="nb-section-heading">Τμήμα ${data.number} – ${data.title}</h3>
  <div class="nb-container-zone nb-section-body" data-container-for="articles"></div>
</div>`;
  },
};
