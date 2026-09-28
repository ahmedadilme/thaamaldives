/* ------------------------------------------------------------------------ */
/*  Inventory provenance — the gate on customer-visible prices                */
/* ------------------------------------------------------------------------ */
/**
 * Every customer-visible number derived from inventory must pass through
 * `isPriceVerified()`. This module is deliberately dependency-free and pure so
 * it can be used from the client, the importer, and tests without cycles.
 *
 * Rule: only provenance VERIFIED_IMPORT may produce a numeric price. SEEDED
 * fixtures, MANUAL edits, and UNKNOWN data all yield "no verified price".
 * Absence of a provenance field resolves to UNKNOWN, so legacy or tampered
 * data fails closed rather than selling fabricated numbers.
 */

import { isPriceBearing, PROVENANCE_LABEL, resolveProvenance, type InventoryProvenance } from './schema';

/**
 * Provenance of a given inventory record, defaulting to UNKNOWN.
 *
 * Accepts `provenance?: unknown` rather than the strict InventoryData field on
 * purpose: this value comes off localStorage, where it may be missing,
 * malformed, or hand-edited, and the gate must stay closed for all of those
 * cases rather than trust the compile-time type.
 */
export function provenanceOf(inventory: { provenance?: unknown } | null | undefined): InventoryProvenance {
  return resolveProvenance(inventory);
}

/** True only when the record's provenance permits customer-visible prices. */
export function isPriceVerified(inventory: { provenance?: unknown } | null | undefined): boolean {
  return isPriceBearing(provenanceOf(inventory));
}

export interface ProvenanceView {
  provenance: InventoryProvenance;
  label: string;
  priceVisible: boolean;
  /** Short sentence for admin UI explaining why a price is withheld. */
  reason: string;
}

const REASON: Record<InventoryProvenance, string> = {
  VERIFIED_IMPORT: 'Prices are published from a verified operator import.',
  SEEDED: 'This is seeded development data. Prices are withheld until a verified import is published.',
  MANUAL: 'These records were hand-edited and are not a verified operator import. Prices are withheld.',
  UNKNOWN: 'The origin of this data could not be established. Prices are withheld.',
};

export function provenanceView(inventory: { provenance?: unknown } | null | undefined): ProvenanceView {
  const provenance = provenanceOf(inventory);
  return {
    provenance,
    label: PROVENANCE_LABEL[provenance],
    priceVisible: isPriceBearing(provenance),
    reason: REASON[provenance],
  };
}

export { PROVENANCE_LABEL, isPriceBearing, resolveProvenance };
export type { InventoryProvenance };
