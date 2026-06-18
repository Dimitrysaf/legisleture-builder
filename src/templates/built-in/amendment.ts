import type { Template } from '../types';
import { toInline } from '../../utils/inline';

const ACTIONS = [
  { value: 'αντικαθίσταται', label: 'Αντικαθίσταται' },
  { value: 'προστίθεται',    label: 'Προστίθεται' },
  { value: 'καταργείται',    label: 'Καταργείται' },
  { value: 'τροποποιείται',  label: 'Τροποποιείται' },
  { value: 'αναριθμείται',   label: 'Αναριθμείται' },
];

export const amendmentTemplate: Template = {
  id: 'amendment',
  name: 'Τροποποίηση',
  icon: 'replace',
  description: 'Τροποποίηση διάταξης υφιστάμενου νόμου',
  category: 'content',
  fields: [
    {
      id: 'action',
      label: 'Είδος τροποποίησης',
      type: 'select',
      required: true,
      defaultValue: 'αντικαθίσταται',
      options: ACTIONS,
    },
    {
      id: 'article_ref',
      label: 'Τροποποιούμενη διάταξη',
      type: 'text',
      required: true,
      placeholder: 'π.χ. άρθρο 5 παρ. 2 του ν. 4000/2011',
    },
    {
      id: 'content',
      label: 'Νέο κείμενο',
      type: 'rich-text',
      required: false,
      hint: 'Αφήστε κενό εάν η διάταξη καταργείται χωρίς αντικατάσταση.',
    },
  ],
  render(data) {
    const action = data.action?.trim() || 'αντικαθίσταται';
    const ref = data.article_ref ?? '';
    const body = toInline(data.content ?? '');

    const isRemoval = action === 'καταργείται';
    const hasBody = body.replace(/<[^>]+>/g, '').trim().length > 0;

    const introVerb = (() => {
      switch (action) {
        case 'προστίθεται':   return `Μετά το ${ref} προστίθεται νέα διάταξη ως εξής:`;
        case 'καταργείται':   return `Το ${ref} καταργείται.`;
        case 'τροποποιείται': return `Το ${ref} τροποποιείται ως εξής:`;
        case 'αναριθμείται':  return `Το ${ref} αναριθμείται ως εξής:`;
        default:              return `Το ${ref} αντικαθίσταται ως εξής:`;
      }
    })();

    const bodyHtml = (!isRemoval && hasBody)
      ? `\n  <blockquote class="nb-amendment-text">«${body}»</blockquote>`
      : '';

    return `<div class="nb-block nb-block--amendment" data-template="amendment">
  <p class="nb-amendment">${introVerb}</p>${bodyHtml}
</div>`;
  },
};
