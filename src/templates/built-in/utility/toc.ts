import type { Template } from '../../types';

export const tocTemplate: Template = {
  id: 'toc',
  name: 'Πίν. Περιεχ.',
  icon: 'list',
  description: 'Αυτόματος πίνακας περιεχομένων — κλικ Επεξεργασία για ανανέωση',
  category: 'utility',
  fields: [],
  render(data) {
    const body = data.body?.trim() ?? '';
    const emptyMsg = body
      ? ''
      : '<p class="nb-toc-empty">Δεν βρέθηκαν δομικά στοιχεία.</p>';
    return `<div class="nb-block nb-block--toc" data-template="toc">
  <div class="nb-toc-title">ΠΙΝΑΚΑΣ ΠΕΡΙΕΧΟΜΕΝΩΝ</div>
  <div class="nb-toc-body">${body || emptyMsg}</div>
</div>`;
  },
};
