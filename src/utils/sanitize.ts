/**
 * Minimal DOM-based HTML sanitizer for contenteditable rich-text fields.
 *
 * Keeps only the tags and attributes that our editor intentionally produces.
 * Disallowed elements are unwrapped (children kept) rather than deleted, so
 * pasted plain text is never lost. Event handlers, scripts, and style
 * attributes are stripped unconditionally.
 */

const ALLOWED_TAGS = new Set([
  'B', 'STRONG',
  'I', 'EM',
  'U',
  'S', 'DEL',
  'SUP', 'SUB',
  'OL', 'UL', 'LI',
  'BR',
  'A',
  'SPAN',
  'P',
]);

// Per-tag attribute allowlist. Unlisted tags allow no attributes.
const ALLOWED_ATTRS: Record<string, Set<string>> = {
  A: new Set(['class', 'data-ref-id', 'data-ref-fmt', 'contenteditable']),
};

export function sanitizeHtml(dirty: string): string {
  const doc = new DOMParser().parseFromString(dirty, 'text/html');
  walkNode(doc.body);
  return doc.body.innerHTML;
}

function walkNode(node: Node): void {
  const children = Array.from(node.childNodes);

  for (const child of children) {
    if (child.nodeType === Node.TEXT_NODE) continue;

    if (child.nodeType !== Node.ELEMENT_NODE) {
      node.removeChild(child);
      continue;
    }

    const el = child as Element;

    if (!ALLOWED_TAGS.has(el.tagName)) {
      // Unwrap: move children up before removing the element
      while (el.firstChild) node.insertBefore(el.firstChild, el);
      node.removeChild(el);
      // Children were moved to `node`, they'll be processed in the same loop
      // since we're iterating a snapshot — re-walk the moved children now.
      for (const moved of Array.from(node.childNodes)) {
        if (moved.nodeType === Node.ELEMENT_NODE) walkNode(moved as Element);
      }
      continue;
    }

    // Strip disallowed attributes
    const allowed = ALLOWED_ATTRS[el.tagName] ?? new Set<string>();
    for (const attr of Array.from(el.attributes)) {
      if (!allowed.has(attr.name)) el.removeAttribute(attr.name);
    }

    walkNode(el);
  }
}
