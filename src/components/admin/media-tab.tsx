import { useCallback, useRef, useState } from 'react';
import { AlertTriangle, Check, Copy, FileUp, FilmIcon, ImagePlus, Link2, Upload } from 'lucide-react';
import { cx } from '@/components/ui';
import {
  putUpload,
  requestUploadUrl,
  sanitizeKey,
  toWebP,
  publicUrl,
  r2ConfigError,
  lastUploadError,
} from '@/lib/r2';

/* ------------------------------------------------------------------------ */
/*  MediaTab — World 2 straight-to-bucket uploads (dev signer / uploader).  */
/*  Images: browser WebP (canvas) → presigned PUT. Videos: upload web-ready  */
/*  H.264 as-is with size guard (no ffmpeg in-browser). Returns public URLs. */
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

async function uploadOne(file: File, kind: ItemKind): Promise<{ url: string | null; error?: string }> {
  let key: string;
  let body: Blob;
  let contentType: string;

  if (kind === 'image') {
    const webp = await toWebP(file);
    body = webp ?? file;
    const ext = webp ? 'webp' : (/\.[a-z0-9]+$/i.exec(file.name)?.[0] ?? '.bin').toLowerCase();
    key = `${Date.now()}-${sanitizeKey(file.name.replace(/\.[^.]+$/, '') || 'image')}.${ext}`;
    contentType = 'image/webp';
  } else {
    body = file;
    key = `${Date.now()}-${sanitizeKey(file.name.replace(/\.[^.]+$/, '') || 'video')}.mp4`;
    contentType = 'video/mp4';
  }

  const upload = await requestUploadUrl(key, contentType);
  if (!upload) return { url: null, error: lastUploadError() ?? undefined };
  if (!(await putUpload(upload, body))) return { url: null, error: 'Storage rejected the upload' };
  const url = publicUrl(key);
  if (!url) return { url: null, error: r2ConfigError() ?? 'VITE_R2_PUBLIC_URL / VITE_R2_BUCKET not set' };
  return { url };
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

export function MediaTab() {
  const [dragOver, setDragOver] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const configError = r2ConfigError();

  const run = useCallback(async (files: FileList | File[]) => {
    for (const file of Array.from(files)) {
      const kind: ItemKind = /^video\//.test(file.type) ? 'video' : 'image';
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setQueue((q) => [...q, { id, name: file.name, kind, status: kind === 'image' ? 'optimizing' : 'uploading' }]);
      const res =
        kind === 'image' || !tooBig(file)
          ? await uploadOne(file, kind)
          : { url: null, error: undefined };
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
    }
  }, []);

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

      <div className="rounded-2xl bg-sand-50 p-4 text-xs leading-relaxed text-ink-600">
        <p className="mb-1 flex items-center gap-1.5 font-bold uppercase tracking-[0.14em] text-ink-500">
          <FileUp size={13} /> How to use
        </p>
        Uploaded URLs are permanent and public. Copy the URL from a completed card and paste it into any image or
        video field in the Content tab (e.g. the hero videos list, offer poster, destination images). The hero on the
        public site keeps using the bundled fallback clips until a video is uploaded here.
      </div>
    </div>
  );
}
