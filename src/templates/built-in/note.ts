import type { Template } from '../types';

export const noteTemplate: Template = {
  id: 'note',
  name: 'Σχόλιο',
  icon: '💬',
  description: 'Εσωτερικό σχόλιο – δεν εμφανίζεται κατά την εκτύπωση',
  category: 'content',
  fields: [
    { id: 'content', label: 'Σχόλιο', type: 'textarea', required: true,
      placeholder: 'Εσωτερική σημείωση για αυτή την ενότητα...' },
  ],
  render(data) {
    return `<div class="nb-block nb-block--note nb-no-print" data-template="note">
  <span class="nb-note-icon">💬</span>
  <span class="nb-note-text">${data.content}</span>
</div>`;
  },
};
