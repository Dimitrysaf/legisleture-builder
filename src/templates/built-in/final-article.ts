import type { Template } from '../types';

const DEFAULT_BODY =
  '<p>Η ισχύς του παρόντος αρχίζει από τη δημοσίευσή του στην Εφημερίδα της Κυβερνήσεως.</p>';

export const finalArticleTemplate: Template = {
  id: 'final-article',
  name: 'Έναρξη Ισχύος',
  icon: 'calendar-check',
  description: 'Τελικό άρθρο — έναρξη ισχύος νόμου',
  category: 'structure',
  fields: [
    {
      id: 'number',
      label: 'Αριθμός άρθρου',
      type: 'number',
      required: false,
      placeholder: '1',
      hint: 'Αριθμείται αυτόματα ως το επόμενο άρθρο μετά την εισαγωγή.',
    },
    {
      id: 'custom_text',
      label: 'Κείμενο (κενό = τυπική διατύπωση)',
      type: 'rich-text',
      hint: 'Τυπική: «Η ισχύς του παρόντος αρχίζει από τη δημοσίευσή του στην Εφημερίδα της Κυβερνήσεως.»',
    },
  ],
  render(data) {
    const num = data.number ?? '';
    const body = data.custom_text?.trim() ? data.custom_text.trim() : DEFAULT_BODY;
    return `<div class="nb-block nb-block--final-article" data-template="final-article">
  <div class="nb-struct-heading nb-struct-heading--article">
    <span class="nb-struct-role">Άρθρο ${num}</span>
    <span class="nb-struct-rule"></span>
    <span class="nb-struct-title">Έναρξη Ισχύος</span>
  </div>
  <div class="nb-article-body">${body}</div>
</div>`;
  },
};
