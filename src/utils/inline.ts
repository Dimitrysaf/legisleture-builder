export function toInline(html: string): string {
  return html
    .replace(/<div><br\s*\/?><\/div>/gi, '<br>')
    .replace(/<\/div>\s*<div>/gi, '<br>')
    .replace(/<div[^>]*>/gi, '')
    .replace(/<\/div>/gi, '')
    .replace(/<\/p>\s*<p[^>]*>/gi, '<br>')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<\/p>/gi, '')
    .trim();
}
