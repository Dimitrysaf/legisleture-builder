import type { ProjectFile } from '../types/project';
import { dbListAssets, dbSaveAsset } from './db';
import { isProjectFile } from './fileOps';

type FileSystemDirectoryHandle = {
  getFileHandle(name: string, opts?: { create?: boolean }): Promise<FileSystemFileHandle>;
  getDirectoryHandle(name: string, opts?: { create?: boolean }): Promise<FileSystemDirectoryHandle>;
  entries(): AsyncIterable<[string, FileSystemHandle]>;
};

type FileSystemFileHandle = {
  getFile(): Promise<File>;
  createWritable(): Promise<FileSystemWritableFileStream>;
};

type FileSystemWritableFileStream = {
  write(data: Blob | string): Promise<void>;
  close(): Promise<void>;
};

type FileSystemHandle = { kind: 'file' | 'directory'; name: string } & (FileSystemFileHandle | FileSystemDirectoryHandle);

declare global {
  interface Window {
    showDirectoryPicker(opts?: { mode?: string; startIn?: string; suggestedName?: string }): Promise<FileSystemDirectoryHandle>;
  }
}

function mimeToExt(mime: string): string {
  const map: Record<string, string> = {
    'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif',
    'image/webp': 'webp', 'image/svg+xml': 'svg',
  };
  return map[mime] ?? 'bin';
}

function base64DataToBlob(dataUrl: string, mime: string): Blob {
  const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
  const bytes = atob(base64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function isFolderPackageSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function';
}

export async function saveAsPackage(pf: ProjectFile): Promise<void> {
  const dirHandle = await window.showDirectoryPicker({
    mode: 'readwrite',
    startIn: 'documents',
  });

  // project.json — strip inline base64 asset data (assets saved separately)
  const projectJson: ProjectFile = {
    ...pf,
    project: { ...pf.project, assets: [] },
  };

  const pjHandle = await dirHandle.getFileHandle('project.json', { create: true });
  const pjWritable = await pjHandle.createWritable();
  await pjWritable.write(JSON.stringify(projectJson, null, 2));
  await pjWritable.close();

  const assets = await dbListAssets(pf.project.id);
  if (assets.length > 0) {
    const assetsDir = await dirHandle.getDirectoryHandle('assets', { create: true });
    for (const asset of assets) {
      if (!asset.data) continue;
      const ext = mimeToExt(asset.mimeType);
      const assetHandle = await assetsDir.getFileHandle(`${asset.id}.${ext}`, { create: true });
      const writable = await assetHandle.createWritable();
      await writable.write(base64DataToBlob(asset.data, asset.mimeType));
      await writable.close();
    }
  }
}

export async function loadFromPackage(): Promise<ProjectFile> {
  const dirHandle = await window.showDirectoryPicker({ mode: 'read' });

  const pjHandle = await dirHandle.getFileHandle('project.json');
  const pjFile = await pjHandle.getFile();
  const text = await pjFile.text();
  const pf = JSON.parse(text) as unknown;

  if (!isProjectFile(pf)) throw new Error('Μη έγκυρο αρχείο project.json');

  try {
    const assetsDir = await dirHandle.getDirectoryHandle('assets');
    for await (const [name, handle] of (assetsDir as FileSystemDirectoryHandle).entries()) {
      if ((handle as FileSystemHandle).kind !== 'file') continue;
      const file = await (handle as FileSystemFileHandle).getFile();
      const data = await fileToBase64(file);
      const id = (name as string).replace(/\.[^.]+$/, '');
      await dbSaveAsset(pf.project.id, {
        id,
        name: name as string,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        hash: '',
        createdAt: new Date().toISOString(),
        data,
      });
    }
  } catch {
    // No assets/ directory — acceptable
  }

  return pf;
}
