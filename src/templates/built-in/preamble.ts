import type { Template } from '../types';

export const preambleTemplate: Template = {
  id: 'preamble',
  name: 'Προοίμιο',
  icon: 'scroll',
  description: 'Εισαγωγικές διατάξεις νόμου (αιτιολογική έκθεση)',
  category: 'structure',
  fields: [
    { id: 'content', label: 'Κείμενο προοιμίου', type: 'rich-text', required: true,
      hint: 'Π.χ. «Έχοντας υπόψη τις διατάξεις του...»' },
  ],
  render(data) {
    return `<div class="nb-block nb-block--preamble" data-template="preamble">
  <div class="nb-preamble">${data.content}</div>
</div>`;
  },
};
