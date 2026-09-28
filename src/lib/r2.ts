/* ------------------------------------------------------------------------ */
/*  mvcdn R2 client — browser-safe media helpers (World 2, uploader)         */
/* ------------------------------------------------------------------------ */
/**
 * Architecture (matched to the oceantune-web upload implementation):
 *   · mvcdn is an S3-protocol storage service. No Worker, no infra to deploy.
 *   · Bucket is PUBLIC → served via the universal path-style URL:
 *         https://{R2_ENDPOINT}/{R2_BUCKET}/{key}     (e.g. …/s3/buket/media/…)
 *   · Uploads go through a tiny uploader server (dev: Vite dev-middleware;
 *     prod: the in-repo nextjs-uploader) at POST /api/upload
 *     multipart/form-data with a `file` field. The server PUTs the bytes to
 *     the bucket (no browser→bucket CORS preflight, no presigned URL to go
 *     stale), generates the key (`media/{ts}-{rand}.{ext}`), indexes the file,
 *     and returns { key, url, name } — the SPA stores the `url`.
 *   · The media library (GET/DELETE /api/media) lists and deletes those
 *     indexed files; prod persists the index in Postgres, dev keeps it in
 *     memory (resets on restart). A direct browser→bucket PUT was abandoned:
 *     a cross-origin PUT always preflights, and mvcdn's OPTIONS handler
 *     rejects buckets that carry no explicit CORS rules.
 *
 * Environment (all public, client-safe). Secrets NEVER go in the bundle:
 *   VITE_R2_PUBLIC_URL  public host, no scheme assumption (e.g. `cdn.mvcdn.cc`)
 *   VITE_R2_BUCKET      bucket name (public identifier)
 *   VITE_R2_SIGNER_URL  uploader base; leave EMPTY in dev — the dev uploader
 *                       is same-origin at /api/upload. Set it in production
 *                       to the deployed nextjs-uploader origin.
 */

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

/** Sanitize a filename for safe path usage (used only as the upload part name). */
export const sanitizeKey = (name: string): string =>
  String(name || 'asset')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/^\.+/, '')
    .slice(0, 160);

/**
 * Path-style universal public URL for a key.
 * Returns '' when the bucket is unconfigured — never a fabricated URL, so a
 * misconfigured deploy cannot write a bogus string into a CMS media field.
 * Only a fallback: the uploader's response carries the authoritative url.
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

/** Pull a human-readable message out of a non-OK /api/upload response. */
async function errorFrom(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: unknown };
    if (typeof body.error === 'string' && body.error) return body.error;
  } catch {
    /* non-JSON error body */
  }
  return `Uploader responded ${res.status}`;
}

/** Result of a successful server-side upload: the permanent public URL + object key. */
export interface UploadResult {
  url: string;
  key: string;
}

/**
 * Send the bytes to the uploader server, which PUTs them to the bucket
 * server-side (no browser→bucket CORS preflight, nothing to go stale) and
 * returns the public URL. Same-origin in dev (Vite dev-middleware);
 * cross-origin in production (the deployed nextjs-uploader answers the
 * preflight). Returns the upload result, or null (lastUploadError() explains
 * why).
 */
async function uploadViaSigner(filename: string, blob: Blob): Promise<UploadResult | null> {
  const signer = SIGNER();
  lastError = null;
  // An empty signer base means same-origin, which is exactly where the dev
  // uploader is mounted. In production r2ConfigError() flags the missing var.
  try {
    const form = new FormData();
    // The uploader generates the object key (`media/{ts}-{rand}.{ext}`) and
    // only borrows the extension from this filename — hand it a real one
    // (webp for re-encoded images).
    form.append('file', blob, filename);
    const res = await fetch(`${signer}/api/upload`, { method: 'POST', body: form });
    if (!res.ok) {
      lastError = await errorFrom(res);
      return null;
    }
    const data = (await res.json()) as { url?: string; key?: string };
    // Prefer the authoritative url from the uploader; fall back to building it
    // from the key for older/fallback uploaders that only return the key.
    const url = data.url || publicUrl(data.key ?? '');
    if (!url) {
      lastError = 'Storage is not configured — set VITE_R2_PUBLIC_URL and VITE_R2_BUCKET';
      return null;
    }
    return { url, key: data.key ?? '' };
  } catch {
    lastError = signer
      ? `Could not reach the uploader at ${signer}`
      : 'Could not reach /api/upload on this origin';
    return null;
  }
}

/**
 * Upload the bytes through the uploader server (the server PUTs to the bucket).
 * `name` is only an extension hint for the server-generated key. Returns the
 * permanent public URL, or null (lastUploadError() explains why).
 */
export async function uploadAndRetry(name: string, _contentType: string, blob: Blob): Promise<string | null> {
  return (await uploadViaSigner(name, blob))?.url ?? null;
}

/** Upload like `uploadAndRetry` but return { url, key } for library inserts. */
export async function uploadForLibrary(name: string, contentType: string, blob: Blob): Promise<UploadResult | null> {
  return uploadViaSigner(name, blob);
}

/** A single media-library entry (POST /api/upload results, GET /api/media). */
export interface MediaItem {
  key: string;
  url: string;
  name: string;
  createdAt: string;
}

/** Fetch the media library, newest first. Returns null if the library is unreachable. */
export async function fetchMediaList(): Promise<MediaItem[] | null> {
  try {
    const signer = SIGNER();
    const res = await fetch(`${signer}/api/media`, { method: 'GET' });
    if (!res.ok) return null;
    return (await res.json()) as MediaItem[];
  } catch {
    return null;
  }
}

/** Delete an item from the media library (object + index row). */
export async function deleteMedia(key: string): Promise<boolean> {
  try {
    const signer = SIGNER();
    const res = await fetch(`${signer}/api/media`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
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
  const name = `${Date.now()}-${sanitizeKey(file.name.replace(/\.[^.]+$/, ''))}.${webp ? 'webp' : extOf(file)}`;
  const body = webp ?? file;
  return uploadAndRetry(name, type, body);
}

/** Upload a video as-is (web-ready export); only a size guard runs browser-side. */
export async function uploadVideoAsIs(file: File): Promise<string | null> {
  const type = file.type || 'video/mp4';
  const name = `${Date.now()}-${sanitizeKey(file.name.replace(/\.[^.]+$/, ''))}.${extOf(file)}`;
  return uploadAndRetry(name, type, file);
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