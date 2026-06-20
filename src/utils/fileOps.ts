import type { TemplateInstance } from '../templates/types';
import type { FekMeta } from './fekMeta';
import type { Project, ProjectFile } from '../types/project';
import { buildFekHeaderHtml, hasFekMeta, EMPTY_META } from './fekMeta';

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

export function serializeProject(
  paper: HTMLElement,
  instances: Map<string, TemplateInstance>,
  project: Project,
): ProjectFile {
  const blocks = serializeContainer(paper, instances);
  return {
    version: 2,
    app: 'legisleture-builder',
    project: {
      ...project,
      blocks,
      modifiedAt: new Date().toISOString(),
    },
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

    const data = { ...inst.data };
    // Strip inline base64 src when a separate assetId reference exists — keeps JSON small
    if (inst.templateId === 'image-block' && data.assetId && data.src?.startsWith('data:')) {
      data.src = '';
    }

    blocks.push({ id, templateId: inst.templateId, data, zones });
  }

  return blocks;
}

// ── ΦΕΚ meta from block ────────────────────────────────────────────

/**
 * Reads ΦΕΚ metadata from a fek-header block in the paper.
 * Falls back to `fallback` (e.g. project.fekMeta) if no block is found.
 */
export function readFekMeta(
  paper: HTMLElement,
  instances: Map<string, TemplateInstance>,
  fallback?: FekMeta,
): FekMeta {
  for (const child of paper.children) {
    const w = child as HTMLElement;
    if (!w.classList.contains('nb-block-wrapper')) continue;
    const id = w.dataset.instanceId;
    if (!id) continue;
    const inst = instances.get(id);
    if (inst?.templateId !== 'fek-header') continue;
    return {
      teuchos:    inst.data.teuchos    ?? '',
      arithmos:   inst.data.arithmos   ?? '',
      hmeromhnia: inst.data.hmeromhnia ?? '',
      titlos:     inst.data.titlos     ?? '',
      twoColumn:  inst.data.twoColumn  === 'true',
    };
  }
  return fallback ?? { ...EMPTY_META };
}

// ── HTML export ────────────────────────────────────────────────────

