import type { Template } from '../../types';

export const sectionTemplate: Template = {
  id: 'section',
  name: 'Τμήμα',
  icon: 'file-text',
  description: 'Υποδιαίρεση μέρους – περιέχει κεφάλαια',
  category: 'structure',
  fields: [
    { id: 'number', label: 'Αριθμός (π.χ. Α΄, 1)', type: 'text', required: true, placeholder: 'Α΄' },
    { id: 'title', label: 'Τίτλος τμήματος', type: 'text', required: true, placeholder: 'Αρμόδιες Αρχές' },
    { id: 'chapters', label: 'Κεφάλαια', type: 'container' },
  ],
  render(data) {
    return `<div class="nb-block nb-block--section" data-template="section">
  <div class="nb-struct-heading nb-struct-heading--section">
    <span class="nb-struct-role">Τμήμα ${data.number}</span>
    <span class="nb-struct-rule"></span>
    <span class="nb-struct-title">${data.title}</span>
  </div>
  <div class="nb-container-zone nb-section-body" data-container-for="chapters"></div>
</div>`;
  },
};
