/**
 * Cross-document law index:
 *   - buildLawIndex()     — scans current doc's articles for catalog export
 *   - parseLawIndex()     — validates an imported .json file
 *   - serializeLawIndex() — serializes to downloadable JSON
 */

import type { SavedBlock } from '../fileOps';
import type { LawIndex } from '../db';

export type { LawIndex };

interface FekMetaLike {
  number?: string;
  subject?: string;
  date?: string;
  fekSeries?: string;
  fekNumber?: string;
  fekDate?: string;
}

// ── Build ─────────────────────────────────────────────────────────────

/**
 * Walk the serialized blocks and extract articles into a LawIndex record.
 */
export function buildLawIndex(blocks: SavedBlock[], meta?: FekMetaLike): LawIndex {
  const lawId = meta?.number
    ? `ν. ${meta.number}/${meta.date?.slice(0, 4) ?? new Date().getFullYear()}`
    : 'άγνωστος νόμος';

  const fekRef = meta?.fekSeries && meta?.fekNumber && meta?.fekDate
    ? `${meta.fekSeries} ${meta.fekNumber}/${meta.fekDate}`
    : undefined;

  const articles: LawIndex['articles'] = [];
  let artCounter = 0;

  function walkBlocks(blks: SavedBlock[]): void {
    for (const b of blks) {
      if (b.templateId === 'article' || b.templateId === 'transitional' || b.templateId === 'final-article') {
        artCounter++;
        articles.push({
          number: b.data.number ?? String(artCounter),
          title:  b.data.title  ?? '',
          eId:    `art-${artCounter}`,
        });
        // Recurse into body zone so we catch deeply nested articles
        walkBlocks(b.zones.body ?? []);
      } else {
        // Recurse into all zones
        for (const zone of Object.values(b.zones)) walkBlocks(zone);
      }
    }
  }

  walkBlocks(blocks);

  const id = `law_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  return {
    id,
    lawId,
    subject: meta?.subject,
    date:    meta?.date,
    fekRef,
    importedAt: new Date().toISOString(),
    articles,
  };
}

// ── Serialize / parse ─────────────────────────────────────────────────

export function serializeLawIndex(idx: LawIndex): string {
  return JSON.stringify({ ...idx, _type: 'legisleture-law-index', _version: 1 }, null, 2);
}

export function parseLawIndex(raw: unknown): LawIndex | null {
  if (
    typeof raw !== 'object' || !raw ||
    (raw as Record<string, unknown>)['_type'] !== 'legisleture-law-index' ||
    typeof (raw as Record<string, unknown>)['lawId'] !== 'string'
  ) return null;

  const r = raw as Record<string, unknown>;
  return {
    id:         typeof r.id === 'string' ? r.id : `law_${Date.now()}`,
    lawId:      r.lawId as string,
    subject:    typeof r.subject === 'string' ? r.subject : undefined,
    date:       typeof r.date    === 'string' ? r.date    : undefined,
    fekRef:     typeof r.fekRef  === 'string' ? r.fekRef  : undefined,
    importedAt: new Date().toISOString(),
    articles:   Array.isArray(r.articles)
      ? (r.articles as Array<Record<string, unknown>>).map(a => ({
          number: String(a.number ?? ''),
          title:  String(a.title  ?? ''),
          eId:    String(a.eId    ?? ''),
        }))
      : [],
  };
}
