import type { Template } from '../../types';

export const lawRefTemplate: Template = {
  id: 'lawref',
  name: 'Παραπομπή',
  icon: 'scale',
  description: 'Αναφορά σε υφιστάμενο νόμο ή διάταξη',
  category: 'reference',
  fields: [
    { id: 'law_number', label: 'Αριθμός νόμου', type: 'text', required: true, placeholder: 'ν. 4000/2011' },
    { id: 'article', label: 'Άρθρο (προαιρετικό)', type: 'text', placeholder: 'άρθρο 5 παρ. 2' },
    { id: 'fek', label: 'ΦΕΚ (προαιρετικό)', type: 'text', placeholder: 'Α΄ 120/15.06.2011' },
    { id: 'title', label: 'Τίτλος νόμου (προαιρετικό)', type: 'text', placeholder: 'Ρύθμιση θεμάτων...' },
  ],
  render(data) {
    const article = data.article?.trim() ? ` ${data.article.trim()}` : '';
    const fek = data.fek?.trim() ? ` (ΦΕΚ ${data.fek.trim()})` : '';
    const title = data.title?.trim() ? ` «${data.title.trim()}»` : '';
    return `<div class="nb-block nb-block--lawref" data-template="lawref">
  <span class="nb-lawref">${data.law_number}${article}${fek}${title}</span>
</div>`;
  },
};
