import type { SavedBlock, SaveFile } from './fileOps';

// ── helpers ────────────────────────────────────────────────────────

let _seq = 0;
function mkId(): string {
  return `imp_${Date.now()}_${_seq++}`;
}

function mkBlock(templateId: string, data: Record<string, string>): SavedBlock {
  return { id: mkId(), templateId, data, zones: {} };
}

/** Reverse the LaTeX escaping from our generateLatex output */
function unesc(s: string): string {
  return s
    .replace(/\\textbf\{([\s\S]*?)\}/g, '<b>$1</b>')
    .replace(/\\textit\{([\s\S]*?)\}/g, '<i>$1</i>')
    .replace(/\\underline\{([\s\S]*?)\}/g, '<u>$1</u>')
    .replace(/ \\\\\n/g, '<br>')
    .replace(/\\&/g, '&')
    .replace(/\\%/g, '%')
    .replace(/\\\$/g, '$')
    .replace(/\\#/g, '#')
    .replace(/\\_/g, '_')
    .replace(/\\\{/g, '{')
    .replace(/\\\}/g, '}')
    .replace(/\\textbackslash\{\}/g, '\\')
    .replace(/\\textasciitilde\{\}/g, '~')
    .replace(/\\textasciicircum\{\}/g, '^')
    .replace(/~/g, ' ')
    .trim();
}

/** Parse "Μέρος Α΄ -- ΤΙΤΛΟΣ" → { number, title } */
function splitHeading(text: string): { number: string; title: string } {
  const idx = text.indexOf(' -- ');
  if (idx >= 0) {
    const role = text.slice(0, idx).trim();
    const title = text.slice(idx + 4).trim();
    // role is like "Μέρος Α΄" – drop the first word (structural keyword)
    const num = role.replace(/^\S+\s*/, '').trim() || '1';
    return { number: num, title };
  }
  const num = text.replace(/^\S+\s*/, '').trim() || '1';
  return { number: num, title: '' };
}

// Zone each parent template provides for children
const PARENT_ZONE: Record<string, string> = {
  part: 'chapters',
  chapter: 'articles',
  section: 'articles',
  article: 'body',
  transitional: 'body',
  annex: 'body',
  paragraph: 'subparagraphs',
  subparagraph: 'subparagraphs',
};

// Nesting level: higher = deeper
const LEVEL: Record<string, number> = {
  part: 1, chapter: 2,
  section: 3, annex: 3,
  article: 4, transitional: 4,
  paragraph: 5, subparagraph: 6,
  preamble: 5, lawref: 5, note: 5,
  pagebreak: 5, definition: 5, amendment: 5,
};

// ── stack-based tree builder ───────────────────────────────────────

interface Entry { block: SavedBlock; level: number; zone: string }

class BlockTree {
  top: SavedBlock[] = [];
  private stack: Entry[] = [];

  private container(): SavedBlock[] {
    if (!this.stack.length) return this.top;
    const e = this.stack[this.stack.length - 1];
    if (!e.block.zones[e.zone]) e.block.zones[e.zone] = [];
    return e.block.zones[e.zone]!;
  }

  add(b: SavedBlock): void {
    const lvl = LEVEL[b.templateId] ?? 5;
    while (this.stack.length && this.stack[this.stack.length - 1].level >= lvl) {
      this.stack.pop();
    }
    this.container().push(b);
    const zone = PARENT_ZONE[b.templateId];
    if (zone) this.stack.push({ block: b, level: lvl, zone });
  }
}

// ── chunk matchers ─────────────────────────────────────────────────

const RE_STAR_CMD  = /^\\(\w+)\*\{([\s\S]*)\}$/;
const RE_PARA      = /^\\noindent\\textbf\{(\d+)\.\}\s*([\s\S]*)$/;
const RE_SUBPARA   = /^\\hspace\{1em\}\\textbf\{([^}]+?)\.\}\s*([\s\S]*)$/;
const RE_DEF       = /^\\noindent\\textbf\{\\textit\{([^}]+?):\}\}\s*([\s\S]*)$/;
const RE_TEXTIT_LN = /^\\textit\{([\s\S]*)\}$/;
const RE_NOTE      = /^%\s*\[ΣΗΜΕΙΩΣΗ\]:\s*([\s\S]*)$/;

