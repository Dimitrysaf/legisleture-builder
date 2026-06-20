/**
 * Akoma Ntoso 3.0 XML export for Greek legislative documents.
 * Spec: https://docs.oasis-open.org/legaldocml/akn-core/v1.0/akn-core-v1.0-part1-vocabulary.html
 *
 * Mapping:
 *   part        → <part>
 *   section     → <section>
 *   chapter     → <chapter>
 *   article / transitional / final-article → <article>
 *   paragraph   → <paragraph>
 *   subparagraph → <subparagraph> (inside paragraph)
 *   preamble    → <preamble>
 *   annex       → <annex>
 *   Content blocks (plaintext, definition, amendment, lawref, table) → <p> / <table>
 */

import type { SavedBlock } from '../fileOps';

interface FekMetaLike {
  number?: string;
  date?: string;
  subject?: string;
  fekSeries?: string;
  fekNumber?: string;
  fekDate?: string;
}

// ── Public API ───────────────────────────────────────────────────────

export function exportAkomaNtoso(blocks: SavedBlock[], meta?: FekMetaLike): string {
  const ctx: ExportCtx = { counters: {}, metaDoc: meta };
  const { preamble, bodyBlocks, annexBlocks } = partitionBlocks(blocks);

  const metaXml = buildMeta(meta);
  const preambleXml = preamble ? buildPreamble(preamble, ctx) : '';
  const bodyXml     = buildBody(bodyBlocks, ctx);
  const annexesXml  = annexBlocks.length ? buildAnnexes(annexBlocks, ctx) : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<akomaNtoso xmlns="http://docs.oasis-open.org/legaldocml/ns/akn/3.0">
  <act name="nomos">
${metaXml}${preambleXml}${bodyXml}${annexesXml}  </act>
</akomaNtoso>`;
}

// ── Internal types ───────────────────────────────────────────────────

interface ExportCtx {
  counters: Record<string, number>;
  metaDoc?: FekMetaLike;
}

// ── Block partitioning ───────────────────────────────────────────────

function partitionBlocks(blocks: SavedBlock[]): {
  preamble: SavedBlock | null;
  bodyBlocks: SavedBlock[];
  annexBlocks: SavedBlock[];
} {
  const preamble    = blocks.find(b => b.templateId === 'preamble') ?? null;
  const annexBlocks = blocks.filter(b => b.templateId === 'annex');
  const bodyBlocks  = blocks.filter(b => b.templateId !== 'preamble' && b.templateId !== 'annex');
  return { preamble, bodyBlocks, annexBlocks };
}

// ── <meta> ───────────────────────────────────────────────────────────

function buildMeta(meta?: FekMetaLike): string {
  const date   = meta?.date ?? new Date().toISOString().slice(0, 10);
  const number = meta?.number ?? '';
  const frbrUri = `/gr/act/${date}/${number || 'unknown'}/!main`;
  return `    <meta>
      <identification source="#legisleture-builder">
        <FRBRWork>
          <FRBRuri value="${xa(frbrUri)}"/>
          <FRBRdate date="${xa(date)}" name="enacted"/>
          <FRBRauthor href="#parliament"/>
          <FRBRcountry value="gr"/>
        </FRBRWork>
      </identification>
    </meta>
`;
}

// ── <preamble> ───────────────────────────────────────────────────────

function buildPreamble(block: SavedBlock, _ctx: ExportCtx): string {
  const authority = [block.data.authority, block.data.authority_suffix].filter(Boolean).join(' ');
  const bases     = block.data.bases ?? '';
  const proposal  = block.data.proposal?.trim() ?? '';
  const conclusion = block.data.conclusion?.trim() ?? '';

  const parts = [authority, bases, proposal, conclusion].filter(Boolean).join(' ');
  return `    <preamble>
${wrapContent(parts, '      ')}    </preamble>
`;
}

// ── <body> ───────────────────────────────────────────────────────────

function buildBody(blocks: SavedBlock[], ctx: ExportCtx): string {
  const inner = blocks.map(b => blockToXml(b, ctx, '      ')).join('');
  return `    <body>
${inner}    </body>
`;
}

// ── <annexes> ────────────────────────────────────────────────────────

function buildAnnexes(blocks: SavedBlock[], ctx: ExportCtx): string {
  ctx.counters['ann'] = 0;
  const inner = blocks.map(b => annexToXml(b, ctx)).join('');
  return `    <annexes>
${inner}    </annexes>
`;
}

function annexToXml(b: SavedBlock, ctx: ExportCtx): string {
  ctx.counters['ann'] = (ctx.counters['ann'] ?? 0) + 1;
  const eId = `ann-${ctx.counters['ann']}`;
  const num  = xe(b.data.number ?? String(ctx.counters['ann']));
  const head = xe(b.data.title ?? '');
  const body = wrapContent(b.data.body ?? '', '        ');
  return `      <annex eId="${xa(eId)}">
        <num>${num}</num>
        ${head ? `<heading>${head}</heading>` : ''}
${body}      </annex>
`;
}

// ── Block → XML ──────────────────────────────────────────────────────

function blockToXml(b: SavedBlock, ctx: ExportCtx, indent: string): string {
  switch (b.templateId) {
    case 'part':         return structureToXml(b, ctx, 'part',    'sections',  indent);
    case 'section':      return structureToXml(b, ctx, 'section', 'chapters',  indent);
    case 'chapter':      return structureToXml(b, ctx, 'chapter', 'articles',  indent);
    case 'article':      return articleToXml(b, ctx, false, indent);
    case 'transitional': return articleToXml(b, ctx, true,  indent);
    case 'final-article':return articleToXml(b, ctx, false, indent);
    case 'paragraph':    return paragraphToXml(b, ctx, indent);
    case 'subparagraph': return subparagraphToXml(b, ctx, indent);
    case 'amendment':    return amendmentToXml(b, indent);
    case 'table':        return tableToXml(b, indent);
    case 'closing':      return closingToXml(b, indent);
    case 'toc':
    case 'pagebreak':    return '';  // structural only, no semantic content
    default:             return contentBlockToXml(b, indent);
  }
}

// ── Structural: part / section / chapter ────────────────────────────

function structureToXml(
  b: SavedBlock,
  ctx: ExportCtx,
  tagName: string,
  zoneKey: string,
  indent: string,
): string {
  const key = tagName.slice(0, 3);
  ctx.counters[key] = (ctx.counters[key] ?? 0) + 1;
  const eId  = `${key}-${ctx.counters[key]}`;
  const num  = xe(b.data.number ?? String(ctx.counters[key]));
  const head = xe(b.data.title ?? '');
  const children = (b.zones[zoneKey] ?? []).map(child => blockToXml(child, ctx, indent + '  ')).join('');

  return `${indent}<${tagName} eId="${xa(eId)}">
${indent}  <num>${num}</num>
${indent}  ${head ? `<heading>${head}</heading>` : ''}
${children}${indent}</${tagName}>
`;
}

// ── Article ──────────────────────────────────────────────────────────

function articleToXml(b: SavedBlock, ctx: ExportCtx, isTransitional: boolean, indent: string): string {
  const prefix = isTransitional ? 'trans' : 'art';
  ctx.counters[prefix] = (ctx.counters[prefix] ?? 0) + 1;
  const eId  = `${prefix}-${ctx.counters[prefix]}`;
  const num  = xe(b.data.number ?? String(ctx.counters[prefix]));
  const head = xe(b.data.title ?? '');
  const classAttr = isTransitional ? ' class="transitional"' : '';

  const bodyChildren = b.zones.body ?? [];
  const directContent = b.data.body ?? '';

  let inner = '';
  if (bodyChildren.length > 0) {
    inner = bodyChildren.map(child => blockToXml(child, ctx, indent + '  ')).join('');
  } else if (directContent) {
    inner = wrapContent(directContent, indent + '  ');
  }

  return `${indent}<article eId="${xa(eId)}"${classAttr}>
${indent}  <num>${num}</num>
${indent}  ${head ? `<heading>${head}</heading>` : ''}
${inner}${indent}</article>
`;
}

// ── Paragraph ────────────────────────────────────────────────────────

function paragraphToXml(b: SavedBlock, ctx: ExportCtx, indent: string): string {
  ctx.counters['para'] = (ctx.counters['para'] ?? 0) + 1;
  const eId  = `para-${ctx.counters['para']}`;
  const num  = xe(b.data.number ?? String(ctx.counters['para']));
  const body = b.data.content ?? '';

  const subChildren = b.zones.subparagraphs ?? [];
  const inner = subChildren.length > 0
    ? subChildren.map(c => blockToXml(c, ctx, indent + '  ')).join('')
    : wrapContent(body, indent + '  ');

  return `${indent}<paragraph eId="${xa(eId)}">
${indent}  <num>${num}</num>
${inner}${indent}</paragraph>
`;
}

// ── Subparagraph ─────────────────────────────────────────────────────

function subparagraphToXml(b: SavedBlock, ctx: ExportCtx, indent: string): string {
  ctx.counters['sub'] = (ctx.counters['sub'] ?? 0) + 1;
  const eId  = `sub-${ctx.counters['sub']}`;
  const label = xe(b.data.number ?? '');
  const body  = b.data.content ?? '';

  const subChildren = b.zones.subparagraphs ?? [];
  const inner = subChildren.length > 0
    ? subChildren.map(c => blockToXml(c, ctx, indent + '  ')).join('')
    : wrapContent(body, indent + '  ');

  return `${indent}<subparagraph eId="${xa(eId)}">
${label ? `${indent}  <num>${label}</num>\n` : ''}${inner}${indent}</subparagraph>
`;
}

// ── Amendment ─────────────────────────────────────────────────────────

function amendmentToXml(b: SavedBlock, indent: string): string {
  const lawId  = b.data.targetLawId?.trim() ?? b.data.article_ref?.trim() ?? '';
  const path   = b.data.targetPath?.trim() ?? '';
  const action = b.data.action ?? 'replace';
  const newText = b.data.content?.trim() ?? '';

  const refHref = lawId ? `/gr/act/${lawId.replace(/[^\d/]/g, '')}` : '';
  const refEl   = lawId
    ? `<ref href="${xa(refHref)}">${xe(lawId)}</ref>${path ? ' ' + xe(path) : ''}`
    : xe(`${path} ${lawId}`.trim());

  const aknAction = (() => {
    switch (action) {
      case 'insert':   return 'insertion';
      case 'repeal':   return 'repeal';
      case 'amend':    return 'modification';
      case 'renumber': return 'renumbering';
      default:         return 'substitution';
    }
  })();

  const newTextEl = newText
    ? `\n${indent}  <new>\n${wrapContent(newText, indent + '    ')}${indent}  </new>`
    : '';

  return `${indent}<textualMod type="${xa(aknAction)}">
${indent}  <source><ref href="${xa(refHref)}">${refEl}</ref></source>${newTextEl}
${indent}</textualMod>
`;
}

// ── Content blocks ───────────────────────────────────────────────────

function contentBlockToXml(b: SavedBlock, indent: string): string {
  const body = b.data.body ?? b.data.text ?? '';
  if (!body.trim()) return '';
  return `${indent}<content>
${wrapContent(body, indent + '  ')}${indent}</content>
`;
}

function closingToXml(b: SavedBlock, indent: string): string {
  const placeDate  = b.data.place_date?.trim() ?? '';
  const signatories = b.data.signatories?.trim() ?? '';
  const body = [placeDate, signatories].filter(Boolean).join('\n');
  if (!body) return '';
  return `${indent}<conclusions>
${wrapContent(body, indent + '  ')}${indent}</conclusions>
`;
}

// ── Table ─────────────────────────────────────────────────────────────

function tableToXml(b: SavedBlock, indent: string): string {
  const caption = b.data.caption?.trim();
  const headers = (b.data.headers ?? '').split('|').map(h => h.trim()).filter(Boolean);
  const rowLines = (b.data.rows ?? '').split('\n').filter(l => l.trim());

  const captionEl = caption ? `${indent}  <caption>${xe(caption)}</caption>\n` : '';
  const thead = headers.length
    ? `${indent}  <thead><tr>${headers.map(h => `<th>${xe(h)}</th>`).join('')}</tr></thead>\n`
    : '';
  const tbody = rowLines.length
    ? `${indent}  <tbody>${rowLines.map(line => {
        const cells = line.split('|').map(c => c.trim());
        return `<tr>${cells.map(c => `<td>${xe(c)}</td>`).join('')}</tr>`;
      }).join('')}</tbody>\n`
    : '';

  return `${indent}<table>\n${captionEl}${thead}${tbody}${indent}</table>\n`;
}

// ── Helpers ──────────────────────────────────────────────────────────

/** Wrap an HTML body string into <content><p>...</p></content> */
function wrapContent(html: string, indent: string): string {
  if (!html.trim()) return '';
  // If already has block-level tags, wrap each line; otherwise wrap the whole thing
  const clean = html.trim();
  const isBlock = /^<(p|div|ul|ol|table)\b/i.test(clean);
  const inner = isBlock ? clean : `<p>${clean}</p>`;
  return `${indent}<content>${inner}</content>\n`;
}

/** Escape XML text content */
function xe(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Escape XML attribute values */
function xa(s: string): string {
  return xe(s).replace(/"/g, '&quot;');
}
