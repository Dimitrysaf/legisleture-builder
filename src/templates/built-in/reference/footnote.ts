import type { Template } from '../../types';

export const footnoteTemplate: Template = {
  id: 'footnote',
  name: 'Υποσημείωση',
  icon: 'corner-down-left',
  description: 'Υποσημείωση με δείκτη και κείμενο',
  category: 'reference',
  fields: [
    {
      id: 'marker',
      label: 'Δείκτης',
      type: 'text',
      required: true,
      placeholder: 'π.χ. 1, α, *',
    },
    {
      id: 'content',
      label: 'Κείμενο υποσημείωσης',
      type: 'rich-text',
      required: true,
    },
  ],
  render(data) {
    return `<div class="nb-block nb-block--footnote" data-template="footnote">
  <hr class="nb-footnote-rule">
  <div class="nb-footnote">
    <span class="nb-footnote-marker">${data.marker ?? ''}</span>
    <div class="nb-footnote-body">${data.content ?? ''}</div>
  </div>
</div>`;
  },
};
