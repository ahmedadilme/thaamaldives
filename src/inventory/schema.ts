export type RateCell = number | 'On Request' | 'N/A' | 'FOC';

/* -------------------------------------------------------------------------- */
/*  Provenance — the single gate on customer-visible prices                     */
/* -------------------------------------------------------------------------- */

/**
 * Where the current inventory came from, and therefore whether its numbers may
 * be shown to a customer.
 *
 * Only VERIFIED_IMPORT is allowed to produce a customer-visible numeric price.
 * Everything else (SEEDED fixtures, hand edits, or data of unknown origin) is
 * structurally present but must render as "no verified price".
 *
 * This is stored on the inventory record, never inferred from a UI toggle, so a
 * price gate cannot be switched off from the browser.
 */
export type InventoryProvenance = 'VERIFIED_IMPORT' | 'SEEDED' | 'MANUAL' | 'UNKNOWN';

export const INVENTORY_PROVENANCES: readonly InventoryProvenance[] = [
  'VERIFIED_IMPORT',
  'SEEDED',
  'MANUAL',
  'UNKNOWN',
];

/** The only provenance permitted to produce a customer-visible numeric price. */
export const isPriceBearing = (p: InventoryProvenance | undefined | null): boolean => p === 'VERIFIED_IMPORT';

/**
 * Resolve provenance from a stored inventory record.
 *
 * An absent or unrecognised value resolves to UNKNOWN, which is suppressed.
 * Fail-closed on purpose: data we cannot account for must not be sold.
 */
export function resolveProvenance(data: { provenance?: unknown } | null | undefined): InventoryProvenance {
  const raw = data?.provenance;
  return typeof raw === 'string' && (INVENTORY_PROVENANCES as readonly string[]).includes(raw)
    ? (raw as InventoryProvenance)
    : 'UNKNOWN';
}

export const PROVENANCE_LABEL: Record<InventoryProvenance, string> = {
  VERIFIED_IMPORT: 'Verified import',
  SEEDED: 'Seeded development data',
  MANUAL: 'Manual edits',
  UNKNOWN: 'Unknown origin',
};

