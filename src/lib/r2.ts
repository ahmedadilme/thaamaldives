/* ------------------------------------------------------------------------ */
/*  mvcdn R2 client — browser-safe media helpers (World 2, tiny signer)      */
/* ------------------------------------------------------------------------ */
/**
 * Architecture (user-confirmed):
 *   · mvcdn is an S3-protocol storage service. No Worker, no infra to deploy.
 *   · Bucket is PUBLIC → served via the universal path-style URL:
 *         https://{R2_PUBLIC_URL}/s3/{R2_BUCKET}/{key}
 *   · Uploads: the browser never sees credentials. A tiny signer (dev: Vite
 *     dev-middleware; prod: the in-repo nextjs-uploader) mints a presigned
 *     PUT, the browser PUTs the optimized bytes directly to mvcdn, and we
 *     store the resulting PUBLIC URL in the CMS field.
 *   · The SPA cannot optimize H.264 (no ffmpeg.wasm — rejected). Videos are
 *     "upload web-ready": export web-ready H.264 MP4, upload as-is; only a
 *     size guard runs client-side. /src/assets/hero stays as the fallback
 *     bundle when no video is uploaded via /admin.
 *   · Images ARE optimized in-browser (canvas → WebP) by design.
 *
 * Environment (all public, client-safe). Secrets NEVER go in the bundle:
 *   VITE_R2_PUBLIC_URL  public host, no scheme assumption (e.g. `cdn.example.com`)
 *   VITE_R2_BUCKET      bucket name (public identifier)
 *   VITE_R2_SIGNER_URL  signer base; leave EMPTY in dev — the dev signer is
 *                       same-origin at /api/presign-put. Set it in production
 *                       to the deployed nextjs-uploader origin.
 */

export interface R2Upload {
  uploadUrl: string; // presigned PUT — valid a few minutes
  publicUrl: string; // permanent public URL to persist in the CMS
  key: string;
}

export interface UploadResult {
  ok: boolean;
  publicUrl?: string;
  error?: string;
}

const env = (name: string): string => {
  const v = ((import.meta.env as Record<string, string | undefined>)[name] ?? '').trim();
  return v.replace(/\/+$/, '');
};

const R2_PUBLIC_URL = () => env('VITE_R2_PUBLIC_URL');
const R2_BUCKET = () => env('VITE_R2_BUCKET');
const SIGNER = () => env('VITE_R2_SIGNER_URL');

/** Strip any scheme and trailing slashes so the host can be reused either way. */
const host = (v: string): string => v.replace(/^https?:\/\//i, '').replace(/\/+$/, '');

let lastError: string | null = null;

/** Reason the most recent upload attempt failed, for surfacing in /admin. */
export const lastUploadError = (): string | null => lastError;

/** Sanitize a filename/key for safe path usage. */
export const sanitizeKey = (name: string): string =>
  String(name || 'asset')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/^\.+/, '')
    .slice(0, 160);

/**
 * Path-style universal public URL for a key.
 * Returns '' when the bucket is unconfigured — never a fabricated URL, so a
 * misconfigured deploy cannot write a bogus string into a CMS media field.
 */
export function publicUrl(key: string): string {
  const base = R2_PUBLIC_URL();
  const bucket = R2_BUCKET();
  if (!base || !bucket) return '';
  return `https://${host(base)}/s3/${bucket}/${sanitizeKey(key)}`;
}

/**
 * Human-readable reason the media pipeline is unusable, or null when configured.
 * Surfaced in /admin so misconfiguration is visible instead of silently failing.
 */
export function r2ConfigError(): string | null {
  const missing: string[] = [];
  if (!R2_PUBLIC_URL()) missing.push('VITE_R2_PUBLIC_URL');
  if (!R2_BUCKET()) missing.push('VITE_R2_BUCKET');
  if (!SIGNER() && !import.meta.env.DEV) missing.push('VITE_R2_SIGNER_URL');
  return missing.length ? `Storage is not configured — set ${missing.join(', ')}` : null;
}

/** Pull a human-readable message out of a non-OK signer response. */
async function errorFrom(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: unknown };
    if (typeof body.error === 'string' && body.error) return body.error;
  } catch {
    /* non-JSON error body */
  }
  return `Signer responded ${res.status}`;
}

/** Ask the signer to mint a presigned PUT for the given key+type. */
export async function requestUploadUrl(key: string, contentType: string): Promise<R2Upload | null> {
  const signer = SIGNER();
  lastError = null;
  // An empty signer base means same-origin, which is exactly where the dev
  // signer is mounted. In production r2ConfigError() flags the missing var.
  try {
    const res = await fetch(`${signer}/api/presign-put`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, contentType }),
    });
    if (!res.ok) {
      lastError = await errorFrom(res);
      return null;
    }
    return (await res.json()) as R2Upload;
  } catch {
    lastError = signer
      ? `Could not reach the signer at ${signer}`
      : 'Could not reach /api/presign-put on this origin';
    return null;
  }
}

/** PUT bytes straight to mvcdn via the presigned URL. No secrets here. */
export async function putUpload(upload: R2Upload, blob: Blob): Promise<boolean> {
  try {
    const res = await fetch(upload.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': blob.type || 'application/octet-stream' },
      body: blob,
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Optimize an image in-browser (WebP, max dimension) and upload.
 * Returns the public URL to store in the CMS, or null on failure.
 */
export async function optimizeAndUploadImage(file: File, maxDim = 1800): Promise<string | null> {
  const webp = await toWebP(file, maxDim);
  const type = webp ? 'image/webp' : file.type || 'application/octet-stream';
  const key = `${Date.now()}-${sanitizeKey(file.name.replace(/\.[^.]+$/, ''))}.${webp ? 'webp' : extOf(file)}`;
  const upload = await requestUploadUrl(key, type);
  if (!upload) return null;
  const body = webp ?? file;
  if (!(await putUpload(upload, body))) return null;
  return upload.publicUrl;
}

/** Upload a video as-is (web-ready export); only a size guard runs browser-side. */
export async function uploadVideoAsIs(file: File): Promise<string | null> {
  const type = file.type || 'video/mp4';
  const key = `${Date.now()}-${sanitizeKey(file.name.replace(/\.[^.]+$/, ''))}.${extOf(file)}`;
  const upload = await requestUploadUrl(key, type);
  if (!upload) return null;
  if (!(await putUpload(upload, file))) return null;
  return upload.publicUrl;
}

/** Human-readable byte size for the queue cards. */
export const formatSize = (bytes: number): string =>
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` :
  bytes >= 1024 ? `${(bytes / 1024).toFixed(0)} KB` :
  `${bytes} B`;

/** Browser-side WebP re-encode (canvas). Returns null if unsupported/huge. */
export async function toWebP(file: File, maxDim = 1800): Promise<Blob | null> {
  const isRaster = /^image\/(jpeg|png|webp|bmp|gif)$/i.test(file.type) || /\.(jpe?g|png|gif|webp)$/i.test(file.name);
  if (!isRaster) return null;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bmp.width, bmp.height, 1));
    const w = Math.max(1, Math.round(bmp.width * scale));
    const h = Math.max(1, Math.round(bmp.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close();
    return await new Promise<Blob | null>((resolve) => {
      try {
        canvas.toBlob((b) => resolve(b), 'image/webp', 0.82);
      } catch {
        resolve(null);
      }
    });
  } catch {
    return null;
  }
}

function extOf(file: File): string {
  const m = /\.([a-zA-Z0-9]+)$/.exec(file.name);
  return m ? m[1].toLowerCase() : 'bin';
}
