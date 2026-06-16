import type { TemplateInstance } from '../templates/types';

function esc(str: string): string {
  return str
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/&/g, '\\&')
    .replace(/%/g, '\\%')
    .replace(/\$/g, '\\$')
    .replace(/#/g, '\\#')
    .replace(/_/g, '\\_')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');
}

function richToLatex(html: string): string {
  return html
    .replace(/<strong>([\s\S]*?)<\/strong>/gi, (_, c) => `\\textbf{${c}}`)
    .replace(/<b>([\s\S]*?)<\/b>/gi, (_, c) => `\\textbf{${c}}`)
    .replace(/<em>([\s\S]*?)<\/em>/gi, (_, c) => `\\textit{${c}}`)
    .replace(/<i>([\s\S]*?)<\/i>/gi, (_, c) => `\\textit{${c}}`)
    .replace(/<u>([\s\S]*?)<\/u>/gi, (_, c) => `\\underline{${c}}`)
    .replace(/<br\s*\/?>/gi, ' \\\\\n')
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<\/p>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '\\&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, '~')
    .replace(/&quot;/g, '"')
    .trim();
}

function containerToLatex(zone: HTMLElement, instances: Map<string, TemplateInstance>): string {
  const lines: string[] = [];
  for (const child of Array.from(zone.children)) {
    const el = child as HTMLElement;
    if (!el.classList.contains('nb-block-wrapper')) continue;
    const latex = wrapperToLatex(el, instances);
    if (latex) {
      lines.push(latex);
      lines.push('');
    }
  }
  return lines.join('\n').trimEnd();
}

function wrapperToLatex(wrapper: HTMLElement, instances: Map<string, TemplateInstance>): string {
  const id = wrapper.dataset.instanceId;
  if (!id) return '';
  const inst = instances.get(id);
  if (!inst) return '';
  const d = inst.data;

  const nestedZone = wrapper.querySelector<HTMLElement>('.nb-container-zone');
  const nestedLatex = nestedZone ? '\n\n' + containerToLatex(nestedZone, instances) : '';

  switch (inst.templateId) {
    case 'part': {
      const titlePart = d.title?.trim() ? ` -- ${d.title.trim()}` : '';
      return `\\part*{${esc(`Μέρος ${d.number}${titlePart}`)}}${nestedLatex}`;
    }
    case 'chapter': {
      const titlePart = d.title?.trim() ? ` -- ${d.title.trim()}` : '';
      return `\\chapter*{${esc(`Κεφάλαιο ${d.number}${titlePart}`)}}${nestedLatex}`;
    }
    case 'section': {
      const titlePart = d.title?.trim() ? ` -- ${d.title.trim()}` : '';
      return `\\section*{${esc(`Τμήμα ${d.number}${titlePart}`)}}${nestedLatex}`;
    }
    case 'article': {
      const titlePart = d.title?.trim() ? ` -- ${d.title.trim()}` : '';
      return `\\subsection*{${esc(`Άρθρο ${d.number}${titlePart}`)}}${nestedLatex}`;
    }
    case 'paragraph':
      return `\\noindent\\textbf{${esc(`${d.number}.`)}} ${richToLatex(d.content ?? '')}${nestedLatex}`;
    case 'subparagraph':
      return `\\hspace{1em}\\textbf{${esc(`${d.number}.`)}} ${richToLatex(d.content ?? '')}${nestedLatex}`;
    case 'preamble':
      return `\\begin{quote}\n\\textit{${richToLatex(d.content ?? '')}}\n\\end{quote}`;
    case 'lawref': {
      const article = d.article?.trim() ? ` ${d.article.trim()}` : '';
      const fek = d.fek?.trim() ? ` (ΦΕΚ ${d.fek.trim()})` : '';
      const title = d.title?.trim() ? ` «${d.title.trim()}»` : '';
      return `\\textit{${esc(`${d.law_number}${article}${fek}${title}`)}}`;
    }
    case 'definition': {
      const term = esc(d.term ?? '');
      const def = richToLatex(d.definition ?? '');
      return `\\noindent\\textbf{\\textit{${term}:}} ${def}`;
    }
    case 'amendment': {
      const ref = esc(d.article_ref ?? '');
      const action = esc(d.action ?? 'αντικαθίσταται');
      const body = richToLatex(d.content ?? '');
      return `${ref} ${action} ως εξής:\n\n\\begin{quote}\n«${body}»\n\\end{quote}`;
    }
    case 'annex': {
      const titlePart = d.title?.trim() ? ` -- ${d.title.trim()}` : '';
      return `\\section*{${esc(`Παράρτημα ${d.number}${titlePart}`)}}${nestedLatex}`;
    }
    case 'transitional': {
      const titlePart = d.title?.trim() ? ` -- ${d.title.trim()}` : '';
      return `\\subsection*{${esc(`Μεταβατική Διάταξη ${d.number}${titlePart}`)}}${nestedLatex}`;
    }
    case 'pagebreak':
      return `\\clearpage`;
    case 'note':
      return `% [ΣΗΜΕΙΩΣΗ]: ${(d.content ?? '').replace(/\n/g, ' ')}`;
    default:
      return `% [${inst.templateId}]`;
  }
}

export function generateLatex(paper: HTMLElement, instances: Map<string, TemplateInstance>): string {
  const body = containerToLatex(paper, instances) || '% (κενό έγγραφο)';
  return [
    '\\documentclass[12pt,a4paper]{article}',
    '\\usepackage[utf8]{inputenc}',
    '\\usepackage[LGR,T1]{fontenc}',
    '\\usepackage[greek,english]{babel}',
    '\\usepackage{geometry}',
    '\\usepackage{setspace}',
    '\\geometry{a4paper,top=25mm,bottom=25mm,left=30mm,right=25mm}',
    '\\setstretch{1.5}',
    '',
    '\\begin{document}',
    '\\selectlanguage{greek}',
    '',
    body,
    '',
    '\\end{document}',
  ].join('\n');
}
