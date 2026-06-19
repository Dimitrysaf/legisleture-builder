import type { Template } from '../types';
import { toInline } from '../../utils/inline';

// Machine-readable action values; display labels are derived in render()
export const AMENDMENT_ACTIONS = [
  { value: 'replace',  label: 'Αντικατάσταση' },
  { value: 'insert',   label: 'Προσθήκη' },
  { value: 'repeal',   label: 'Κατάργηση' },
  { value: 'amend',    label: 'Τροποποίηση' },
  { value: 'renumber', label: 'Αναρίθμηση' },
] as const;

export type AmendmentAction = (typeof AMENDMENT_ACTIONS)[number]['value'];

export const amendmentTemplate: Template = {
  id: 'amendment',
  name: 'Τροποποίηση',
  icon: 'replace',
  description: 'Τροποποίηση διάταξης υφιστάμενου νόμου',
  category: 'content',
  fields: [
    {
      id: 'targetLawId',
      label: 'Τροποποιούμενος νόμος',
      type: 'text',
      required: true,
      placeholder: 'π.χ. ν. 4000/2011',
      hint: 'Ο νόμος που τροποποιείται — χρησιμοποιείται για ευρετηρίαση',
    },
    {
      id: 'targetPath',
      label: 'Τροποποιούμενη διάταξη',
      type: 'text',
      required: true,
      placeholder: 'π.χ. άρθρο 5 παρ. 2',
      hint: 'Η συγκεκριμένη διάταξη εντός του νόμου',
    },
    {
      id: 'action',
      label: 'Είδος τροποποίησης',
      type: 'select',
      required: true,
      defaultValue: 'replace',
      options: AMENDMENT_ACTIONS.map(a => ({ value: a.value, label: a.label })),
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
    const action   = (data.action ?? 'replace') as AmendmentAction;
    const lawId    = data.targetLawId?.trim() ?? '';
    const path     = data.targetPath?.trim() ?? '';
    // Backwards compat: old blocks used a free-text article_ref
    const legacyRef = data.article_ref?.trim() ?? '';
    const ref = path && lawId ? `${path} του ${lawId}` : (legacyRef || `${path} ${lawId}`.trim());
    const body = toInline(data.content ?? '');

    const isRepeal = action === 'repeal';
    const hasBody  = body.replace(/<[^>]+>/g, '').trim().length > 0;

    const introVerb = (() => {
      switch (action) {
        case 'insert':   return `Μετά το ${ref} προστίθεται νέα διάταξη ως εξής:`;
        case 'repeal':   return `Το ${ref} καταργείται.`;
        case 'amend':    return `Το ${ref} τροποποιείται ως εξής:`;
        case 'renumber': return `Το ${ref} αναριθμείται ως εξής:`;
        default:         return `Το ${ref} αντικαθίσταται ως εξής:`;
      }
    })();

    const bodyHtml = (!isRepeal && hasBody)
      ? `\n  <blockquote class="nb-amendment-text">«${body}»</blockquote>`
      : '';

    return `<div class="nb-block nb-block--amendment" data-template="amendment" data-law-id="${(data.targetLawId ?? '').replace(/"/g, '&quot;')}" data-target-path="${(data.targetPath ?? '').replace(/"/g, '&quot;')}" data-action="${action}">
  <p class="nb-amendment">${introVerb}</p>${bodyHtml}
</div>`;
  },
};
