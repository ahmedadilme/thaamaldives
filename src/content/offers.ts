import { getContent } from './client';
import type { ContentOffer } from './types';
import { todayISO } from '@/lib/dates';

export function getActiveOffers(now = todayISO()): ContentOffer[] {
  const offers = getContent().offers ?? [];
  return offers
    .filter((o) => (!o.startAt || o.startAt <= now) && (!o.endAt || o.endAt >= now))
    .sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));
}

export function getPopOffer(now = todayISO()): ContentOffer | null {
  const withPoster = getActiveOffers(now).filter((o) => o.poster && o.ctaHref);
  return withPoster[0] ?? null;
}