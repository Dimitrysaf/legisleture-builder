import {
  listProjectsAsync,
  deleteProjectAsync,
  saveProjectAsync,
  renameProjectAsync,
  saveProjectToWorkspace,
} from '../utils/workspace';
import { newProject } from '../types/project';
import { isProjectFile, isSaveFile } from '../utils/fileOps';
import type { ProjectStub } from '../utils/workspace';

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('el-GR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

function openProject(id: string): void {
  window.location.href = `/editor?id=${encodeURIComponent(id)}`;
}

async function renderProjects(): Promise<void> {
  const list = document.getElementById('nb-projects-list');
  if (!list) return;

  const projects = await listProjectsAsync();

  if (projects.length === 0) {
    list.innerHTML = `
      <div class="text-center py-16 text-base-content/40">
        <svg class="mx-auto mb-4 w-12 h-12 opacity-30" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
        </svg>
        <p class="text-sm">Δεν υπάρχουν αποθηκευμένα έργα.<br>Δημιουργήστε ένα νέο για να ξεκινήσετε.</p>
      </div>`;
    return;
  }

  list.innerHTML = projects.map((p: ProjectStub) => `
    <div class="nb-project-card" data-project-id="${p.id}">
      <div class="nb-project-info">
        <div class="nb-project-name" data-project-name="${p.id}">${escHtml(p.name)}</div>
        <div class="nb-project-meta">Τροποποιήθηκε: ${formatDate(p.modifiedAt)}</div>
      </div>
      <div class="nb-project-actions">
        <button type="button" class="btn btn-sm btn-ghost nb-rename-btn" data-rename="${p.id}" title="Μετονομασία">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button type="button" class="btn btn-sm btn-ghost text-error nb-delete-btn" data-delete="${p.id}" title="Διαγραφή">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
        </button>
        <button type="button" class="btn btn-sm btn-primary nb-open-btn" data-open="${p.id}">Άνοιγμα</button>
      </div>
    </div>`).join('');

  list.querySelectorAll<HTMLButtonElement>('[data-open]').forEach(btn => {
    btn.addEventListener('click', () => openProject(btn.dataset.open!));
  });

  list.querySelectorAll<HTMLElement>('[data-project-name]').forEach(el => {
    el.addEventListener('dblclick', () => startRename(el.dataset.projectName!));
  });

  list.querySelectorAll<HTMLButtonElement>('[data-rename]').forEach(btn => {
    btn.addEventListener('click', () => startRename(btn.dataset.rename!));
  });

  list.querySelectorAll<HTMLButtonElement>('[data-delete]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.delete!;
      const card = btn.closest<HTMLElement>('[data-project-id]');
      const name = card?.querySelector<HTMLElement>('[data-project-name]')?.textContent ?? id;
      if (!confirm(`Διαγραφή έργου «${name}»;\n\nΗ ενέργεια είναι μόνιμη.`)) return;
      deleteProjectAsync(id).then(renderProjects);
    });
  });
}

function startRename(id: string): void {
  const nameEl = document.querySelector<HTMLElement>(`[data-project-name="${id}"]`);
  if (!nameEl) return;
  const current = nameEl.textContent ?? '';
  const input = document.createElement('input');
  input.type = 'text';
  input.value = current;
  input.className = 'input input-bordered input-sm w-full max-w-xs';

  const finish = () => {
    const newName = input.value.trim();
    if (newName && newName !== current) {
      renameProjectAsync(id, newName).then(renderProjects);
    } else {
      renderProjects();
    }
  };

  input.addEventListener('blur', finish);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') input.blur();
    if (e.key === 'Escape') { input.value = current; input.blur(); }
  });

  nameEl.replaceWith(input);
  input.focus();
  input.select();
}

function showNewProjectModal(): void {
  const existing = document.getElementById('nb-new-project-modal');
  if (existing) { (existing as HTMLDialogElement).showModal(); return; }

  const dlg = document.createElement('dialog');
  dlg.id = 'nb-new-project-modal';
  dlg.className = 'modal';
  dlg.innerHTML = `
    <div class="modal-box max-w-sm font-sans">
      <form method="dialog">
        <button class="btn btn-sm btn-circle btn-ghost absolute right-3 top-3">✕</button>
      </form>
      <h3 class="font-bold text-base mb-4">Νέο Έργο</h3>
      <div class="form-control gap-1 mb-4">
        <label class="label py-0"><span class="label-text text-sm">Τίτλος (προαιρετικό)</span></label>
        <input id="nb-new-name-input" type="text" class="input input-bordered input-sm"
          placeholder="π.χ. Νόμος 5000/2026" maxlength="120" autocomplete="off">
      </div>
      <div class="flex justify-end gap-2">
        <form method="dialog"><button class="btn btn-ghost btn-sm">Ακύρωση</button></form>
        <button id="nb-new-create-btn" type="button" class="btn btn-primary btn-sm">Δημιουργία</button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop"><button>close</button></form>`;
  document.body.appendChild(dlg);

  dlg.querySelector('#nb-new-create-btn')?.addEventListener('click', () => {
    const name = (dlg.querySelector<HTMLInputElement>('#nb-new-name-input')?.value ?? '').trim();
    const project = newProject(name);
    const pf = { version: 2 as const, app: 'legisleture-builder' as const, project };
    saveProjectAsync(pf).then(() => {
      dlg.close();
      openProject(project.id);
    });
  });

  dlg.querySelector<HTMLInputElement>('#nb-new-name-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') dlg.querySelector<HTMLButtonElement>('#nb-new-create-btn')?.click();
  });

  dlg.showModal();
  setTimeout(() => dlg.querySelector<HTMLInputElement>('#nb-new-name-input')?.focus(), 50);
}

function handleImport(file: File): void {
  file.text().then(text => {
    let parsed: unknown;
    try { parsed = JSON.parse(text); }
    catch {
      alert(`Το αρχείο «${file.name}» δεν είναι έγκυρο JSON.`);
      return;
    }

    if (isProjectFile(parsed)) {
      saveProjectAsync(parsed).then(() => openProject(parsed.project.id));
    } else if (isSaveFile(parsed)) {
      const project = newProject();
      project.blocks = parsed.blocks;
      if (parsed.savedAt) { project.createdAt = parsed.savedAt; project.modifiedAt = parsed.savedAt; }
      const pf = { version: 2 as const, app: 'legisleture-builder' as const, project };
      saveProjectAsync(pf).then(() => openProject(project.id));
    } else {
      alert(`Το αρχείο «${file.name}» δεν αναγνωρίστηκε ως αρχείο Legisleture Builder.`);
    }
  });
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Bootstrap ─────────────────────────────────────────────────────

document.getElementById('nb-new-project-btn')?.addEventListener('click', showNewProjectModal);

const importInput = document.getElementById('nb-import-input') as HTMLInputElement | null;
document.getElementById('nb-import-btn')?.addEventListener('click', () => importInput?.click());
importInput?.addEventListener('change', () => {
  const file = importInput.files?.[0];
  if (file) { handleImport(file); importInput.value = ''; }
});

renderProjects();
