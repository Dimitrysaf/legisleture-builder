import type { Template, StoredCustomTemplate } from './types';
import { escHtml, escAttr } from '../utils/escape';
import { partTemplate } from './built-in/structure/part';
import { chapterTemplate } from './built-in/structure/chapter';
import { sectionTemplate } from './built-in/structure/section';
import { articleTemplate } from './built-in/structure/article';
import { paragraphTemplate } from './built-in/content/paragraph';
import { subparagraphTemplate } from './built-in/content/subparagraph';
import { preambleTemplate } from './built-in/structure/preamble';
import { lawRefTemplate } from './built-in/reference/lawref';
import { noteTemplate } from './built-in/content/note';
import { definitionTemplate } from './built-in/content/definition';
import { amendmentTemplate } from './built-in/content/amendment';
import { annexTemplate } from './built-in/structure/annex';
import { transitionalTemplate } from './built-in/structure/transitional';
import { pagebreakTemplate } from './built-in/utility/pagebreak';
import { imageBlockTemplate } from './built-in/content/image-block';
import { plaintextTemplate } from './built-in/content/plaintext';
import { tableTemplate } from './built-in/content/table';
import { closingTemplate } from './built-in/structure/closing';
import { finalArticleTemplate } from './built-in/structure/final-article';
import { footnoteTemplate } from './built-in/reference/footnote';
import { tocTemplate } from './built-in/utility/toc';
import { interpretiveTemplate } from './built-in/content/interpretive';
import { fekHeaderTemplate } from './built-in/utility/fek-header';

const STORAGE_KEY = 'nb_custom_templates';

const registry = new Map<string, Template>([
  ['part', partTemplate],
  ['section', sectionTemplate],
  ['chapter', chapterTemplate],
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
  ['fek-header', fekHeaderTemplate],
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
      // Safe replacement: escape the value so it cannot inject HTML/script
      html = html.replaceAll(`{{${key}}}`, escHtml(value));
      // Also handle attribute-context placeholders wrapped in quotes
      html = html.replaceAll(`"{{${key}}}"`, `"${escAttr(value)}"`);
    }
    return `<div class="nb-block nb-block--custom" data-template="${escAttr(templateId)}">${html}</div>`;
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
