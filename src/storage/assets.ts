import { get, set, del, keys } from 'idb-keyval';
import { uid } from '../lib/id';

/**
 * Reference images live in IndexedDB as Blobs, NOT in localStorage.
 * A single phone photo as base64 is 2-6 MB; localStorage's ~5 MB quota would
 * be gone after one or two images and the whole project file would fail to save.
 */

const PREFIX = 'vsb.asset.';

const urlCache = new Map<string, string>();

export async function putAsset(file: Blob): Promise<string> {
  const id = uid('asset');
  await set(PREFIX + id, file);
  return id;
}

/**
 * Restores a blob under its ORIGINAL id. Import must use this: generating a
 * fresh id would leave every assetId in the imported project pointing at
 * nothing, and the images would silently vanish.
 */
export async function putAssetWithId(id: string, file: Blob): Promise<string> {
  await set(PREFIX + id, file);
  return id;
}

export async function getAssetUrl(id: string): Promise<string | null> {
  const cached = urlCache.get(id);
  if (cached) return cached;
  const blob = await get<Blob>(PREFIX + id);
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  urlCache.set(id, url);
  return url;
}

export async function getAssetDataUrl(id: string): Promise<string | null> {
  const blob = await get<Blob>(PREFIX + id);
  if (!blob) return null;
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(typeof r.result === 'string' ? r.result : null);
    r.onerror = () => resolve(null);
    r.readAsDataURL(blob);
  });
}

export async function deleteAsset(id: string): Promise<void> {
  const url = urlCache.get(id);
  if (url) {
    URL.revokeObjectURL(url);
    urlCache.delete(id);
  }
  await del(PREFIX + id);
}

export async function listAssetIds(): Promise<string[]> {
  const all = await keys();
  return all
    .filter((k): k is string => typeof k === 'string' && k.startsWith(PREFIX))
    .map((k) => k.slice(PREFIX.length));
}

/** Downscales large uploads before storage. Keeps IndexedDB and exports sane. */
export function downscaleImage(file: File, maxDim = 1600): Promise<Blob> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      if (scale === 1) {
        URL.revokeObjectURL(url);
        resolve(file);
        return;
      }
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (b) => {
          URL.revokeObjectURL(url);
          resolve(b ?? file);
        },
        'image/jpeg',
        0.86
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}
