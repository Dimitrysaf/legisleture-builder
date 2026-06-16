import {
  createIcons,
  BookOpen, Layers, AlignLeft, Scroll, Scale, MessageSquare,
  Pencil, Trash2, Plus, PlusCircle, X, Eye, Menu,
  FileText, Bookmark, List, ListOrdered, Link2, Calendar,
  Building2, Gavel, Shield, ClipboardList, FilePlus, Tag,
  Quote, Type, Save, Info,
  ArrowUp, ArrowDown,
} from 'lucide';

const ICONS = {
  BookOpen, Layers, AlignLeft, Scroll, Scale, MessageSquare,
  Pencil, Trash2, Plus, PlusCircle, X, Eye, Menu,
  FileText, Bookmark, List, ListOrdered, Link2, Calendar,
  Building2, Gavel, Shield, ClipboardList, FilePlus, Tag,
  Quote, Type, Save, Info,
  ArrowUp, ArrowDown,
};

export function refreshIcons(): void {
  createIcons({ icons: ICONS, attrs: { 'stroke-width': '1.5' } });
}

/** Returns an <i data-lucide> placeholder for use in HTML strings */
export function icon(name: string, cls = 'w-4 h-4'): string {
  return `<i data-lucide="${name}" class="${cls}" aria-hidden="true"></i>`;
}

/** All icons available for custom template icon picker */
export const ICON_OPTIONS: { name: string; label: string }[] = [
  { name: 'book-open',     label: 'Άρθρο' },
  { name: 'layers',        label: 'Κεφάλαιο' },
  { name: 'align-left',    label: 'Παράγραφος' },
  { name: 'scroll',        label: 'Προοίμιο' },
  { name: 'scale',         label: 'Παραπομπή' },
  { name: 'message-square',label: 'Σχόλιο' },
  { name: 'file-text',     label: 'Έγγραφο' },
  { name: 'bookmark',      label: 'Σελιδοδείκτης' },
  { name: 'list',          label: 'Λίστα' },
  { name: 'list-ordered',  label: 'Αριθμημένη λίστα' },
  { name: 'link-2',        label: 'Σύνδεσμος' },
  { name: 'calendar',      label: 'Ημερομηνία' },
  { name: 'building-2',    label: 'Οργανισμός' },
  { name: 'gavel',         label: 'Δικαστήριο' },
  { name: 'shield',        label: 'Προστασία' },
  { name: 'clipboard-list',label: 'Λίστα ελέγχου' },
  { name: 'file-plus',     label: 'Νέο αρχείο' },
  { name: 'tag',           label: 'Ετικέτα' },
  { name: 'quote',         label: 'Παράθεση' },
  { name: 'type',          label: 'Κείμενο' },
  { name: 'info',          label: 'Πληροφορία' },
];