function parseChunk(chunk: string): SavedBlock | null {
  const lines = chunk.split('\n').map(l => l.trim());
  const first = lines[0];
  const rest  = lines.slice(1).join('\n').trim();

  // \clearpage
  if (first === '\\clearpage') return mkBlock('pagebreak', {});

  // % [ΣΗΜΕΙΩΣΗ]
  const noteM = first.match(RE_NOTE);
  if (noteM) return mkBlock('note', { content: noteM[1] });

  // \begin{quote}...\end{quote}  →  preamble or amendment quote
  if (first === '\\begin{quote}') {
    const inner = chunk
      .replace(/^\\begin\{quote\}\n?/, '')
      .replace(/\n?\\end\{quote\}$/, '')
      .trim();
    // \textit{...} → preamble (old export format; store in bases as best-effort)
    const tiM = inner.match(/^\\textit\{([\s\S]*)\}$/);
    return mkBlock('preamble', { bases: unesc(tiM ? tiM[1] : inner) });
  }

  // Structural headings: \part*, \chapter*, \section*, \subsection*
  const starM = first.match(RE_STAR_CMD);
  if (starM) {
    const [, cmd, raw] = starM;
    const content = unesc(raw);
    const { number, title } = splitHeading(content);

    switch (cmd) {
      case 'part':       return mkBlock('part',    { number, title });
      case 'chapter':    return mkBlock('chapter', { number, title });
      case 'section':
        return mkBlock(content.startsWith('Παράρτημα') ? 'annex' : 'section', { number, title });
      case 'subsection':
        return mkBlock(content.startsWith('Μεταβατική') ? 'transitional' : 'article', { number, title });
    }
  }

  // \noindent\textbf{N.} → paragraph
  const paraM = first.match(RE_PARA);
  if (paraM) {
    const content = unesc(paraM[2] + (rest ? '\n' + rest : ''));
    return mkBlock('paragraph', { number: paraM[1], content });
  }

  // \hspace{1em}\textbf{α.} → subparagraph
  const subM = first.match(RE_SUBPARA);
  if (subM) {
    const num     = subM[1];
    const content = unesc(subM[2] + (rest ? '\n' + rest : ''));
    return mkBlock('subparagraph', { number: num, content });
  }

  // \noindent\textbf{\textit{term:}} → definition
  const defM = first.match(RE_DEF);
  if (defM) {
    return mkBlock('definition', { term: unesc(defM[1]), definition: unesc(defM[2] + (rest ? '\n' + rest : '')) });
  }

  // Amendment: "... ως εξής:" + \begin{quote}«...»\end{quote} in same chunk
  if (chunk.includes('ως εξής:') && chunk.includes('\\begin{quote}')) {
    const ref     = unesc(first.replace(/\s*ως εξής:\s*$/, '').trim());
    const quoteM  = chunk.match(/\\begin\{quote\}\s*([\s\S]*?)\s*\\end\{quote\}/);
    const newText = quoteM ? unesc(quoteM[1].replace(/^«|»$/g, '').trim()) : '';
    return mkBlock('amendment', { article_ref: ref, action: 'αντικαθίσταται', content: newText });
  }

  // \textit{single-line} → law reference
  const tiLn = first.match(RE_TEXTIT_LN);
  if (tiLn && lines.length === 1) {
    return mkBlock('lawref', { law_number: unesc(tiLn[1]) });
  }

  return null; // skip unknown
}

// ── public API ─────────────────────────────────────────────────────

export function parseLaTeX(source: string): SaveFile {
  // Extract document body
  const bodyM = source.match(/\\begin\{document\}([\s\S]*?)\\end\{document\}/);
  const body  = bodyM ? bodyM[1] : source;

  // Split on 1+ blank lines, strip \selectlanguage etc.
  const chunks = body
    .split(/\n{2,}/)
    .map(c => c.trim())
    .filter(c => c.length > 0 && !c.startsWith('\\selectlanguage') && !c.startsWith('%!'));

  const tree = new BlockTree();

  for (const chunk of chunks) {
    const b = parseChunk(chunk);
    if (b) tree.add(b);
  }

  return {
    version: 1,
    app: 'legisleture-builder',
    savedAt: new Date().toISOString(),
    blocks: tree.top,
  };
}
