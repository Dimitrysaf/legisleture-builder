import type { TemplateInstance } from '../templates/types';
import type { FekMeta } from './fekMeta';
import { buildFekHeaderHtml, hasFekMeta } from './fekMeta';

// ── Data model ─────────────────────────────────────────────────────

export interface SavedBlock {
  id: string;
  templateId: string;
  data: Record<string, string>;
  zones: Record<string, SavedBlock[]>;
}

export interface SaveFile {
  version: 1;
  app: 'legisleture-builder';
  savedAt: string;
  blocks: SavedBlock[];
}

// ── Serialization ──────────────────────────────────────────────────

export function serializeDocument(
  paper: HTMLElement,
  instances: Map<string, TemplateInstance>,
): SaveFile {
  return {
    version: 1,
    app: 'legisleture-builder',
    savedAt: new Date().toISOString(),
    blocks: serializeContainer(paper, instances),
  };
}

function serializeContainer(
  container: HTMLElement,
  instances: Map<string, TemplateInstance>,
): SavedBlock[] {
  const blocks: SavedBlock[] = [];

  for (const child of container.children) {
    const el = child as HTMLElement;
    if (!el.classList.contains('nb-block-wrapper')) continue;

    const id = el.dataset.instanceId;
    if (!id) continue;
    const inst = instances.get(id);
    if (!inst) continue;

    // Walk direct children of .nb-block to find container zones
    const zones: Record<string, SavedBlock[]> = {};
    const blockEl = el.querySelector<HTMLElement>('.nb-block');
    if (blockEl) {
      for (const ch of Array.from(blockEl.children)) {
        const zoneEl = ch as HTMLElement;
        if (zoneEl.classList.contains('nb-container-zone')) {
          const key = zoneEl.dataset.containerFor;
          if (key) zones[key] = serializeContainer(zoneEl, instances);
        }
      }
    }

    blocks.push({ id, templateId: inst.templateId, data: { ...inst.data }, zones });
  }

  return blocks;
}

// ── HTML export ────────────────────────────────────────────────────

const EXPORT_CSS = `
@page { size: A4 portrait; margin: 0; }
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; border-radius: 0; }

body {
  font-family: 'Noto Serif', Georgia, 'Times New Roman', serif;
  font-size: 11.5pt;
  line-height: 1.65;
  color: #0b0c0c;
  background: #ffffff;
  padding: 20px 52px 56px;
  overflow-wrap: break-word;
  word-break: break-word;
}

/* ── ΦΕΚ Header ── */
.nb-fek-header { margin-bottom: 20px; }
.nb-fek-head-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-bottom: 6px; }
.nb-fek-identity { display: flex; align-items: center; gap: 10px; min-width: 0; overflow: hidden; }
.nb-fek-emblem { display:flex; align-items:center; flex-shrink:0; }
.nb-fek-emblem-img,
.nb-fek-emblem svg { width: 21mm; height: auto; display: block; }
.nb-fek-gazette-svg { width: 247px; height: 21mm; display: block; flex-shrink: 0; }
.nb-fek-meta-right { text-align: right; font-size: 9pt; color: #6b7280; line-height: 1.8; white-space: nowrap; flex-shrink: 0; padding-left: 8px; }
.nb-fek-rule { border: none; height: 1px; background: #003476; margin: 4px 0 8px; }
.nb-fek-law-title { font-size: 11pt; font-weight: 700; text-align: left; margin-top: 8px; letter-spacing: 0.02em; overflow-wrap: break-word; word-break: break-word; }

/* ── Block wrappers ── */
.nb-block-wrapper { display: block; position: relative; }
.nb-block { padding: 4px 0; }

/* ── Structural headings ── */
.nb-struct-heading { display: flex; flex-direction: column; line-height: 1.25; margin-bottom: 8px; }
.nb-struct-role    { font-weight: 700; display: block; }
.nb-struct-rule    { display: block; height: 1px; background: currentColor; margin: 3px 0 2px; opacity: .55; }
.nb-struct-title   { display: block; font-weight: 700; }
.nb-struct-heading--part        { font-size: 17pt; }
.nb-struct-heading--chapter     { font-size: 15pt; }
.nb-struct-heading--section     { font-size: 13pt; }
.nb-struct-heading--article,
.nb-struct-heading--transitional { font-size: 12pt; }
.nb-struct-heading--annex       { font-size: 14pt; }

/* ── Structural block margins ── */
.nb-block--part        { margin: 32px 0 20px; }
.nb-block--chapter     { margin: 22px 0 14px; }
.nb-block--section     { margin: 16px 0 10px; }
.nb-block--article,
.nb-block--transitional { margin: 14px 0; }
.nb-block--annex       { margin: 28px 0 16px; }

/* ── Article body ── */
.nb-article-body    { text-align: left; }
.nb-article-body p  { margin: 4px 0; }
.nb-article-body ol,
.nb-article-body ul { margin: 4px 0 4px 20px; }

/* ── Paragraph & Subparagraph ── */
.nb-block--paragraph,
.nb-block--subparagraph { margin: 0; padding: 0; }
.nb-paragraph  { margin: 0; line-height: 1.25; overflow-wrap: break-word; word-break: break-word; }
.nb-para-num   { font-weight: 700; white-space: nowrap; }
.nb-subpara-zone { padding-left: 22px; }

/* ── Preamble ── */
.nb-block--preamble { margin: 16px 0; }
.nb-preamble        { font-style: italic; text-align: left; }
.nb-preamble p      { margin: 4px 0; }

/* ── Law reference ── */
.nb-block--lawref { display: inline; margin: 0; }
.nb-lawref        { font-style: italic; }

/* ── Inline reference ── */
.nb-ref { color: #003476; text-decoration: underline; text-decoration-style: dotted; text-underline-offset: 2px; }

/* ── Definition ── */
.nb-block--definition { margin: 6px 0; }
.nb-definition { display: grid; grid-template-columns: auto 1fr; gap: 0 16px; }
.nb-def-term   { font-weight: 700; font-style: italic; white-space: nowrap; padding-top: 1px; }
.nb-def-term::after { content: ':'; }
.nb-def-body   { margin: 0; line-height: 1.55; }

/* ── Amendment ── */
.nb-block--amendment { margin: 10px 0; }
.nb-amendment        { margin: 0 0 4px; font-style: italic; }
.nb-amendment-text   { margin: 4px 0 0 16px; padding: 6px 12px; border-left: 2px solid #0b0c0c; }

/* ── Container zones ── */
.nb-container-zone { min-height: 0; }

/* ── Page break ── */
.nb-block--pagebreak { break-after: page; page-break-after: always; height: 0; overflow: hidden; }
.nb-pagebreak        { display: none; }
`.trim();