export function toRateCell(v: unknown): RateCell {
  if (v === null || v === undefined || v === '') return 'N/A';
  if (typeof v === 'number') return Number.isFinite(v) && v > 0 ? v : 'N/A';
  const s = String(v).trim();
  if (s === '') return 'N/A';
  const lower = s.toLowerCase();
  if (lower === 'on request' || lower === 'onreq' || lower === 'oreq') return 'On Request';
  if (lower === 'foc' || lower === 'complimentary' || lower === 'free') return 'FOC';
  if (lower === 'n/a' || lower === 'na' || lower === '-') return 'N/A';
  const n = Number(s.replace(/[, ]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : 'N/A';
}

export function isNumericRate(cell: RateCell | undefined): cell is number {
  return typeof cell === 'number' && cell > 0;
}

export function rateLabel(cell: RateCell | undefined): string {
  if (typeof cell === 'number') return String(cell);
  return cell ?? 'N/A';
}

/* -------------------------------------------------------------------------- */
/*  Transfer pricing                                                           */
/* -------------------------------------------------------------------------- */

/**
 * A transfer price is NOT a plain number-or-null. Three non-numeric states are
 * commercially distinct and must never collapse into each other:
 *
 *   FOC        — free of charge. A real, sellable, zero-cost price.
 *   UNPRICED   — the operator did not quote this. Nothing may be shown or added.
 *   REFERENCE  — the operator deferred to a footnote ("Info below"). A human
 *                must resolve it; it is deliberately NOT a number and NOT zero.
 */
export type PriceValue = number | 'FOC' | 'UNPRICED' | 'REFERENCE';

const REFERENCE_TOKENS = ['info below', 'info', 'see below', 'refer', 'refer below', 'tbc', 'on request'];
const UNPRICED_TOKENS = ['', '-', '--', 'n/a', 'na', 'nil', 'none', 'not quoted'];

export function toPriceValue(v: unknown): PriceValue {
  if (v === null || v === undefined) return 'UNPRICED';
  if (typeof v === 'number') return Number.isFinite(v) && v > 0 ? v : 'UNPRICED';
  const s = String(v).trim();
  if (s === '') return 'UNPRICED';
  const lower = s.toLowerCase();
  if (lower === 'foc' || lower === 'complimentary' || lower === 'free' || lower === 'free of charge') return 'FOC';
  if (REFERENCE_TOKENS.includes(lower)) return 'REFERENCE';
  if (UNPRICED_TOKENS.includes(lower)) return 'UNPRICED';
  const n = Number(s.replace(/[, ]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : 'REFERENCE';
}

/** True only when the value is a real, chargeable, addable-to-total number. */
export function isPriced(v: PriceValue | null | undefined): v is number {
  return typeof v === 'number' && v > 0;
}

/** Numeric contribution to a total: FOC counts as 0, UNPRICED/REFERENCE do not count at all. */
export function pricedAmount(v: PriceValue | null | undefined): number | null {
  if (isPriced(v)) return v;
  if (v === 'FOC') return 0;
  return null;
}

export function priceValueLabel(v: PriceValue | null | undefined): string {
  if (v === 'FOC') return 'Free of charge';
  if (v === 'REFERENCE') return 'On request — see contract notes';
  if (v === 'UNPRICED' || v === null || v === undefined) return 'Not quoted';
  return formatAmount(v);
}

function formatAmount(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

export type AvailabilityStatus = 'AVAILABLE' | 'ON_REQUEST' | 'SOLD_OUT' | 'STOP_SELL';

export function toAvailabilityStatus(v: unknown): AvailabilityStatus | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim().toUpperCase().replace(/[\s_]+/g, '_');
  if (s === 'AVAILABLE' || s === 'OPEN' || s === 'YES') return 'AVAILABLE';
  if (s === 'ON_REQUEST' || s === 'ON REQUEST') return 'ON_REQUEST';
  if (s === 'SOLD_OUT' || s === 'SOLD OUT' || s === 'FULL') return 'SOLD_OUT';
  if (s === 'STOP_SELL' || s === 'STOP SELL' || s === 'CLOSED') return 'STOP_SELL';
  return null;
}

export type RecordStatus = 'SUCCESS' | 'PARTIAL' | 'FAILED';

export interface RatePeriod {
  id: string;
  resortSlug: string;
  roomCode: string;
  mealCode: string;
  validFrom: string;
  validTo: string;
  currency: string;
  sgl: RateCell;
  dbl: RateCell;
  tpl: RateCell;
  qtrp: RateCell;
  ext: RateCell;
  child: RateCell;
  infant: RateCell;
  sourcePeriod?: string;
  source: string;
  importId: string;
}

export interface DailyAvailability {
  resortSlug: string;
  roomCode: string;
  date: string;
  availableRooms: number | null;
  status: AvailabilityStatus;
  source: string;
  importId: string;
  updatedAt: string;
}

/**
 * Transfer identity is (resort, mode, period).
 *
 * `mode` distinguishes the transfer type the operator quoted — a seaplane
 * ("SPL") leg is a different product at a different price from a speedboat
 * return leg, and collapsing them silently under-quotes the more expensive one.
 * `periodLabel` keeps the operator's own period label alongside the parsed
 * range, because the label is what the contract actually says.
 */
export interface TransferRate {
  id: string;
  resortSlug: string;
  mode: string;
  periodLabel: string | null;
  validFrom: string | null;
  validTo: string | null;
  adult: PriceValue;
  child: PriceValue;
  currency: string;
  source: string;
  importId: string;
}

/** Structured context so a rejected row can be identified without guessing. */
export interface ImportErrorDetail {
  resort?: string;
  room?: string;
  mealPlan?: string;
  validFrom?: string;
  validTo?: string;
  /** For duplicates: the field and both values that disagree. */
  conflicts?: Array<{ field: string; existing: string; incoming: string }>;
}

export interface ImportError {
  rowNumber: number;
  field: string;
  message: string;
  /** Stable machine-readable reason, e.g. DUPLICATE_RATE_PERIOD. */
  code?: string;
  detail?: ImportErrorDetail;
}

export interface ImportJob {
  id: string;
  filename: string;
  source: string;
  sourceType: string;
  sourceId: string;
  startedAt: string;
  completedAt: string;
  status: RecordStatus;
  rowsProcessed: number;
  rowsCreated: number;
  rowsUpdated: number;
  rowsUnchanged: number;
  rowsFailed: number;
  errors: ImportError[];
}

export interface InventoryData {
  version: number;
  lastUpdated: string;
  /**
   * Provenance of this dataset. Absent in legacy records, which resolve to
   * UNKNOWN and are therefore suppressed.
   */
  provenance?: InventoryProvenance;
  rates: RatePeriod[];
  availability: DailyAvailability[];
  transfers: TransferRate[];
  imports: ImportJob[];
}

export interface InventoryManifest {
  version: number;
  lastUpdated: string;
  source: string;
  provenance: InventoryProvenance;
  rateRows: number;
  availabilityDays: number;
  transfers: number;
  imports: number;
}

export const DEFAULT_CURRENCY = 'USD';
export const INVENTORY_STORAGE_KEY = 'thaa.inventory.v1';
export const INVENTORY_VERSION = 1;

/**
 * Rate natural key: (resort, room, meal, validFrom, validTo).
 *
 * `validTo` is part of the key on purpose. Without it, two contract periods that
 * share a start date but end differently collide, and a downstream "cheapest
 * wins" sort silently quotes the lower of the two.
 */
export const RATE_ID = (resort: string, room: string, meal: string, from: string, to: string) =>
  `${resort}__${room}__${meal}__${from}__${to}`;

/** Transfer natural key: (resort, mode, period). */
export const TRANSFER_KEY = (resort: string, mode: string, period: string | null | undefined) =>
  `${resort}__${mode}__${period ?? ''}`;

export const AVAIL_KEY = (resort: string, room: string, date: string) => `${resort}__${room}__${date}`;