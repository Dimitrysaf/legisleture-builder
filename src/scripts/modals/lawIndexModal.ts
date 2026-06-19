/**
 * Cross-document law index modal.
 * Features:
 *   - Browse imported law indexes
 *   - Export current document's index
 *   - Import a law index JSON from file
 *   - Delete stored indexes
 */

import { state } from '../state';
import { showSaveStatus } from '../toast';
import { serializeDocument, downloadBlob } from '../../utils/fileOps';
import { loadFekMeta } from '../../utils/fekMeta';
import { buildLawIndex, serializeLawIndex, parseLawIndex } from '../../utils/export/lawIndex';
import { dbSaveLawIndex, dbListLawIndexes, dbDeleteLawIndex } from '../../utils/db';
import type { LawIndex } from '../../utils/db';

function formatDate(iso?: string): string {
  if (!iso) return '';
  try { return new Date(iso).toLocaleDateString('el-GR'); } catch { return iso; }
}

async function renderIndexList(container: HTMLElement): Promise<void> {
  const indexes = await dbListLawIndexes();
  if (indexes.length === 0) {
    container.innerHTML = '<p class="text-sm text-base-content/50 text-center py-4">Δεν υπάρχουν εισαγμένοι νόμοι.</p>';
    return;
  }

  container.innerHTML = indexes.map(idx => `
    <div class="nb-lidx-row" data-idx-id="${idx.id}">
      <div class="nb-lidx-info">
        <span class="nb-lidx-law">${escHtml(idx.lawId)}</span>
        ${idx.subject ? `<span class="nb-lidx-subject">${escHtml(idx.subject)}</span>` : ''}
        <span class="nb-lidx-meta">${idx.articles.length} άρθρα${idx.fekRef ? ' · ' + escHtml(idx.fekRef) : ''}${idx.date ? ' · ' + formatDate(idx.date) : ''}</span>
      </div>
      <button type="button" class="btn btn-xs btn-ghost text-error nb-lidx-del" data-idx-del="${escHtml(idx.id)}" title="Διαγραφή">✕</button>
    </div>`).join('');

  container.querySelectorAll<HTMLButtonElement>('.nb-lidx-del').forEach(btn => {
    btn.addEventListener('click', async () => {
      await dbDeleteLawIndex(btn.dataset.idxDel!);
      renderIndexList(container);
    });
  });
}

export function initLawIndexModal(): void {
  const btn = document.getElementById('nb-law-index-btn');
  if (!btn) return;

  let modal: HTMLDialogElement | null = null;

  btn.addEventListener('click', openModal);

  function openModal() {
    if (!modal) {
      modal = document.createElement('dialog');
      modal.className = 'modal';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="modal-box w-11/12 max-w-lg font-sans">
        <form method="dialog">
          <button class="btn btn-sm btn-circle btn-ghost absolute right-3 top-3">✕</button>
        </form>
        <h3 class="font-bold text-base mb-1">Ευρετήριο Νόμων</h3>
        <p class="text-xs text-base-content/50 mb-4">Εξαγωγή, εισαγωγή και περιήγηση σε ευρετήρια νόμων για cross-document αναφορές.</p>

        <div class="flex gap-2 mb-4">
          <button type="button" id="nb-lidx-export-btn" class="btn btn-sm btn-outline flex-1">
            Εξαγωγή τρέχοντος ευρετηρίου
          </button>
          <label class="btn btn-sm btn-outline flex-1 cursor-pointer">
            Εισαγωγή νόμου…
            <input type="file" accept=".json" id="nb-lidx-import-file" class="sr-only">
          </label>
        </div>

        <div class="text-[10px] font-bold uppercase tracking-widest text-base-content/40 mb-2">Αποθηκευμένοι νόμοι</div>
        <div id="nb-lidx-list" class="flex flex-col gap-1 max-h-60 overflow-y-auto"></div>

        <div class="modal-action mt-4">
          <form method="dialog"><button class="btn btn-ghost btn-sm">Κλείσιμο</button></form>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button>close</button></form>`;

    const listEl = modal.querySelector<HTMLElement>('#nb-lidx-list')!;
    renderIndexList(listEl);

    modal.querySelector('#nb-lidx-export-btn')?.addEventListener('click', () => {
      const save = serializeDocument(state.paper, state.instances);
      const meta = loadFekMeta();
      const idx  = buildLawIndex(save.blocks, {
        number:    meta.number,
        subject:   meta.subject,
        date:      meta.date,
        fekSeries: meta.fekSeries,
        fekNumber: meta.fekNumber,
        fekDate:   meta.fekDate,
      });
      const filename = `${(meta.number || 'nomos').replace(/[/\\]/g, '-')}-index.json`;
      downloadBlob(serializeLawIndex(idx), filename, 'application/json');
      showSaveStatus('Εξαγωγή ευρετηρίου');
    });

    const fileInput = modal.querySelector<HTMLInputElement>('#nb-lidx-import-file')!;
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const raw  = JSON.parse(text);
        const idx  = parseLawIndex(raw);
        if (!idx) {
          alert('Δεν αναγνωρίστηκε ως έγκυρο ευρετήριο νόμου.');
          return;
        }
        // Give it a stable ID based on lawId to avoid duplicates
        idx.id = 'law_' + idx.lawId.replace(/[^a-zA-Z0-9]/g, '_');
        await dbSaveLawIndex(idx);
        showSaveStatus(`Εισαγωγή: ${idx.lawId}`);
        renderIndexList(listEl);
      } catch {
        alert('Σφάλμα ανάγνωσης αρχείου ευρετηρίου.');
      }
      fileInput.value = '';
    });

    modal.showModal();
  }
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Public API: browse known law IDs ─────────────────────────────────

export async function getKnownLawIds(): Promise<string[]> {
  const indexes = await dbListLawIndexes();
  return indexes.map(i => i.lawId);
}

export async function getArticlesForLaw(lawId: string): Promise<LawIndex['articles']> {
  const indexes = await dbListLawIndexes();
  const found = indexes.find(i => i.lawId === lawId);
  return found?.articles ?? [];
}
