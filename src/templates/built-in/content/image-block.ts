import type { Template } from '../../types';

const WIDTH_OPTIONS = [
  { value: '33',  label: 'Μικρό — 1/3 σελίδας' },
  { value: '50',  label: 'Μεσαίο — 1/2 σελίδας' },
  { value: '75',  label: 'Μεγάλο — 3/4 σελίδας' },
  { value: '100', label: 'Πλήρες — ολόκληρο πλάτος' },
];

const ALIGN_OPTIONS = [
  { value: 'left',  label: 'Αριστερά' },
  { value: 'right', label: 'Δεξιά' },
];

export const imageBlockTemplate: Template = {
  id: 'image-block',
  name: 'Εικόνα / Σχήμα',
  icon: 'image',
  description: 'Ενσωμάτωση φωτογραφίας ή διαγράμματος με λεζάντα',
  category: 'content',
  fields: [
    {
      id: 'src',
      label: 'Εικόνα',
      type: 'image',
      required: true,
      hint: 'Υποστηριζόμενες μορφές: JPG, PNG, GIF, SVG, WebP. Για μεγάλες εικόνες προτιμήστε JPG.',
    },
    {
      id: 'alt',
      label: 'Εναλλακτικό κείμενο (προσβασιμότητα)',
      type: 'text',
      required: false,
      placeholder: 'π.χ. Χάρτης διοικητικής διαίρεσης',
    },
    {
      id: 'figure_num',
      label: 'Αρίθμηση σχήματος',
      type: 'text',
      required: false,
      placeholder: 'π.χ. Σχήμα 1 ή Εικόνα Α',
    },
    {
      id: 'caption',
      label: 'Λεζάντα',
      type: 'text',
      required: false,
      placeholder: 'Σύντομη περιγραφή της εικόνας',
    },
    {
      id: 'width',
      label: 'Πλάτος',
      type: 'select',
      required: true,
      defaultValue: '50',
      options: WIDTH_OPTIONS,
    },
    {
      id: 'alignment',
      label: 'Στοίχιση',
      type: 'select',
      required: true,
      defaultValue: 'left',
      options: ALIGN_OPTIONS,
    },
  ],
  render(data) {
    const src       = data.src ?? '';
    const assetId   = data.assetId ?? '';
    const alt       = data.alt?.trim() || 'Εικόνα';
    const figNum    = data.figure_num?.trim();
    const caption   = data.caption?.trim();
    const width     = data.width || '50';
    const alignment = data.alignment || 'left';

    const captionHtml = (figNum || caption)
      ? `\n    <figcaption class="nb-figure-caption">${
          figNum ? `<span class="nb-figure-num">${figNum}.</span> ` : ''
        }${caption ?? ''}</figcaption>`
      : '';

    const justifyMap: Record<string, string> = {
      left: 'flex-start', right: 'flex-end',
    };
    const justify = justifyMap[alignment] ?? 'flex-start';

    // Use assetId reference when available (src resolved async in browser);
    // fall back to inline src for legacy blocks and export contexts.
    const imgSrc = src || '';
    const assetAttr = assetId ? ` data-asset-id="${assetId}"` : '';

    return `<div class="nb-block nb-block--image" data-template="image-block">
  <figure class="nb-figure" style="align-items:${justify}">
    <img src="${imgSrc}"${assetAttr} alt="${alt}" class="nb-figure-img" style="width:${width}%">${captionHtml}
  </figure>
</div>`;
  },
};
