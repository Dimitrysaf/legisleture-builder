import type { SavedBlock } from './fileOps';

export type AmendmentAction = 'replace' | 'insert' | 'repeal' | 'amend' | 'renumber';

export interface AmendmentOp {
  targetLawId: string;
  targetPath: string;
  action: AmendmentAction;
  content: string;
}

interface ParsedPath {
  articleNum?: string;
  paragraphNum?: string;
  subparagraphNum?: string;
}

function parsePath(path: string): ParsedPath {
  const result: ParsedPath = {};
  const artMatch = path.match(/άρθρ(?:ο|ου)\s+(\d+)/i);
  if (artMatch) result.articleNum = artMatch[1];
  const parMatch = path.match(/παρ(?:ά(?:γραφ(?:ος|ου|ο)|\.))?\s*\.?\s*(\d+)/i);
  if (parMatch) result.paragraphNum = parMatch[1];
  const subMatch = path.match(/(?:υποπαράγραφ(?:ος|ου|ο)|εδάφ(?:ιο|ίου))\s+([α-ωΑ-Ω]+)/i);
  if (subMatch) result.subparagraphNum = subMatch[1];
  return result;
}

function lawIdsMatch(a: string, b: string): boolean {
  const norm = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();
  const na = norm(a), nb = norm(b);
  return na === nb || na.includes(nb) || nb.includes(na);
}

export function collectAmendments(blocks: SavedBlock[], targetLawId: string): AmendmentOp[] {
  const ops: AmendmentOp[] = [];

  function walk(blks: SavedBlock[]): void {
    for (const b of blks) {
      if (b.templateId === 'amendment') {
        const lawId = (b.data.targetLawId ?? '').trim();
        if (lawId && lawIdsMatch(lawId, targetLawId)) {
          ops.push({
            targetLawId: lawId,
            targetPath: b.data.targetPath ?? '',
            action: (b.data.action ?? 'replace') as AmendmentAction,
            content: b.data.content ?? '',
          });
        }
      }
      for (const zone of Object.values(b.zones)) walk(zone);
    }
  }

  walk(blocks);
  return ops;
}

function applyOpToZone(blocks: SavedBlock[], op: AmendmentOp, parsed: ParsedPath): SavedBlock[] {
  const result: SavedBlock[] = [];

  for (const b of blocks) {
    const isArticle = b.templateId === 'article' || b.templateId === 'transitional' || b.templateId === 'final-article';

    if (isArticle && parsed.articleNum && b.data.number === parsed.articleNum) {
      if (!parsed.paragraphNum) {
        if (op.action === 'repeal') {
          result.push({ ...b, data: { ...b.data, _repealed: '1', title: `[ΚΑΤΑΡΓΗΘΗΚΕ]` } });
        } else if (op.action === 'replace' || op.action === 'amend') {
          result.push({ ...b, data: { ...b.data, title: op.content || b.data.title } });
        } else {
          result.push(b);
        }
      } else {
        const bodyZone = b.zones.body ?? [];
        const newBody = applyOpToParaZone(bodyZone, op, parsed);
        result.push({ ...b, zones: { ...b.zones, body: newBody } });
      }
    } else {
      const newZones: Record<string, SavedBlock[]> = {};
      for (const [key, zone] of Object.entries(b.zones)) {
        newZones[key] = applyOpToZone(zone, op, parsed);
      }
      result.push({ ...b, zones: newZones });
    }
  }

  return result;
}

function applyOpToParaZone(blocks: SavedBlock[], op: AmendmentOp, parsed: ParsedPath): SavedBlock[] {
  const result: SavedBlock[] = [];
  let insertAfterIdx = -1;

  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    if (b.templateId === 'paragraph' && b.data.number === parsed.paragraphNum) {
      if (op.action === 'repeal') {
        result.push({ ...b, data: { ...b.data, content: '<em>[ΚΑΤΑΡΓΗΘΗΚΕ]</em>', _repealed: '1' } });
      } else if (op.action === 'replace' || op.action === 'amend') {
        result.push({ ...b, data: { ...b.data, content: op.content } });
      } else if (op.action === 'insert') {
        result.push(b);
        insertAfterIdx = result.length - 1;
      } else {
        result.push(b);
      }
    } else {
      result.push(b);
    }
  }

  if (op.action === 'insert' && insertAfterIdx >= 0) {
    const newPara: SavedBlock = {
      id: `codif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      templateId: 'paragraph',
      data: { number: '', content: op.content },
      zones: { subparagraphs: [] },
    };
    result.splice(insertAfterIdx + 1, 0, newPara);
  }

  return result;
}

export function applyAmendments(baseBlocks: SavedBlock[], ops: AmendmentOp[]): SavedBlock[] {
  let blocks = structuredClone(baseBlocks);
  for (const op of ops) {
    const parsed = parsePath(op.targetPath);
    blocks = applyOpToZone(blocks, op, parsed);
  }
  return blocks;
}

export function getLawIdsFromAmendments(blocks: SavedBlock[]): string[] {
  const ids = new Set<string>();
  function walk(blks: SavedBlock[]): void {
    for (const b of blks) {
      if (b.templateId === 'amendment' && b.data.targetLawId?.trim()) {
        ids.add(b.data.targetLawId.trim());
      }
      for (const zone of Object.values(b.zones)) walk(zone);
    }
  }
  walk(blocks);
  return [...ids];
}
