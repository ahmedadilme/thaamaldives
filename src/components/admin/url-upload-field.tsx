import { useEffect, useRef, useState } from 'react';
import { FilmIcon, ImageIcon, Library, Trash2, Upload, X } from 'lucide-react';
import { cx } from '@/components/ui';
import { optimizeAndUploadImage, uploadVideoAsIs, formatSize, r2ConfigError, lastUploadError } from '@/lib/r2';
import { MediaPicker } from './media-picker';

const inp = 'w-full rounded-xl border border-ink-950/10 bg-white px-3 py-2 text-sm text-ink-900 focus:border-brand-500 focus:outline-none';

const isVideoUrl = (url: string) => /\.(mp4|mov|webm|m4v)(\?|$)/i.test(url);

const btnPrimary =
  'inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-brand-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-brand-700 disabled:opacity-50';
const btnOutline =
  'inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-brand-600/20 bg-brand-50 px-3 py-2 text-xs font-bold text-brand-700 transition-colors hover:bg-brand-100';

export function UrlUploadField({
  label,
  value,
  onChange,
  multiple,
  textarea,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiple?: boolean;
  textarea?: boolean;
  hint?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const urls = multiple ? value.split('\n').map((s) => s.trim()).filter(Boolean) : [];

  const pick = async (f: File) => {
    setBusy(true);
    setError(null);
    const isVideo = /^video\//.test(f.type);
    if (isVideo) {
      const maxMB = 300;
      if (f.size / (1024 * 1024) > maxMB) { setError(`Too large (${formatSize(f.size)}) \u2014 export web-ready H.264 < ${maxMB} MB`); setBusy(false); return; }
    }
    const url = isVideo ? await uploadVideoAsIs(f) : await optimizeAndUploadImage(f);
    setBusy(false);
    if (!url) { setError(r2ConfigError() ?? lastUploadError() ?? 'Upload failed \u2014 is the uploader running?'); return; }
    addUrls([url]);
  };

  const addUrls = (incoming: string[]) => {
    if (!multiple) {
      if (incoming[0]) onChange(incoming[0]);
      return;
    }
    const list = urls.slice();
    for (const u of incoming) if (u && !list.includes(u)) list.push(u);
    onChange(list.join('\n'));
  };

  const setUrl = (index: number, next: string) => {
    const list = urls.slice();
    list[index] = next;
    onChange(list.join('\n'));
  };
  const removeUrl = (index: number) => onChange(urls.filter((_, i) => i !== index).join('\n'));

  return (
    <div className="space-y-2">
      <label className="block">
        <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.14em] text-ink-500">
          {label}
          {multiple && (
            <span className="ml-1.5 font-semibold normal-case tracking-normal text-ink-400">({urls.length})</span>
          )}
        </span>

        {multiple ? (
          <div className="flex items-center gap-2">
            <button type="button" disabled={busy} onClick={() => inputRef.current?.click()} className={btnPrimary}>
              <Upload size={13} /> {busy ? 'Uploading\u2026' : 'Upload'}
            </button>
            <button type="button" onClick={() => setPickerOpen(true)} className={btnOutline}>
              <Library size={13} /> From library
            </button>
          </div>
        ) : (
          <div className="flex items-start gap-2">
            {textarea ? (
              <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={multiple ? 'one URL per line' : 'path or URL'}
                rows={3}
                className={inp}
              />
            ) : (
              <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="path or URL" className={inp} />
            )}
            <button type="button" disabled={busy} onClick={() => inputRef.current?.click()} className={btnPrimary}>
              <Upload size={13} /> {busy ? 'Uploading\u2026' : 'Upload'}
            </button>
            <button type="button" onClick={() => setPickerOpen(true)} className={btnOutline}>
              <Library size={13} />
            </button>
          </div>
        )}
      </label>

      <input
        ref={inputRef}
        type="file"
        hidden
        accept="image/*,video/mp4,video/quicktime"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void pick(f); e.target.value = ''; }}
      />

      {multiple && (
        urls.length === 0 ? (
          <div className="rounded-xl border border-dashed border-ink-950/15 bg-sand-50 py-6 text-center text-xs text-ink-500">
            Nothing here yet — upload a file or pick from the library.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {urls.map((url, i) => (
              <div key={i} className="group relative overflow-hidden rounded-xl border border-ink-950/8 bg-white">
                <div className="grid h-20 w-full place-items-center overflow-hidden bg-sand-100">
                  {isVideoUrl(url) ? (
                    <FilmIcon size={22} className="text-ink-400" />
                  ) : (
                    <UrlImage url={url} className="h-full w-full object-cover" />
                  )}
                </div>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(i, e.target.value)}
                  className="w-full border-0 border-t border-ink-950/8 bg-white px-2 py-1.5 text-[11px] text-ink-700 focus:outline-none"
                  placeholder="URL"
                />
                {urls.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeUrl(i)}
                    className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-lg bg-white/90 text-rose-600 opacity-0 shadow-sm transition-opacity hover:bg-rose-50 group-hover:opacity-100"
                    title="Remove from list"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {!multiple && value && <Preview url={value} />}

      {error && <p className="flex items-center gap-1 text-xs text-rose-600"><X size={12} /> {error}</p>}
      {hint && <p className="text-xs text-ink-500">{hint}</p>}

      <MediaPicker
        open={pickerOpen}
        multiple={multiple}
        onPick={addUrls}
        onClose={() => setPickerOpen(false)}
      />
    </div>
  );
}

function UrlImage({ url, className }: { url: string; className: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);
  if (failed) {
    return (
      <div className={cx('grid h-full w-full place-items-center', className)}>
        <div className="px-2 text-center">
          <ImageIcon size={16} className="mx-auto mb-1 text-ink-400" />
          <p className="text-[10px] leading-tight text-ink-400">Preview failed</p>
        </div>
      </div>
    );
  }
  return <img src={url} alt="" loading="lazy" onError={() => setFailed(true)} className={className} />;
}

function Preview({ url }: { url: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-28 w-40 shrink-0 place-items-center overflow-hidden rounded-xl border border-ink-950/10 bg-sand-100">
        {isVideoUrl(url) ? <FilmIcon size={24} className="text-ink-400" /> : <UrlImage url={url} className="h-full w-full object-cover" />}
      </div>
      <p className="min-w-0 text-xs text-ink-500">
        {isVideoUrl(url) ? 'Video URL set' : 'Image preview'}
        <span className="block truncate text-[10px] text-ink-400" title={url}>{url}</span>
      </p>
    </div>
  );
}