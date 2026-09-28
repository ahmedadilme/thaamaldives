import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, Copy, FileUp, FilmIcon, ImagePlus, Link2, Trash2, Upload } from 'lucide-react';
import { cx } from '@/components/ui';
import {
  uploadForLibrary,
  sanitizeKey,
  toWebP,
  r2ConfigError,
  lastUploadError,
  fetchMediaList,
  deleteMedia,
  type MediaItem,
} from '@/lib/r2';

/* ------------------------------------------------------------------------ */
/*  MediaTab — World 2 uploader + media library (oceantune-style contract).  */
/*  Images: browser WebP (canvas) → POST /api/upload → server-side bucket PUT.*/
/*  Videos: upload web-ready H.264 as-is with size guard (no ffmpeg in-       */
/*  browser). Returns public URLs. The library lists prior uploads (dev:      */
/*  in-memory, prod: Postgres via the uploader's MediaFile index).            */
/* ------------------------------------------------------------------------ */

type ItemKind = 'image' | 'video';

type QueueItem = {
  id: string;
  name: string;
  kind: ItemKind;
  status: 'optimizing' | 'uploading' | 'done' | 'failed' | 'too-big';
  publicUrl?: string;
  error?: string;
};

const STATUS_LABEL: Record<QueueItem['status'], string> = {
  optimizing: 'Optimizing (WebP)…',
  uploading: 'Uploading…',
  done: 'Done',
  failed: 'Failed',
  'too-big': 'Too large — export web-ready H.264 < 300 MB',
};

const VIDEO_MAX_MB = 300;
const tooBig = (f: File) => f.size / (1024 * 1024) > VIDEO_MAX_MB;

async function uploadOne(file: File, kind: ItemKind): Promise<{ url: string | null; key: string; error?: string }> {
  let name: string;
  let body: Blob;
  let contentType: string;

  if (kind === 'image') {
    const webp = await toWebP(file);
    body = webp ?? file;
    const ext = webp ? 'webp' : (/\.[a-z0-9]+$/i.exec(file.name)?.[0] ?? '.bin').toLowerCase();
    name = `${Date.now()}-${sanitizeKey(file.name.replace(/\.[^.]+$/, '') || 'image')}.${ext}`;
    contentType = 'image/webp';
  } else {
    body = file;
    name = `${Date.now()}-${sanitizeKey(file.name.replace(/\.[^.]+$/, '') || 'video')}.mp4`;
    contentType = 'video/mp4';
  }

  const res = await uploadForLibrary(name, contentType, body);
  if (!res) return { url: null, key: '', error: lastUploadError() ?? 'Storage rejected the upload' };
  return { url: res.url, key: res.key };
}

