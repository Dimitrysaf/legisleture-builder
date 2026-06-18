import { state } from './state';

const TOC_LEVELS = new Set(['part', 'chapter', 'section', 'article', 'final-article', 'annex', 'transitional']);

function collectTocItems(
  wrapper: HTMLElement,
  out: { label: string; level: string }[],
): void {
  const id = wrapper.dataset.instanceId;
  if (!id) return;
  const inst = state.instances.get(id);
  if (!inst) return;

  if (TOC_LEVELS.has(inst.templateId)) {
    const heading = wrapper.querySelector<HTMLElement>('.nb-struct-heading');
    if (heading) {
      const role = heading.querySelector<HTMLElement>('.nb-struct-role')?.textContent?.trim() ?? '';
      const title = heading.querySelector<HTMLElement>('.nb-struct-title')?.textContent?.trim() ?? '';
      const label = title ? `${role} — ${title}` : role;
      if (label) out.push({ label, level: inst.templateId });
    }
  }

  wrapper.querySelectorAll<HTMLElement>(':scope .nb-container-zone').forEach(zone => {
    zone.querySelectorAll<HTMLElement>(':scope > .nb-block-wrapper').forEach(child => {
      collectTocItems(child, out);
    });
  });
}

export function generateTocBody(): string {
  const items: { label: string; level: string }[] = [];
  state.paper.querySelectorAll<HTMLElement>(':scope > .nb-block-wrapper').forEach(w => {
    collectTocItems(w, items);
  });
  if (items.length === 0) return '';
  return items
    .map(({ label, level }) => `<div class="nb-toc-item nb-toc-item--${level}">${label}</div>`)
    .join('');
}
