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
    const titleRow = data.title?.trim()
      ? `<span class="nb-struct-rule"></span><span class="nb-struct-title">${data.title.trim()}</span>`
      : '';
    return `<div class="nb-block nb-block--article" data-template="article">
  <div class="nb-struct-heading nb-struct-heading--article">
    <span class="nb-struct-role">Άρθρο ${data.number}</span>${titleRow}
  </div>
  <div class="nb-container-zone nb-article-body" data-container-for="body"></div>
</div>`;
  },
};
