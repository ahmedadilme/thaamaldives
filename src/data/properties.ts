import type { Addon, Property } from '@/types';
import { resorts } from './resorts';
import { hotels } from './hotels';
import { guesthouses } from './guesthouses';
import { getAddons as resortAddons } from './addons';
import { getLowestNightly } from '@/inventory/client';

export const properties: Property[] = [
  ...resorts.map((r) => ({ ...r, kind: 'resort' as const })),
  ...hotels,
  ...guesthouses,
];

export const getProperty = (slug: string): Property | undefined => properties.find((p) => p.slug === slug);

export const getAddonsFor = (slug: string, inline?: Addon[]): Addon[] => resortAddons(slug, inline);

export const kindLabel: Record<Property['kind'], string> = {
  resort: 'Resort',
  hotel: 'Hotel',
  guesthouse: 'Guest House',
};

export const propertySeasons = (p: Property) => p.contract.periods;

export const lowestNightly = (p: Property): number => {
  const fromInventory = getLowestNightly(p.slug);
  if (fromInventory !== null) return fromInventory;
  let min = Infinity;
  for (const row of p.contract.rates) {
    for (const key of ['sgl', 'dbl', 'tpl'] as const) {
      const v = row[key];
      if (typeof v === 'number' && !Number.isNaN(v)) min = Math.min(min, v);
      else if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v)) && Number(v) > 0) min = Math.min(min, Number(v));
    }
  }
  return Number.isFinite(min) ? min : 0;
};

export const allAtolls = [...new Set(properties.map((p) => p.atoll.split('·')[0].trim()))].sort();

export const allBoards = [...new Set(properties.flatMap((p) => p.contract.mealPlans.map((m) => m.code)))].sort();