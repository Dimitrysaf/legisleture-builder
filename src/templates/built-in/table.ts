import type { Template } from '../types';

export const tableTemplate: Template = {
  id: 'table',
  name: 'Πίνακας',
  icon: 'table',
  description: 'Πίνακας με επικεφαλίδες και γραμμές δεδομένων',
  category: 'content',
  fields: [
    {
      id: 'caption',
      label: 'Λεζάντα (προαιρετικό)',
      type: 'text',
      placeholder: 'π.χ. Πίνακας 1. Αποτελέσματα',
    },
    {
      id: 'headers',
      label: 'Επικεφαλίδες στηλών (διαχωρισμός με |)',
      type: 'text',
      required: true,
      placeholder: 'Α/Α | Τίτλος | Αξία',
    },
    {
      id: 'rows',
      label: 'Γραμμές (μία ανά γραμμή, κελιά διαχωρισμένα με |)',
      type: 'textarea',
      placeholder: '1 | Πρώτη εγγραφή | 100\n2 | Δεύτερη εγγραφή | 200',
    },
  ],
  render(data) {
    const caption = data.caption?.trim();
    const headerCells = (data.headers ?? '')
      .split('|')
      .map(h => h.trim())
      .filter(Boolean);
    const rowLines = (data.rows ?? '').split('\n').filter(l => l.trim());

    const captionHtml = caption
      ? `<caption class="nb-table-caption">${caption}</caption>`
      : '';
    const headHtml = headerCells.length
      ? `<thead><tr>${headerCells.map(h => `<th>${h}</th>`).join('')}</tr></thead>`
      : '';
    const bodyHtml = rowLines.length
      ? `<tbody>${rowLines
          .map(line => {
            const cells = line.split('|').map(c => c.trim());
            return `<tr>${cells.map(c => `<td>${c}</td>`).join('')}</tr>`;
          })
          .join('')}</tbody>`
      : '';

    return `<div class="nb-block nb-block--table" data-template="table">
  <table class="nb-table">${captionHtml}${headHtml}${bodyHtml}</table>
</div>`;
  },
};
