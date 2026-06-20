import type { Template } from '../../types';

export const interpretiveTemplate: Template = {
  id: 'interpretive',
  name: 'Ερμηνευτική δήλωση',
  icon: 'message-square',
  description: 'Ερμηνευτική δήλωση νόμου — πλάγιο κείμενο με διακοσμητικό πλαίσιο',
  category: 'content',
  fields: [
    {
      id: 'content',
      label: 'Κείμενο δήλωσης',
      type: 'rich-text',
      required: true,
      placeholder: 'Κείμενο ερμηνευτικής δήλωσης…',
    },
  ],
  render(data) {
    return `<div class="nb-block nb-block--interpretive" data-template="interpretive">
  <div class="nb-interpretive">
    <div class="nb-interpretive-body"><em><strong>Ερμηνευτική δήλωση:</strong> ${data.content ?? ''}</em></div>
  </div>
</div>`;
  },
};
