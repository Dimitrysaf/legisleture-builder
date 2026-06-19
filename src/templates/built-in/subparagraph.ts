import type { Template } from '../types';
import { toInline } from '../../utils/inline';

export const subparagraphTemplate: Template = {
  id: 'subparagraph',
  name: 'Υποπαράγραφος',
  icon: 'corner-down-right',
  description: 'Υποδιαίρεση παραγράφου με ελληνική αλφαβητική αρίθμηση (α, αα, ααα…)',
  category: 'content',
  fields: [
    { id: 'number', label: 'Αρίθμηση', type: 'text', required: true, placeholder: 'α',
      hint: 'Αλφαβητική αρίθμηση (α, αα, ααα…) — προσυμπληρώνεται αυτόματα.' },
    { id: 'content', label: 'Κείμενο', type: 'rich-text', required: true },
    { id: 'subparagraphs', label: 'Υποπαράγραφοι', type: 'container' },
  ],
  render(data) {
    return `<div class="nb-block nb-block--subparagraph" data-template="subparagraph">
  <div class="nb-paragraph"><span class="nb-para-num">${data.number}.</span> ${toInline(data.content ?? '')}</div>
  <div class="nb-container-zone nb-subpara-zone" data-container-for="subparagraphs"></div>
</div>`;
  },
};
