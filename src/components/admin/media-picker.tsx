import { useEffect, useState } from 'react';
import { Check, FilmIcon, Loader2, X } from 'lucide-react';
import { cx } from '@/components/ui';
import { fetchMediaList, type MediaItem } from '@/lib/r2';

const isVideoUrl = (url: string) => /\.(mp4|mov|webm|m4v)(\?|$)/i.test(url);

type PickerState = 'loading' | 'error' | 'ready';

/**
 * Modal picker over the media library (GET /api/media). Single mode inserts
 * the chosen URL immediately; multiple mode collects a selection and Insert
 * appends them. Reused by UrlUploadField so editors never hand-copy URLs.
 */
export function MediaPicker({
  open,
  multiple = false,
  onPick,
  onClose,
}: {
  open: boolean;
  multiple?: boolean;
  onPick: (urls: string[]) => void;
  onClose: () => void;
}) {
  const [state, setState] = useState<PickerState>('loading');
  const [items, setItems] = useState<MediaItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    setState('loading');
    setItems([]);
    setSelected(new Set());
    let gone = false;
    void fetchMediaList().then((lib) => {
      if (gone) return;
      if (lib === null) {
        setState('error');
        return;
      }
      setItems(lib);
      setState('ready');
    });
    return () => {
      gone = true;
    };
  }, [open]);

  if (!open) return null;

  const choose = (item: MediaItem) => {
    if (!multiple) {
      onPick([item.url]);
      onClose();
      return;
    }
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(item.url)) {
        next.delete(item.url);
      } else {
        next.add(item.url);
      }
      return next;
    });
  };

  const insert = () => {
    onPick(Array.from(selected));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink-950/40 p-4" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-3xl overflow-auto rounded-3xl bg-white p-5 shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h4 className="font-display text-lg font-semibold text-ink-950">Pick from library</h4>
            <p className="mt-0.5 text-xs text-ink-500">
              {multiple ? 'Select one or more — Insert appends them to the field.' : 'Choose an item to insert its URL.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-500 transition-colors hover:bg-ink-950/5"
            aria-label="Close library picker"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-4">
          {state === 'loading' && (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-ink-500">
              <Loader2 size={16} className="animate-spin" /> Loading library…
            </div>
          )}

          {state === 'error' && (
            <div className="rounded-2xl border border-ink-950/8 bg-sand-50 py-10 text-center text-sm text-ink-500">
              Library unreachable — is the uploader running and <strong className="text-ink-800">VITE_R2_SIGNER_URL</strong> set?
            </div>
          )}

          {state === 'ready' && items.length === 0 && (
            <div className="rounded-2xl border border-ink-950/8 bg-sand-50 py-10 text-center text-sm text-ink-500">
              No media yet — upload something in the Media tab first.
            </div>
          )}

          {state === 'ready' && items.length > 0 && (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {items.map((item) => {
                  const isSelected = multiple && selected.has(item.url);
                  return (
                    <button
                      key={`${item.key}-${item.url}`}
                      onClick={() => choose(item)}
                      className={cx(
                        'relative overflow-hidden rounded-2xl border text-left transition-colors',
                        isSelected
                          ? 'border-brand-600 ring-2 ring-brand-600'
                          : 'border-ink-950/8 hover:border-brand-400'
                      )}
                    >
                      {isSelected && (
                        <span className="absolute left-2 top-2 z-10 grid h-6 w-6 place-items-center rounded-full bg-brand-600 text-white">
                          <Check size={13} />
                        </span>
                      )}
                      <div className="grid h-24 w-full place-items-center overflow-hidden bg-sand-100">
                        {isVideoUrl(item.url) ? (
                          <FilmIcon size={26} className="text-ink-400" />
                        ) : (
                          <img src={item.url} alt={item.name} loading="lazy" className="h-full w-full object-cover" />
                        )}
                      </div>
                      <div className="p-2.5">
                        <p className={cx('truncate text-xs font-bold', isSelected ? 'text-brand-700' : 'text-ink-900')} title={item.name}>
                          {item.name}
                        </p>
                        <p className="mt-0.5 text-[10px] text-ink-400">{new Date(item.createdAt).toLocaleString()}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {multiple && (
                <div className="mt-4 flex items-center justify-end gap-2">
                  <span className="text-xs text-ink-500">{selected.size} selected</span>
                  <button
                    onClick={insert}
                    disabled={selected.size === 0}
                    className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Insert {selected.size > 0 ? `(${selected.size})` : ''}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}