function cloneForExport(paper: HTMLElement): HTMLElement {
  const clone = paper.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('.nb-block-actions, .nb-block--note, .nb-pagebreak').forEach(el => el.remove());
  clone.querySelectorAll<HTMLElement>('[data-nb-init]').forEach(el => el.removeAttribute('data-nb-init'));
  clone.querySelectorAll<HTMLElement>('[data-instance-id]').forEach(el => el.removeAttribute('data-instance-id'));
  return clone;
}

function wrapHtmlDoc(title: string, headerHtml: string, bodyInner: string): string {
  return `<!DOCTYPE html>
<html lang="el">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>${EXPORT_CSS}</style>
</head>
<body>
${headerHtml}${bodyInner}
</body>
</html>`;
}

export function exportHtml(paper: HTMLElement): string {
  const clone = cloneForExport(paper);
  return wrapHtmlDoc('Νόμος', '', clone.innerHTML);
}

/**
 * Async export that embeds the ΦΕΚ header with the coat of arms SVG inline.
 * Falls back to plain `exportHtml` if the SVG fetch fails or meta is empty.
 */
export async function exportFekHtml(paper: HTMLElement, meta: FekMeta): Promise<string> {
  const clone = cloneForExport(paper);
  const title = meta.titlos || 'Νόμος';

  if (!hasFekMeta(meta)) {
    return wrapHtmlDoc(title, '', clone.innerHTML);
  }

  let svgSrc = '/Coat_of_arms_of_Greece.svg';
  try {
    const resp = await fetch('/Coat_of_arms_of_Greece.svg');
    if (resp.ok) svgSrc = await resp.text();
  } catch { /* use URL fallback */ }

  const headerHtml = buildFekHeaderHtml(meta, svgSrc);
  return wrapHtmlDoc(title, headerHtml + '\n', clone.innerHTML);
}

// ── Plain text export ──────────────────────────────────────────────

export function exportTxt(paper: HTMLElement): string {
  const clone = paper.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('.nb-block-actions, .nb-block--note, .nb-block--pagebreak').forEach(el => el.remove());
  clone.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
  const raw = clone.textContent ?? '';
  return raw.split('\n').map(l => l.trim()).filter(Boolean).join('\n');
}

// ── File download helper ───────────────────────────────────────────

export function downloadBlob(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ── Save file validation ───────────────────────────────────────────

export function isSaveFile(obj: unknown): obj is SaveFile {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    (obj as SaveFile).version === 1 &&
    (obj as SaveFile).app === 'legisleture-builder' &&
    Array.isArray((obj as SaveFile).blocks)
  );
}
