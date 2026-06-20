import type { Template } from '../../types';

export const annexTemplate: Template = {
  id: 'annex',
  name: 'Παράρτημα',
  icon: 'book-marked',
  description: 'Παράρτημα ή Προσάρτημα νόμου',
  category: 'structure',
  fields: [
    { id: 'number', label: 'Αριθμός / Γράμμα (π.χ. Α, Ι, 1)', type: 'text', required: true, placeholder: 'Α' },
    { id: 'title', label: 'Τίτλος παραρτήματος', type: 'text', required: false,
      placeholder: 'π.χ. ΚΑΤΑΛΟΓΟΣ ΑΡΜΟΔΙΩΝ ΑΡΧΩΝ' },
    { id: 'body', label: 'Περιεχόμενο', type: 'container' },
  ],
  render(data) {
    return `<div class="nb-block nb-block--annex" data-template="annex">
  <div class="nb-struct-heading nb-struct-heading--annex">
    <span class="nb-struct-role">Παράρτημα ${data.number ?? ''}</span>
    <span class="nb-struct-rule"></span>
    <span class="nb-struct-title">${data.title ?? ''}</span>
  </div>
  <div class="nb-container-zone nb-annex-body" data-container-for="body"></div>
</div>`;
  },
};
