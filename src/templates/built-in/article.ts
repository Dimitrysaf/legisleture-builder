import type { Template } from '../types';

export const articleTemplate: Template = {
  id: 'article',
  name: 'Άρθρο',
  icon: '§',
  description: 'Βασική μονάδα νόμου με αριθμό, τίτλο και κείμενο',
  category: 'structure',
  fields: [
    { id: 'number', label: 'Αριθμός άρθρου', type: 'number', required: true, placeholder: '1' },
    { id: 'title', label: 'Τίτλος (προαιρετικό)', type: 'text', placeholder: 'Πεδίο εφαρμογής' },
    { id: 'content', label: 'Κείμενο', type: 'rich-text', required: true },
  ],
  render(data) {
    const titlePart = data.title?.trim() ? ` – ${data.title.trim()}` : '';
    return `<div class="nb-block nb-block--article" data-template="article">
  <h2 class="nb-article-heading">Άρθρο ${data.number}${titlePart}</h2>
  <div class="nb-article-body">${data.content}</div>
</div>`;
  },
};