const EXPORT_CSS = `
@page { size: A4 portrait; margin: 0 0 14mm 0; }
@page :right { @bottom-right { content: counter(page); font-size: 9pt; font-family: 'GFS Didot', Georgia, serif; color: #374151; } }
@page :left  { @bottom-left  { content: counter(page); font-size: 9pt; font-family: 'GFS Didot', Georgia, serif; color: #374151; } }
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; border-radius: 0; }

body {
  font-family: 'GFS Didot', 'Didot', 'Noto Serif', Georgia, 'Times New Roman', serif;
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
.nb-block { padding: 0; }

/* ── Structural headings ── */
.nb-struct-heading { display: inline-flex; flex-direction: column; line-height: 1.25; margin-bottom: 8px; }
.nb-struct-role    { font-weight: 700; display: block; }
.nb-struct-rule    { display: block; height: 1px; background: currentColor; margin: 3px 0 2px; opacity: .55; }
.nb-struct-title   { display: block; font-weight: 700; font-size: 11.5pt; margin-top: 0; }
.nb-struct-heading--part        { font-size: 17pt; }
.nb-struct-heading--chapter     { font-size: 15pt; }
.nb-struct-heading--section     { font-size: 13pt; }
.nb-struct-heading--article,
.nb-struct-heading--transitional { font-size: 12pt; }
.nb-struct-heading--annex       { font-size: 14pt; }

/* ── Structural block margins ── */
.nb-block--part        { margin: 0; }
.nb-block--chapter     { margin: 0; }
.nb-block--section     { margin: 0; }
.nb-block--article,
.nb-block--transitional { margin: 0; }
.nb-block--annex       { margin: 0; }

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
.nb-subpara-zone { padding-left: 0; }

/* ── Preamble ── */
.nb-block--preamble         { margin: 0; }
.nb-preamble                { font-style: italic; text-align: left; }
.nb-preamble p              { margin: 4px 0; }
.nb-preamble-authority      { font-style: normal; font-weight: 700; text-align: left; letter-spacing: 0.04em; margin-bottom: 12px; }
.nb-preamble-having         { font-style: normal; font-weight: 600; margin-top: 8pt; margin-bottom: 2pt; }
.nb-preamble-bases          { padding-left: 16pt; font-style: italic; }
.nb-preamble-bases ol,
.nb-preamble-bases ul       { margin: 4pt 0 4pt 20pt; }
.nb-preamble-bases p        { margin: 2pt 0; }
.nb-preamble-proposal       { margin-top: 10pt; font-style: italic; }
.nb-preamble-conclusion     { font-style: normal; font-weight: 700; margin-top: 8pt; }

/* ── Law reference ── */
.nb-block--lawref { display: inline; margin: 0; }
.nb-lawref        { font-style: italic; }

/* ── Inline reference ── */
.nb-ref { color: #003476; text-decoration: underline; text-decoration-style: dotted; text-underline-offset: 2px; }

/* ── Definition ── */
.nb-block--definition { margin: 0; }
.nb-definition { display: grid; grid-template-columns: auto 1fr; gap: 0 16px; }
.nb-def-term   { font-weight: 700; font-style: italic; white-space: nowrap; padding-top: 1px; }
.nb-def-term::after { content: ':'; }
.nb-def-body   { margin: 0; line-height: 1.55; }

/* ── Amendment ── */
.nb-block--amendment { margin: 0; }
.nb-amendment        { margin: 0 0 4px; font-style: italic; }
.nb-amendment-text   { margin: 4px 0 0 16px; padding: 6px 12px; border-left: 2px solid #0b0c0c; }

/* ── Container zones ── */
.nb-container-zone { min-height: 0; }

/* ── Plain text ── */
.nb-block--plaintext { margin: 0; padding: 0; }

/* ── Image / Figure ── */
.nb-block--image    { margin: 0; }
.nb-figure          { display: flex; flex-direction: column; margin: 0; }
.nb-figure-img      { display: block; height: auto; max-width: 100%; border: 1px solid #e5e7eb; }
.nb-figure-caption  { font-size: 9pt; color: #6b7280; text-align: left; margin-top: 5pt; font-style: italic; line-height: 1.4; }
.nb-figure-num      { font-weight: 700; font-style: normal; }

/* ── ΦΕΚ header block ── */
.nb-block--fek-header { column-span: all; }

/* ── Two-column layout ── */
.nb-content { column-count: 2; column-gap: 6mm; column-rule: 0.5pt solid #e5e7eb; }

/* ── Page break ── */
.nb-block--pagebreak { break-after: page; page-break-after: always; height: 0; overflow: hidden; }
.nb-pagebreak        { display: none; }

/* ── Table ── */
.nb-block--table { margin: 0; overflow-x: auto; }
.nb-table { width: 100%; border-collapse: collapse; font-size: 10.5pt; line-height: 1.4; }
.nb-table th, .nb-table td { border: 1px solid #374151; padding: 5px 10px; text-align: left; vertical-align: top; }
.nb-table thead th { background: #f3f4f6; font-weight: 700; }
.nb-table tbody tr:nth-child(even) td { background: #f9fafb; }
.nb-table-caption { font-size: 9pt; color: #6b7280; font-style: italic; margin-bottom: 4pt; caption-side: top; text-align: left; }

/* ── Closing / Signatures ── */
.nb-block--closing { margin: 0; }
.nb-closing-date { font-weight: 700; margin-bottom: 24px; }
.nb-signatories { display: flex; flex-wrap: wrap; gap: 32px 48px; }
.nb-signatory { min-width: 160px; }
.nb-signatory-role { font-weight: 700; text-transform: uppercase; font-size: 10pt; margin-bottom: 40px; }
.nb-signatory-name { font-size: 10.5pt; }

/* ── Final Article ── */
.nb-block--final-article { margin: 0; }

/* ── Footnote ── */
.nb-block--footnote { margin: 0; }
.nb-footnote-rule { border: none; border-top: 1px solid #9ca3af; width: 33%; margin: 4px 0 6px; }
.nb-footnote { display: grid; grid-template-columns: auto 1fr; gap: 0 8px; font-size: 9pt; line-height: 1.5; }
.nb-footnote-marker { font-weight: 700; white-space: nowrap; padding-top: 1px; }
.nb-footnote-body p { margin: 2px 0; }

/* ── Table of Contents ── */
.nb-block--toc { margin: 0; }
.nb-toc-title { font-weight: 700; font-size: 12pt; text-align: left; letter-spacing: 0.06em; margin-bottom: 12px; text-transform: uppercase; }
.nb-toc-body { line-height: 1.8; }
.nb-toc-empty { font-style: italic; color: #6b7280; font-size: 10pt; }
.nb-toc-item { padding: 1px 0; }
.nb-toc-item--part { font-weight: 700; font-size: 11pt; margin-top: 6px; }
.nb-toc-item--chapter { font-weight: 700; font-size: 10.5pt; padding-left: 12px; }
.nb-toc-item--section { padding-left: 24px; }
.nb-toc-item--article, .nb-toc-item--final-article { padding-left: 36px; font-size: 10pt; }
.nb-toc-item--annex { font-weight: 700; margin-top: 6px; }
.nb-toc-item--transitional { padding-left: 36px; font-size: 10pt; font-style: italic; }
.nb-block--interpretive { margin: 0; }
.nb-interpretive { position: relative; border-top: 1.5px solid #374151; padding: 1px; }
.nb-interpretive::before, .nb-interpretive::after { content: ''; position: absolute; top: 0; width: 1.5px; height: 2.2em; background: linear-gradient(to bottom, #374151 0%, transparent 100%); }
.nb-interpretive::before { left: 0; }
.nb-interpretive::after { right: 0; }
.nb-interpretive-body { font-size: 9.5pt; line-height: 1.65; }
.nb-interpretive-body em { font-style: italic; }
.nb-interpretive-body p { margin: 0 0 4px; }
`.trim();

