import type { FekMeta } from '../utils/fekMeta';
import type { SavedBlock } from '../utils/fileOps';

export interface Asset {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  hash: string;
  createdAt: string;
  data: string; // base64 data URL — Phase 1: μεταφέρεται σε IndexedDB ως binary blob
}

export interface ProjectVersion {
  id: string;
  savedAt: string;
  comment?: string;
  blocks: SavedBlock[];
}

export interface Project {
  id: string;
  name: string;
  fekMeta: FekMeta;
  createdAt: string;
  modifiedAt: string;
  blocks: SavedBlock[];
  assets: Asset[];
  versions: ProjectVersion[];
}

export interface ProjectFile {
  version: 2;
  app: 'legisleture-builder';
  project: Project;
}

export function isProjectFile(obj: unknown): obj is ProjectFile {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    (obj as ProjectFile).version === 2 &&
    (obj as ProjectFile).app === 'legisleture-builder' &&
    typeof (obj as ProjectFile).project === 'object' &&
    (obj as ProjectFile).project !== null
  );
}

export function generateProjectId(): string {
  const arr = new Uint8Array(6);
  crypto.getRandomValues(arr);
  return `proj_${Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')}`;
}

export function defaultProjectName(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `fek_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
}

export function newProject(name = ''): Project {
  const now = new Date().toISOString();
  return {
    id: generateProjectId(),
    name: name || defaultProjectName(),
    fekMeta: { teuchos: '', arithmos: '', hmeromhnia: '', titlos: '', twoColumn: false },
    createdAt: now,
    modifiedAt: now,
    blocks: [],
    assets: [],
    versions: [],
  };
}
