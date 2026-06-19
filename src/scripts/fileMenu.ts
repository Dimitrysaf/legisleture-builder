import { state } from './state';
import { showSaveStatus } from './toast';
import { showAlert } from './dialogs';
import { loadFromSaveFile } from './blocks';
import { serializeDocument, exportHtml, exportFekHtml, buildDocHtml, exportTxt, downloadBlob, isSaveFile } from '../utils/fileOps';
import { generateLatex } from '../utils/latex';
import { EMPTY_META, hasFekMeta } from '../utils/fekMeta';
import { parseLaTeX } from '../utils/latexImport';
import { exportAkomaNtoso } from '../utils/export/akoma';

function saveAsJson(): void {
  const data = serializeDocument(state.paper, state.instances);
  downloadBlob(JSON.stringify(data, null, 2), 'nomos.json', 'application/json');
}

function exportHtmlFile(): void {
  downloadBlob(exportHtml(state.paper), 'nomos.html', 'text/html');
}

async function exportFekHtmlFile(): Promise<void> {
  const meta = state.currentProject?.fekMeta ?? { ...EMPTY_META };
  const html = await exportFekHtml(state.paper, meta);
  downloadBlob(html, 'nomos-fek.html', 'text/html');
}

function exportLatexFile(): void {
  downloadBlob(generateLatex(state.paper, state.instances), 'nomos.tex', 'text/plain');
}

function exportTxtFile(): void {
  downloadBlob(exportTxt(state.paper), 'nomos.txt', 'text/plain');
}

function exportAkomaFile(): void {
  const save = serializeDocument(state.paper, state.instances);
  const meta = state.currentProject?.fekMeta ?? { ...EMPTY_META };
  const xml  = exportAkomaNtoso(save.blocks, {
    number:    meta.number,
    date:      meta.date,
    subject:   meta.subject,
    fekSeries: meta.fekSeries,
    fekNumber: meta.fekNumber,
    fekDate:   meta.fekDate,
  });
  downloadBlob(xml, 'nomos-akoma.xml', 'application/xml');
  showSaveStatus('Εξαγωγή Akoma Ntoso XML');
}

function printDocument(): void {
  const meta = state.currentProject?.fekMeta ?? { ...EMPTY_META };
  const html = buildDocHtml(state.paper, hasFekMeta(meta) ? meta : null);
  const popup = window.open('', '_blank');
  if (!popup) {
    showAlert(
      'Ο browser απέκλεισε το παράθυρο εκτύπωσης.\nΠαρακαλώ επιτρέψτε τα popups για αυτή τη σελίδα και ξαναπροσπαθήστε.',
      'Αποκλεισμένο Popup',
    );
    return;
  }
  popup.document.open();
  popup.document.write(html);
  popup.document.close();
  setTimeout(() => { popup.focus(); popup.print(); }, 600);
}

export function initFileMenu(): void {
  const importBtn = document.getElementById('nb-import-btn');
  const importInput = document.getElementById('nb-import-input') as HTMLInputElement | null;
  const trigger = document.getElementById('nb-export-trigger');
  const menu = document.getElementById('nb-file-menu');

  importBtn?.addEventListener('click', () => importInput?.click());

  importInput?.addEventListener('change', async () => {
    const file = importInput!.files?.[0];
    if (!file) return;

    let text: string;
    try {
      text = await file.text();
    } catch {
      showAlert('Αδύνατη η ανάγνωση του αρχείου από τον browser.', 'Σφάλμα Ανάγνωσης');
      importInput!.value = '';
      return;
    }

    const isTeX = /\.(tex|latex)$/i.test(file.name);

    if (isTeX) {
      try {
        const saveFile = parseLaTeX(text);
        if (saveFile.blocks.length === 0) {
          showAlert(
            `Το αρχείο «${file.name}» δεν περιείχε αναγνωρίσιμα blocks.\n\nΒεβαιωθείτε ότι εξήχθη από αυτή την εφαρμογή.`,
            'Κενό αρχείο',
          );
          importInput!.value = '';
          return;
        }
        loadFromSaveFile(saveFile);
        showSaveStatus('Φορτώθηκε από LaTeX');
      } catch (err) {
        console.error('[import tex]', err);
        showAlert('Σφάλμα κατά την ανάλυση του .tex αρχείου.', 'Σφάλμα Εισαγωγής');
      }
    } else {
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        showAlert(
          `Το αρχείο «${file.name}» δεν αναγνωρίστηκε.\n\nΗ Εισαγωγή δέχεται:\n• Αρχεία .json  (από «Αποθήκευση ως JSON»)\n• Αρχεία .tex   (LaTeX εξαγωγή από αυτή την εφαρμογή)`,
          'Μη έγκυρο αρχείο',
        );
        importInput!.value = '';
        return;
      }

      if (!isSaveFile(parsed)) {
        showAlert(
          `Το αρχείο «${file.name}» δεν είναι έγκυρο αρχείο αποθήκευσης.\n\nΒεβαιωθείτε ότι επιλέξατε αρχείο .json που εξήχθη από «Αποθήκευση ως JSON».`,
          'Μη έγκυρο αρχείο',
        );
        importInput!.value = '';
        return;
      }

      try {
        loadFromSaveFile(parsed);
        showSaveStatus('Φορτώθηκε επιτυχώς');
      } catch (err) {
        console.error('[import json]', err);
        showAlert('Σφάλμα κατά την ανακατασκευή του εγγράφου.', 'Σφάλμα Εισαγωγής');
      }
    }

    importInput!.value = '';
  });

  trigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    menu?.toggleAttribute('hidden');
  });

  document.addEventListener('click', () => menu?.setAttribute('hidden', ''));
  menu?.addEventListener('click', (e) => e.stopPropagation());

  menu?.querySelectorAll<HTMLButtonElement>('[data-file-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      menu!.setAttribute('hidden', '');
      switch (btn.dataset.fileAction) {
        case 'save-json':       saveAsJson(); break;
        case 'export-html':     exportHtmlFile(); break;
        case 'export-fek-html': exportFekHtmlFile(); break;
        case 'export-latex':    exportLatexFile(); break;
        case 'export-akoma':    exportAkomaFile(); break;
        case 'export-txt':      exportTxtFile(); break;
        case 'export-pdf':      printDocument(); break;
      }
    });
  });
}
