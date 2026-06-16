import type { Template } from '../types';

export const articleTemplate: Template = {
  id: 'article',
  name: 'Άρθρο',
  icon: 'book-open',
  description: 'Βασική μονάδα νόμου με αριθμό, τίτλο και παραγράφους',
  category: 'structure',
  fields: [
    { id: 'number', label: 'Αριθμός άρθρου', type: 'number', required: true, placeholder: '1' },
    { id: 'title', label: 'Τίτλος (προαιρετικό)', type: 'text', placeholder: 'Πεδίο εφαρμογής' },
    { id: 'body', label: 'Περιεχόμενο', type: 'container' },
  ],
  render(data) {
    const titlePart = data.title?.trim() ? ` – ${data.title.trim()}` : '';
    return `<div class="nb-block nb-block--article" data-template="article">
  <h4 class="nb-article-heading">Άρθρο ${data.number}${titlePart}</h4>
  <div class="nb-container-zone nb-article-body" data-container-for="body"></div>
</div>`;
  },
};
