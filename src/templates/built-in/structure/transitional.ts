import type { Template } from '../../types';

export const transitionalTemplate: Template = {
  id: 'transitional',
  name: 'Μεταβατική',
  icon: 'chevrons-right',
  description: 'Μεταβατική διάταξη νόμου',
  category: 'structure',
  fields: [
    { id: 'number', label: 'Αριθμός διάταξης', type: 'number', required: false, placeholder: '1',
      hint: 'Αριθμείται αυτόματα ως μεταβατική διάταξη μετά την εισαγωγή.' },
    { id: 'title', label: 'Τίτλος (προαιρετικό)', type: 'text',
      placeholder: 'π.χ. Εφαρμογή υφιστάμενων συμβάσεων' },
    { id: 'body', label: 'Περιεχόμενο', type: 'container' },
  ],
  render(data) {
    const titleRow = data.title?.trim()
      ? `<span class="nb-struct-rule"></span><span class="nb-struct-title">${data.title.trim()}</span>`
      : '';
    return `<div class="nb-block nb-block--transitional" data-template="transitional">
  <div class="nb-struct-heading nb-struct-heading--article nb-struct-heading--transitional">
    <span class="nb-struct-role">Μεταβατική Διάταξη ${data.number ?? ''}</span>${titleRow}
  </div>
  <div class="nb-container-zone nb-transitional-body" data-container-for="body"></div>
</div>`;
  },
};
