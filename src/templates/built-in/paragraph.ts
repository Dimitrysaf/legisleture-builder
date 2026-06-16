import type { Template } from '../types';

export const paragraphTemplate: Template = {
  id: 'paragraph',
  name: 'Παράγραφος',
  icon: '¶',
  description: 'Αριθμημένη παράγραφος μέσα σε άρθρο',
  category: 'content',
  fields: [
    { id: 'number', label: 'Αριθμός παραγράφου', type: 'number', required: true, placeholder: '1' },
    { id: 'content', label: 'Κείμενο', type: 'rich-text', required: true },
  ],
  render(data) {
    return `<div class="nb-block nb-block--paragraph" data-template="paragraph">
  <p class="nb-paragraph"><span class="nb-para-num">${data.number}.</span> ${data.content}</p>
</div>`;
  },
};
