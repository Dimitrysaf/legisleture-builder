import type { Template } from '../../types';

export const pagebreakTemplate: Template = {
  id: 'pagebreak',
  name: 'Αλλαγή Σελίδας',
  icon: 'separator-horizontal',
  description: 'Εισάγει αλλαγή σελίδας κατά την εκτύπωση',
  category: 'utility',
  fields: [],
  render() {
    return `<div class="nb-block nb-block--pagebreak" data-template="pagebreak">
  <div class="nb-pagebreak">
    <span class="nb-pagebreak-label">Αλλαγή Σελίδας</span>
  </div>
</div>`;
  },
};
