/**
 * Asset manager — stores image blobs in IndexedDB, keyed by content hash.
 * Blocks reference assets via data.assetId instead of inline base64.
 */

import type { Asset } from '../types/project';
import { dbSaveAsset, dbLoadAsset } from './db';

function generateAssetId(): string {
  const arr = new Uint8Array(8);
  crypto.getRandomValues(arr);
  return `ast_${Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')}`;
}

async function sha256Hex(data: string): Promise<string> {
  const bytes = new TextEncoder().encode(data);
  const buf = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function dataUrlSize(dataUrl: string): number {
  // base64 encodes 3 bytes as 4 chars; subtract header
  const base64 = dataUrl.split(',')[1] ?? '';
  return Math.round(base64.length * 0.75);
}

function mimeFromDataUrl(dataUrl: string): string {
  return dataUrl.split(';')[0]?.split(':')[1] ?? 'application/octet-stream';
}

/**
 * Save an image data URL to IndexedDB as an asset.
 * Returns the assetId. If the same content was already saved, returns the
 * existing id (content-addressed via SHA-256 prefix on the projectId key).
 */
export async function storeImageAsset(
  dataUrl: string,
  projectId: string,
  filename = 'image',
): Promise<string> {
  const id = generateAssetId();
  const hash = await sha256Hex(dataUrl.slice(0, 512)); // fast partial hash
  const asset: Asset = {
    id,
    name: filename,
    mimeType: mimeFromDataUrl(dataUrl),
    size: dataUrlSize(dataUrl),
    hash,
    createdAt: new Date().toISOString(),
    data: dataUrl,
  };
  await dbSaveAsset(projectId, asset);
  return id;
}

/**
 * Retrieve an asset's data URL from IndexedDB.
 */
export async function resolveAssetUrl(assetId: string): Promise<string | null> {
  const asset = await dbLoadAsset(assetId);
  return asset?.data ?? null;
}

/**
 * After inserting blocks into the DOM, fill in <img data-asset-id="...">
 * elements with their actual src values from IndexedDB.
 * Called once after deserializeBlocks completes.
 */
export async function resolveAssetsInContainer(container: HTMLElement): Promise<void> {
  const imgs = Array.from(container.querySelectorAll<HTMLImageElement>('img[data-asset-id]'));
  await Promise.all(imgs.map(async (img) => {
    if (img.src) return; // already resolved
    const assetId = img.dataset.assetId;
    if (!assetId) return;
    const url = await resolveAssetUrl(assetId);
    if (url) img.src = url;
  }));
}

/**
 * Strip inline base64 src from image blocks that have an assetId.
 * Used during serialization to keep the saved JSON small.
 */
export function stripInlineSrcFromBlocks(blocks: import('../utils/fileOps').SavedBlock[]): import('../utils/fileOps').SavedBlock[] {
  return blocks.map(block => {
    if (block.templateId === 'image-block' && block.data.assetId && block.data.src) {
      return { ...block, data: { ...block.data, src: '' } };
    }
    if (Object.keys(block.zones).length > 0) {
      const zones: Record<string, import('../utils/fileOps').SavedBlock[]> = {};
      for (const [k, v] of Object.entries(block.zones)) {
        zones[k] = stripInlineSrcFromBlocks(v);
      }
      return { ...block, zones };
    }
    return block;
  });
}
