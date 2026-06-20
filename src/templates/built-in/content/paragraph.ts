import type { Template } from '../../types';
import { toInline } from '../../../utils/inline';

export const paragraphTemplate: Template = {
  id: 'paragraph',
  name: 'Παράγραφος',
  icon: 'align-left',
  description: 'Αριθμημένη παράγραφος μέσα σε άρθρο',
  category: 'content',
  fields: [
    { id: 'number', label: 'Αριθμός παραγράφου', type: 'number', required: true, placeholder: '1',
      hint: 'Προσυμπληρώνεται αυτόματα — αναριθμείται συνολικά μετά κάθε αλλαγή.' },
    { id: 'content', label: 'Κείμενο', type: 'rich-text', required: true },
    { id: 'subparagraphs', label: 'Υποπαράγραφοι', type: 'container' },
  ],
  render(data) {
    return `<div class="nb-block nb-block--paragraph" data-template="paragraph">
  <div class="nb-paragraph"><span class="nb-para-num">${data.number}.</span> ${toInline(data.content ?? '')}</div>
  <div class="nb-container-zone nb-subpara-zone" data-container-for="subparagraphs"></div>
</div>`;
  },
};
