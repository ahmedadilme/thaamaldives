import { useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { optimizeAndUploadImage, uploadVideoAsIs, formatSize, r2ConfigError, lastUploadError } from '@/lib/r2';

const inp = 'w-full rounded-xl border border-ink-950/10 bg-white px-3 py-2 text-sm text-ink-900 focus:border-brand-500 focus:outline-none';

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
  const inputRef = useRef<HTMLInputElement>(null);

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
    if (!url) { setError(r2ConfigError() ?? lastUploadError() ?? 'Upload failed \u2014 is the signer running?'); return; }
    if (multiple) {
      const list = value.split('\n').map((s) => s.trim()).filter(Boolean);
      if (!list.includes(url)) list.push(url);
      onChange(list.join('\n'));
    } else {
      onChange(url);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block">
        <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.14em] text-ink-500">{label}</span>
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
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-brand-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
          >
            <Upload size={13} /> {busy ? 'Uploading\u2026' : 'Upload'}
          </button>
        </div>
      </label>
      <input ref={inputRef} type="file" hidden accept="image/*,video/mp4,video/quicktime" onChange={(e) => { const f = e.target.files?.[0]; if (f) void pick(f); e.target.value = ''; }} />
      {error && <p className="flex items-center gap-1 text-xs text-rose-600"><X size={12} /> {error}</p>}
      {hint && <p className="text-xs text-ink-500">{hint}</p>}
    </div>
  );
}
