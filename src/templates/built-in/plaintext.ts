import type { Template } from '../types';

export const plaintextTemplate: Template = {
  id: 'plaintext',
  name: 'Απλό Κείμενο',
  icon: 'type',
  description: 'Ελεύθερο κείμενο χωρίς δομή',
  category: 'content',
  fields: [
    {
      id: 'content',
      label: 'Κείμενο',
      type: 'rich-text',
      required: true,
    },
  ],
  render(data) {
    return `<div class="nb-block nb-block--plaintext" data-template="plaintext">${data.content ?? ''}</div>`;
  },
};
