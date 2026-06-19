import type { TemplateInstance } from '../templates/types';

export interface CompletionIssue {
  severity: 'error' | 'warning' | 'info';
  message: string;
  instanceId?: string;
}

const STRUCTURAL_NAMES: Record<string, string> = {
  part: 'Μέρος',
  section: 'Τμήμα',
  chapter: 'Κεφάλαιο',
  article: 'Άρθρο',
  transitional: 'Μεταβατική Διάταξη',
};

export function checkDocument(
  paper: HTMLElement,
  instances: Map<string, TemplateInstance>,
): CompletionIssue[] {
  const issues: CompletionIssue[] = [];

  const rootWrappers = Array.from(
    paper.querySelectorAll<HTMLElement>(':scope > .nb-block-wrapper'),
  );

  if (rootWrappers.length === 0) {
    issues.push({ severity: 'warning', message: 'Το έγγραφο είναι κενό.' });
    return issues;
  }

  function templateIdOf(w: HTMLElement): string {
    const id = w.dataset.instanceId;
    return id ? (instances.get(id)?.templateId ?? '') : '';
  }

  if (!rootWrappers.some(w => templateIdOf(w) === 'preamble')) {
    issues.push({ severity: 'warning', message: 'Λείπει Προοίμιο (preamble).' });
  }

  if (!rootWrappers.some(w => templateIdOf(w) === 'final-article')) {
    issues.push({ severity: 'warning', message: 'Λείπει Άρθρο Έναρξης Ισχύος (final-article).' });
  }

  if (!rootWrappers.some(w => templateIdOf(w) === 'closing')) {
    issues.push({ severity: 'info', message: 'Δεν υπάρχει μπλοκ Υπογραφών/Κλεισίματος (closing).' });
  }

  // Empty structural containers
  paper.querySelectorAll<HTMLElement>('.nb-block-wrapper').forEach(wrapper => {
    const instId = wrapper.dataset.instanceId;
    if (!instId) return;
    const inst = instances.get(instId);
    if (!inst) return;
    const tplName = STRUCTURAL_NAMES[inst.templateId];
    if (!tplName) return;

    const zone = wrapper.querySelector<HTMLElement>('.nb-container-zone');
    if (!zone) return;

    const hasChildren = !!zone.querySelector(':scope > .nb-block-wrapper');
    if (!hasChildren) {
      const label = inst.data.title || inst.data.number
        ? `${inst.data.number ? 'αρ. ' + inst.data.number : ''} ${inst.data.title ?? ''}`.trim()
        : `(${instId.slice(-4)})`;
      issues.push({
        severity: 'warning',
        message: `${tplName} ${label} δεν έχει περιεχόμενο.`,
        instanceId: instId,
      });
    }
  });

  return issues;
}