function cloneForExport(paper: HTMLElement): HTMLElement {
  const clone = paper.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('.nb-block-actions, .nb-block--note, .nb-pagebreak').forEach(el => el.remove());
  clone.querySelectorAll<HTMLElement>('[data-nb-init]').forEach(el => el.removeAttribute('data-nb-init'));
  clone.querySelectorAll<HTMLElement>('[data-instance-id]').forEach(el => el.removeAttribute('data-instance-id'));
  return clone;
}

const SCREEN_CSS = `
@media screen {
  html { background: #d1d5db; }
  body { max-width: 210mm; margin: 20px auto; box-shadow: 0 4px 20px rgba(0,0,0,.3); min-height: 297mm; }
}`.trim();

function wrapHtmlDoc(title: string, headerHtml: string, bodyInner: string): string {
  return `<!DOCTYPE html>
<html lang="el">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=GFS+Didot:ital,wght@0,400;1,400&display=swap" rel="stylesheet">
<style>${EXPORT_CSS}</style>
<style>${SCREEN_CSS}</style>
</head>
<body>
${headerHtml}${bodyInner}
</body>
</html>`;
}

export function buildDocHtml(paper: HTMLElement, meta: FekMeta | null): string {
  const clone = cloneForExport(paper);
  const title = meta?.titlos || 'Νόμος';

  // If a fek-header block is already in the document, don't inject a second header
  const fekBlock = clone.querySelector<HTMLElement>('.nb-block--fek-header');
  const headerHtml = (!fekBlock && meta && hasFekMeta(meta))
    ? buildFekHeaderHtml(meta, '/Coat_of_arms_of_Greece.svg') + '\n'
    : '';

  const isTwoColumn = fekBlock
    ? fekBlock.dataset.twoColumn === 'true'
    : (meta?.twoColumn ?? false);
  const bodyInner = isTwoColumn
    ? `<div class="nb-content">${clone.innerHTML}</div>`
    : clone.innerHTML;
  return wrapHtmlDoc(title, headerHtml, bodyInner);
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

  let svgSrc = '';
  try {
    const resp = await fetch('/Coat_of_arms_of_Greece.svg');
    if (resp.ok) svgSrc = await resp.text();
  } catch { /* use img URL fallback */ }

  const fekBlock = clone.querySelector<HTMLElement>('.nb-block--fek-header');

  if (fekBlock) {
    // Inline the coat-of-arms SVG so the download is self-contained
    if (svgSrc) {
      const imgEl = clone.querySelector<HTMLImageElement>('.nb-fek-emblem-img');
      if (imgEl) {
        const tmp = document.createElement('div');
        tmp.innerHTML = svgSrc;
        const svgEl = tmp.firstElementChild;
        if (svgEl) imgEl.replaceWith(svgEl);
      }
    }
    const isTwoColumn = fekBlock.dataset.twoColumn === 'true';
    const bodyInner = isTwoColumn
      ? `<div class="nb-content">${clone.innerHTML}</div>`
      : clone.innerHTML;
    return wrapHtmlDoc(title, '', bodyInner);
  }

  // Legacy: no fek-header block — inject from meta
  if (!hasFekMeta(meta)) return wrapHtmlDoc(title, '', clone.innerHTML);

  const headerHtml = buildFekHeaderHtml(meta, svgSrc || '/Coat_of_arms_of_Greece.svg');
  const bodyInner = meta.twoColumn
    ? `<div class="nb-content">${clone.innerHTML}</div>`
    : clone.innerHTML;
  return wrapHtmlDoc(title, headerHtml + '\n', bodyInner);
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

export function isProjectFile(obj: unknown): obj is ProjectFile {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    (obj as ProjectFile).version === 2 &&
    (obj as ProjectFile).app === 'legisleture-builder' &&
    typeof (obj as ProjectFile).project === 'object' &&
    (obj as ProjectFile).project !== null &&
    Array.isArray((obj as ProjectFile).project.blocks)
  );
}
