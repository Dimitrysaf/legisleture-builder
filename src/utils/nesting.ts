/**
 * Structural nesting rules for the Greek legislative hierarchy.
 *
 * Each entry lists the container contexts where a block type is allowed.
 * Context format: "templateId:zoneName" or "root" for the top-level paper.
 * Templates not listed here have no restriction (custom / content blocks).
 */

const ARTICLE_BODY   = ['article:body', 'transitional:body', 'final-article:body', 'annex:body'] as const;
const STRUCT_PARENTS = ['root', 'part:sections', 'section:chapters', 'chapter:articles'] as const;
const ANYWHERE       = ['root', ...ARTICLE_BODY] as const;

const NESTING_RULES: Record<string, readonly string[]> = {
  // ── Structural headings ─────────────────────────────────────────
  part:          ['root'],
  section:       ['root', 'part:sections'],
  chapter:       ['root', 'part:sections', 'section:chapters'],
  article:       [...STRUCT_PARENTS],
  transitional:  [...STRUCT_PARENTS],
  annex:         ['root'],
  'final-article': ['root'],
  preamble:      ['root'],
  closing:       ['root'],
  toc:           ['root'],
  'fek-header':  ['root'],

  // ── Paragraph-level blocks ──────────────────────────────────────
  paragraph:     [...ARTICLE_BODY],
  subparagraph:  ['paragraph:subparagraphs', 'subparagraph:subparagraphs'],

  // ── Content blocks ──────────────────────────────────────────────
  definition:   [...ANYWHERE],
  amendment:    [...ANYWHERE],
  lawref:       [...ANYWHERE, 'paragraph:subparagraphs', 'subparagraph:subparagraphs'],
  plaintext:    [...ANYWHERE],
  table:        [...ANYWHERE],
  'image-block': [...ANYWHERE],
  footnote:     [...ANYWHERE],
  interpretive: [...ANYWHERE],
  pagebreak:    [...ANYWHERE],

  // note has no restriction — allowed anywhere
  // custom templates have no restriction
};

/**
 * Derive the container context string from a DOM container element.
 * Returns 'root' for the main paper, or 'templateId:zoneName' for nested zones.
 */
export function getContainerContext(container: HTMLElement): string {
  const zoneName = container.dataset.containerFor;
  if (!zoneName) return 'root'; // it's the paper

  const blockEl = container.closest<HTMLElement>('[data-template]');
  const templateId = blockEl?.dataset.template ?? '';
  return templateId ? `${templateId}:${zoneName}` : 'root';
}

/**
 * Returns true if templateId is allowed in the given container.
 */
export function canInsertInContainer(templateId: string, container: HTMLElement): boolean {
  const rules = NESTING_RULES[templateId];
  if (!rules) return true; // no rule = allowed anywhere

  const context = getContainerContext(container);
  return rules.includes(context);
}

/**
 * Human-readable description of what is allowed in a container.
 * Used in error messages.
 */
export function allowedTypesInContext(context: string): string {
  const allowed = Object.entries(NESTING_RULES)
    .filter(([, rules]) => rules.includes(context))
    .map(([id]) => id);
  return allowed.join(', ') || '(κανένα)';
}
