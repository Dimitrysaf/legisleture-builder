export interface DocEntry {
  instanceId: string;
  templateId: string;
  label: string;     // "Άρθρο 5"
  genLabel: string;  // "Άρθρου 5"
  abbrLabel: string; // "αρ. 5"
  number: string;    // "5"
}

const META: Record<string, { prefix: string; gen: string; abbr: string }> = {
  part:      { prefix: 'Μέρος',      gen: 'Μέρους',      abbr: 'μρ.'   },
  chapter:   { prefix: 'Κεφάλαιο',   gen: 'Κεφαλαίου',  abbr: 'κεφ.' },
  section:   { prefix: 'Τμήμα',      gen: 'Τμήματος',    abbr: 'τμ.'  },
  article:   { prefix: 'Άρθρο',      gen: 'Άρθρου',      abbr: 'αρ.'  },
  paragraph: { prefix: 'Παράγραφος', gen: 'Παραγράφου',  abbr: 'παρ.' },
};

const _entries = new Map<string, DocEntry>();

export function registerEntry(instanceId: string, templateId: string, data: Record<string, string>): void {
  const meta = META[templateId];
  if (!meta) return;
  const num = (data.number ?? '').trim();
  _entries.set(instanceId, {
    instanceId,
    templateId,
    label:     `${meta.prefix} ${num}`,
    genLabel:  `${meta.gen} ${num}`,
    abbrLabel: `${meta.abbr} ${num}`,
    number: num,
  });
}

export function unregisterEntry(instanceId: string): void {
  _entries.delete(instanceId);
}

export function getAllEntries(): DocEntry[] {
  return Array.from(_entries.values());
}

export function getEntry(instanceId: string): DocEntry | undefined {
  return _entries.get(instanceId);
}

export const TEMPLATE_ORDER = ['part', 'chapter', 'section', 'article', 'paragraph'] as const;

export const TEMPLATE_DISPLAY_NAMES: Record<string, string> = {
  part: 'Μέρη', chapter: 'Κεφάλαια', section: 'Τμήματα',
  article: 'Άρθρα', paragraph: 'Παράγραφοι',
};
