import type { Template } from '../types';
import { toInline } from '../../utils/inline';

export const amendmentTemplate: Template = {
  id: 'amendment',
  name: 'Τροποποίηση',
  icon: 'replace',
  description: 'Τροποποίηση διάταξης υφιστάμενου νόμου',
  category: 'content',
  fields: [
    { id: 'article_ref', label: 'Τροποποιούμενη διάταξη', type: 'text', required: true,
      placeholder: 'π.χ. άρθρο 5 παρ. 2 του ν. 4000/2011' },
    { id: 'action', label: 'Είδος τροποποίησης', type: 'text', required: true,
      placeholder: 'π.χ. αντικαθίσταται, προστίθεται, καταργείται',
      defaultValue: 'αντικαθίσταται' },
    { id: 'content', label: 'Νέο κείμενο', type: 'rich-text', required: true },
  ],
  render(data) {
    const action = data.action?.trim() || 'αντικαθίσταται';
    const body = toInline(data.content ?? '');
    return `<div class="nb-block nb-block--amendment" data-template="amendment">
  <p class="nb-amendment">Το ${data.article_ref ?? ''} ${action} ως εξής:</p>
  <blockquote class="nb-amendment-text">«${body}»</blockquote>
</div>`;
  },
};
