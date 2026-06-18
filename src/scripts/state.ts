import type { TemplateInstance } from '../templates/types';
import type { Project } from '../types/project';

export type AppMode = 'edit' | 'preview' | 'code';

export const state = {
  paper: null as unknown as HTMLElement,
  instances: new Map<string, TemplateInstance>(),
  activeModes: ['edit'] as AppMode[],
  currentMode: 'edit' as AppMode,
  docVersion: 0,
  lastPreviewVersion: -1,
  autoSaveTimer: null as ReturnType<typeof setTimeout> | null,
  toastEl: null as HTMLElement | null,
  dragSrc: null as HTMLElement | null,
  pendingDrop: null as { before: HTMLElement | null; parent: HTMLElement } | null,
  currentProject: null as Project | null,
};
