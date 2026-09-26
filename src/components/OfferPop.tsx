import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { getPopOffer } from '@/content/offers';
import { getContent } from '@/content/client';
import { Button } from './ui';

const KEY = 'thaa.offerDismiss.v1';
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

type Dismiss = { offerId: string; at: number } | null;

function readDismiss(): Dismiss {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Dismiss) : null;
  } catch {
    return null;
  }
}

function writeDismiss(d: Dismiss) {
  try {
    if (d) localStorage.setItem(KEY, JSON.stringify(d));
    else localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

export function OfferPop() {
  const [visible, setVisible] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  const offer = getPopOffer();
  const settings = getContent().settings.offerPop;
  const offerId = offer?.id;

  // Show after the configured delay. Nothing is stored in sessionStorage, so a
  // refresh always re-shows the offer; closing only hides it for this mount.
  useEffect(() => {
    if (!offerId || !settings.enabled) return;

    const dismiss = readDismiss();
    if (dismiss && dismiss.offerId === offerId && Date.now() - dismiss.at < SEVEN_DAYS) return;

    const t = window.setTimeout(() => setVisible(true), settings.delayMs);
    return () => window.clearTimeout(t);
  }, [offerId, settings.enabled, settings.delayMs]);

  // Escape closes; body scroll is locked while the card is up.
  useEffect(() => {
    if (!visible) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setVisible(false);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [visible]);

  if (!visible || !offer || !settings.enabled) return null;

  const close = () => setVisible(false);

  const notInterested = () => {
    writeDismiss({ offerId: offer.id, at: Date.now() });
    close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <div
        className="absolute inset-0 animate-fade-in bg-ink-950/60 backdrop-blur-sm"
        onClick={close}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Special offer: ${offer.title}`}
        className="relative w-full max-w-[26rem] animate-scale-in overflow-hidden rounded-3xl border border-ink-950/10 bg-white shadow-2xl"
      >
        <button
          ref={closeRef}
          onClick={close}
          aria-label="Close offer"
          className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-ink-950/50 text-white backdrop-blur transition-colors hover:bg-ink-950/75"
        >
          <X size={16} />
        </button>

        <div className="relative aspect-[3/4] w-full bg-gradient-to-br from-brand-600 via-brand-700 to-ink-950">
          {offer.poster ? (
            <img src={offer.poster} alt="" className="h-full w-full object-cover" />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950/90 via-ink-950/40 to-transparent" />

          {offer.badge && (
            <span className="absolute left-4 top-4 rounded-full bg-gold-500 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-ink-950">
              {offer.badge}
            </span>
          )}

          <div className="absolute bottom-0 left-0 right-0 p-5">
            <h2 className="font-display text-3xl font-semibold leading-tight text-white">{offer.title}</h2>
            {offer.subtitle && (
              <p className="mt-2 text-sm leading-relaxed text-white/80">{offer.subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 p-5">
          <Button
            variant="gold"
            size="md"
            href={offer.ctaHref || '/packages'}
            onClick={close}
            className="flex-1"
          >
            {offer.ctaLabel || 'View offer'}
          </Button>
          <Button variant="outline" size="md" to="/packages" onClick={close}>
            View packages
          </Button>
        </div>

        <div className="px-5 pb-5">
          <button
            onClick={notInterested}
            className="w-full rounded-full py-2 text-center text-xs font-semibold text-ink-500 underline-offset-4 transition-colors hover:text-ink-800 hover:underline"
          >
            Not interested — don&apos;t show this offer again for a week
          </button>
        </div>
      </div>
    </div>
  );
}
