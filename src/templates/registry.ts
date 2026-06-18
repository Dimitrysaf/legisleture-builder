import type { Template, StoredCustomTemplate } from './types';
import { partTemplate } from './built-in/part';
import { chapterTemplate } from './built-in/chapter';
import { sectionTemplate } from './built-in/section';
import { articleTemplate } from './built-in/article';
import { paragraphTemplate } from './built-in/paragraph';
import { subparagraphTemplate } from './built-in/subparagraph';
import { preambleTemplate } from './built-in/preamble';
import { lawRefTemplate } from './built-in/lawref';
import { noteTemplate } from './built-in/note';
import { definitionTemplate } from './built-in/definition';
import { amendmentTemplate } from './built-in/amendment';
import { annexTemplate } from './built-in/annex';
import { transitionalTemplate } from './built-in/transitional';
import { pagebreakTemplate } from './built-in/pagebreak';
import { imageBlockTemplate } from './built-in/image-block';
import { plaintextTemplate } from './built-in/plaintext';
import { tableTemplate } from './built-in/table';
import { closingTemplate } from './built-in/closing';
import { finalArticleTemplate } from './built-in/final-article';
import { footnoteTemplate } from './built-in/footnote';
import { tocTemplate } from './built-in/toc';
import { interpretiveTemplate } from './built-in/interpretive';

const STORAGE_KEY = 'nb_custom_templates';

const registry = new Map<string, Template>([
  ['part', partTemplate],
  ['chapter', chapterTemplate],
  ['section', sectionTemplate],
  ['article', articleTemplate],
  ['paragraph', paragraphTemplate],
  ['subparagraph', subparagraphTemplate],
  ['transitional', transitionalTemplate],
  ['annex', annexTemplate],
  ['preamble', preambleTemplate],
  ['amendment', amendmentTemplate],
  ['definition', definitionTemplate],
  ['lawref', lawRefTemplate],
  ['note', noteTemplate],
  ['pagebreak', pagebreakTemplate],
  ['image-block', imageBlockTemplate],
  ['plaintext', plaintextTemplate],
  ['table', tableTemplate],
  ['closing', closingTemplate],
  ['final-article', finalArticleTemplate],
  ['footnote', footnoteTemplate],
  ['toc', tocTemplate],
  ['interpretive', interpretiveTemplate],
]);

export function getTemplate(id: string): Template | undefined {
  return registry.get(id);
}

export function getAllTemplates(): Template[] {
  return Array.from(registry.values());
}

function makeRenderFn(templateStr: string, templateId: string): Template['render'] {
  return (data) => {
    let html = templateStr;
    for (const [key, value] of Object.entries(data)) {
      html = html.replaceAll(`{{${key}}}`, value);
    }
    return `<div class="nb-block nb-block--custom" data-template="${templateId}">${html}</div>`;
  };
}

export function loadCustomTemplates(): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    const customs: StoredCustomTemplate[] = JSON.parse(stored);
    for (const ct of customs) {
      registry.set(ct.id, { ...ct, render: makeRenderFn(ct.templateStr, ct.id), isCustom: true });
    }
  } catch {}
}

export function saveCustomTemplate(template: Template, templateStr: string): void {
  const stored = localStorage.getItem(STORAGE_KEY);
  const customs: StoredCustomTemplate[] = stored ? JSON.parse(stored) : [];
  const idx = customs.findIndex((c) => c.id === template.id);
  const entry: StoredCustomTemplate = { ...template, templateStr, isCustom: true };
  delete (entry as any).render;
  if (idx >= 0) customs[idx] = entry;
  else customs.push(entry);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(customs));
  registry.set(template.id, { ...template, render: makeRenderFn(templateStr, template.id), isCustom: true });
}

export function deleteCustomTemplate(id: string): void {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return;
  const customs: StoredCustomTemplate[] = JSON.parse(stored).filter((c: StoredCustomTemplate) => c.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(customs));
  registry.delete(id);
}
