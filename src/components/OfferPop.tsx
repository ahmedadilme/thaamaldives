import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { getPopOffer } from '@/content/offers';
import { getContent } from '@/content/client';

const KEY = 'thaa.offerDismiss.v1';
const VISIT_KEY = 'thaa.offerSeenSession.v1';
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

  useEffect(() => {
    const offer = getPopOffer();
    const settings = getContent().settings.offerPop;
    if (!offer || !settings.enabled) return;

    const dismiss = readDismiss();
    if (dismiss && dismiss.offerId === offer.id && Date.now() - dismiss.at < SEVEN_DAYS) return;

    let sessionSeen = false;
    try {
      sessionSeen = sessionStorage.getItem(VISIT_KEY) === offer.id;
    } catch {
      // ignore
    }
    if (sessionSeen) return;

    const t = window.setTimeout(() => {
      setVisible(true);
      try {
        sessionStorage.setItem(VISIT_KEY, offer.id);
      } catch {
        // ignore
      }
    }, settings.delayMs);

    return () => window.clearTimeout(t);
  }, []);

  if (!visible) return null;

  const offer = getPopOffer();
  const settings = getContent().settings.offerPop;
  if (!offer || !settings.enabled) return null;

  const close = () => setVisible(false);

  const notInterested = () => {
    writeDismiss({ offerId: offer.id, at: Date.now() });
    close();
  };

  return (
    <div
      role="dialog"
      aria-label={`Special offer: ${offer.title}`}
      className="fixed bottom-4 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm animate-fade-in-up"
    >
      <div className="overflow-hidden rounded-3xl border border-ink-950/10 bg-white shadow-2xl">
        <div className="relative h-28 bg-gradient-to-br from-brand-600 via-brand-700 to-ink-950">
          {offer.poster && (
            <>
              <img src={offer.poster} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink-950/80 via-ink-950/20 to-transparent" />
            </>
          )}
          {offer.badge && (
            <span className="absolute left-4 top-4 rounded-full bg-gold-500 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-ink-950">
              {offer.badge}
            </span>
          )}
          <button
            onClick={close}
            aria-label="Close offer"
            className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-ink-950/40 text-white backdrop-blur transition-colors hover:bg-ink-950/70"
          >
            <X size={15} />
          </button>
          <div className="absolute bottom-3 left-4 right-4">
            <p className="font-display text-2xl font-semibold leading-tight text-white">{offer.title}</p>
          </div>
        </div>
        <div className="p-5">
          <p className="text-sm leading-relaxed text-ink-600">{offer.subtitle}</p>
          <div className="mt-4 flex items-center gap-3">
            <a
              href={offer.ctaHref ?? '/packages'}
              onClick={close}
              className="inline-flex flex-1 items-center justify-center rounded-full bg-brand-600 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-brand-500"
            >
              {offer.ctaLabel ?? 'View offer'}
            </a>
            <button
              onClick={notInterested}
              className="rounded-full px-3 py-2.5 text-xs font-semibold text-ink-500 underline-offset-4 hover:text-ink-800 hover:underline"
            >
              Not interested
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}