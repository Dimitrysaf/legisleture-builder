import type { Template } from '../types';
import { toInline } from '../../utils/inline';

export const definitionTemplate: Template = {
  id: 'definition',
  name: 'Ορισμός',
  icon: 'hash',
  description: 'Ορισμός νομικού όρου ή έννοιας',
  category: 'content',
  fields: [
    { id: 'term', label: 'Όρος', type: 'text', required: true, placeholder: 'π.χ. «Αρχή»' },
    { id: 'definition', label: 'Ορισμός', type: 'rich-text', required: true,
      hint: 'Π.χ. «Αρχή» νοείται η κατά το άρθρο 5 συσταθείσα αρχή...' },
  ],
  render(data) {
    return `<div class="nb-block nb-block--definition" data-template="definition">
  <dl class="nb-definition">
    <dt class="nb-def-term">${data.term ?? ''}</dt>
    <dd class="nb-def-body">${toInline(data.definition ?? '')}</dd>
  </dl>
</div>`;
  },
};
