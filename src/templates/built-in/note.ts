import type { Template } from '../types';

export const noteTemplate: Template = {
  id: 'note',
  name: 'Σχόλιο',
  icon: 'message-square',
  description: 'Εσωτερικό σχόλιο – δεν εμφανίζεται κατά την εκτύπωση',
  category: 'content',
  fields: [
    { id: 'content', label: 'Σχόλιο', type: 'textarea', required: true,
      placeholder: 'Εσωτερική σημείωση για αυτή την ενότητα...' },
  ],
  render(data) {
    return `<div class="nb-block nb-block--note nb-no-print" data-template="note">
  <span class="nb-note-icon"><i data-lucide="message-square" class="w-4 h-4" aria-hidden="true"></i></span>
  <span class="nb-note-text">${data.content}</span>
</div>`;
  },
};