function UploadCard({ item }: { item: QueueItem }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!item.publicUrl) return;
    try {
      await navigator.clipboard.writeText(item.publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-ink-950/8 bg-white p-3">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-sand-100 text-ink-600">
        {item.kind === 'image' ? <ImagePlus size={20} /> : <FilmIcon size={20} />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-ink-900">{item.name}</p>
        <p className="text-xs text-ink-500">{STATUS_LABEL[item.status]}</p>
        {item.error && <p className="mt-0.5 text-xs leading-snug text-rose-600">{item.error}</p>}
      </div>
      {item.publicUrl && (
        <button
          onClick={copy}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-brand-600/20 bg-brand-50 px-3 py-2 text-xs font-bold text-brand-700 transition-colors hover:bg-brand-100"
          title="Copy public URL"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Copied' : 'Copy URL'}
        </button>
      )}
    </div>
  );
}

function isVideoUrl(url: string): boolean {
  return /\.(mp4|mov|webm|m4v)(\?|$)/i.test(url);
}

function LibraryThumb({ item }: { item: MediaItem }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(item.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };
  return (
    <div className="group overflow-hidden rounded-2xl border border-ink-950/8 bg-white">
      <div className="grid h-24 w-full place-items-center overflow-hidden bg-sand-100">
        {isVideoUrl(item.url) ? (
          <FilmIcon size={26} className="text-ink-400" />
        ) : (
          <img src={item.url} alt={item.name} loading="lazy" className="h-full w-full object-cover" />
        )}
      </div>
      <div className="p-2.5">
        <p className="truncate text-xs font-bold text-ink-900" title={item.name}>{item.name}</p>
        <p className="mt-0.5 text-[10px] text-ink-400">{new Date(item.createdAt).toLocaleString()}</p>
        <div className="mt-2 flex items-center gap-1.5">
          <button
            onClick={copy}
            className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-brand-600/20 bg-brand-50 px-2 py-1.5 text-[11px] font-bold text-brand-700 transition-colors hover:bg-brand-100"
            title="Copy public URL"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? 'Copied' : 'Copy URL'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function MediaTab() {
  const [dragOver, setDragOver] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [library, setLibrary] = useState<MediaItem[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const configError = r2ConfigError();

  const loadLibrary = useCallback(async () => {
    setLibrary(await fetchMediaList());
  }, []);

  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  const run = useCallback(async (files: FileList | File[]) => {
    for (const file of Array.from(files)) {
      const kind: ItemKind = /^video\//.test(file.type) ? 'video' : 'image';
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setQueue((q) => [...q, { id, name: file.name, kind, status: kind === 'image' ? 'optimizing' : 'uploading' }]);
      const res =
        kind === 'image' || !tooBig(file)
          ? await uploadOne(file, kind)
          : { url: null, key: '', error: undefined };
      setQueue((q) =>
        q.map((it) =>
          it.id === id
            ? {
                ...it,
                status: res.url ? 'done' : kind === 'video' && tooBig(file) ? 'too-big' : 'failed',
                publicUrl: res.url ?? undefined,
                error: res.url ? undefined : res.error,
              }
            : it
        )
      );
      if (res.url) {
        setLibrary((lib) => [
          { key: res.key, url: res.url!, name: file.name, createdAt: new Date().toISOString() },
          ...(lib ?? []),
        ]);
      }
    }
  }, []);

  const remove = async (item: MediaItem) => {
    if (!item.key) {
      setLibrary((lib) => (lib ?? []).filter((l) => l.url !== item.url));
      return;
    }
    const ok = await deleteMedia(item.key);
    if (ok) setLibrary((lib) => (lib ?? []).filter((l) => l.key !== item.key));
  };

  return (
    <div className="space-y-4">
      {configError && (
        <p className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs leading-relaxed text-rose-700">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" /> {configError}
        </p>
      )}
      <p className="text-xs text-ink-500">
        Images are re-encoded to WebP in your browser, then uploaded. Videos are uploaded web-ready (export H.264
        MP4 in CapCut/Premiere; we don't transcode in-browser). Everything lands as a permanent public URL.
      </p>

      <label
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); run(e.dataTransfer.files); }}
        className={cx(
          'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed px-6 py-12 text-center transition-colors',
          dragOver ? 'border-brand-500 bg-brand-50' : 'border-ink-950/15 bg-white hover:border-brand-400'
        )}
      >
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-600 text-white">
          <Upload size={24} />
        </div>
        <p className="font-display text-base font-semibold text-ink-900">Drop images or videos, or click to browse</p>
        <p className="max-w-sm text-xs text-ink-500">
          Images → WebP (~1–2 MB). Videos → web-ready H.264 MP4 ≤ 300 MB. Finished public URLs appear below the card.
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,video/mp4,video/quicktime,image/webp"
          className="hidden"
          onChange={(e) => { if (e.target.files) run(e.target.files); e.target.value = ''; }}
        />
      </label>

      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-[0.14em] text-ink-500">
        <span className="flex items-center gap-1.5"><Link2 size={13} /> New uploads</span>
        <span className="text-ink-400">{queue.length} in queue</span>
      </div>

      {queue.length === 0 ? (
        <div className="rounded-2xl border border-ink-950/8 bg-sand-50 py-8 text-center text-sm text-ink-500">
          Nothing uploaded yet. Drop a file above and grab its URL.
        </div>
      ) : (
        <div className="space-y-2">
          {queue.map((item) => <UploadCard key={item.id} item={item} />)}
        </div>
      )}

      <div className="flex items-center justify-between pt-2 text-xs font-bold uppercase tracking-[0.14em] text-ink-500">
        <span className="flex items-center gap-1.5"><FileUp size={13} /> Media library</span>
        <span className="text-ink-400">{library?.length ?? 0} files</span>
      </div>

      {library === null ? (
        <div className="rounded-2xl border border-ink-950/8 bg-sand-50 py-6 text-center text-sm text-ink-500">
          Library unreachable — is the uploader running and VITE_R2_SIGNER_URL set?
        </div>
      ) : library.length === 0 ? (
        <div className="rounded-2xl border border-ink-950/8 bg-sand-50 py-6 text-center text-sm text-ink-500">
          No media yet. Uploads above appear here (dev keeps them in-memory; production persists them).
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {library.map((item) => (
            <div key={`${item.key}-${item.url}`} className="group relative">
              <LibraryThumb item={item} />
              <button
                onClick={() => remove(item)}
                className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-lg bg-white/90 text-rose-600 opacity-0 shadow-sm transition-opacity hover:bg-rose-50 group-hover:opacity-100"
                title="Delete from library"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-2xl bg-sand-50 p-4 text-xs leading-relaxed text-ink-600">
        <p className="mb-1 flex items-center gap-1.5 font-bold uppercase tracking-[0.14em] text-ink-500">
          <FileUp size={13} /> How to use
        </p>
        Uploaded URLs are permanent and public. Copy the URL from a card and paste it into any image or video field
        in the Content tab (e.g. the hero videos list, offer poster, destination images). The hero on the public site
        keeps using the bundled fallback clips until a video is uploaded here.
      </div>
    </div>
  );
}