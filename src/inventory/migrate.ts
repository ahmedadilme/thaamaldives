/* ------------------------------------------------------------------------ */
/*  Read-time normalisation of stored inventory                                */
/* ------------------------------------------------------------------------ */
/**
 * The committed baseline artifact and any browser override written by an older
 * build predate the current record shapes:
 *
 *   - `TransferRate` had no `id`/`mode`/`periodLabel`/`validFrom`/`validTo`,
 *     and stored `adult` as a bare number.
 *   - `RATE_ID` did not include `validTo`, so stored rate ids are 4-part.
 *   - `provenance` did not exist at all.
 *
 * This module upgrades those records *in memory only*. It never writes, so the
 * committed artifact is left untouched and a user's existing override keeps
 * working. It is deliberately fail-closed: provenance is never invented. A
 * legacy record with no provenance stays UNKNOWN and therefore stays suppressed
 * until an operator publishes a verified import over it.
 */

import {
  RATE_ID,
  TRANSFER_KEY,
  resolveProvenance,
  toAvailabilityStatus,
  toPriceValue,
  toRateCell,
  type DailyAvailability,
  type ImportJob,
  type InventoryData,
  type RatePeriod,
  type TransferRate,
} from './schema';

const DEFAULT_CURRENCY = 'USD';

/** Mode assigned to legacy transfers, which had no mode column at all. */
const LEGACY_TRANSFER_MODE = 'return';

const asRecord = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {});

const str = (v: unknown): string => (typeof v === 'string' ? v : v == null ? '' : String(v));
const num = (v: unknown, fallback: number): number => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
};

/** `sourcePeriod` is optional and absent on legacy rows. */
function normalizeRate(raw: unknown): RatePeriod | null {
  const r = asRecord(raw);
  const resortSlug = str(r.resortSlug);
  const roomCode = str(r.roomCode);
  const validFrom = str(r.validFrom);
  if (!resortSlug || !roomCode || !validFrom) return null;
  const validTo = str(r.validTo);
  const mealCode = str(r.mealCode);
  return {
    id: RATE_ID(resortSlug, roomCode, mealCode, validFrom, validTo),
    resortSlug,
    roomCode,
    mealCode,
    validFrom,
    validTo,
    currency: str(r.currency) || DEFAULT_CURRENCY,
    sgl: toRateCell(r.sgl),
    dbl: toRateCell(r.dbl),
    tpl: toRateCell(r.tpl),
    qtrp: toRateCell(r.qtrp),
    ext: toRateCell(r.ext),
    child: toRateCell(r.child),
    infant: toRateCell(r.infant),
    sourcePeriod: r.sourcePeriod == null ? undefined : str(r.sourcePeriod),
    source: str(r.source) || 'unknown',
    importId: str(r.importId),
  };
}

function normalizeAvailability(raw: unknown): DailyAvailability | null {
  const a = asRecord(raw);
  const resortSlug = str(a.resortSlug);
  const roomCode = str(a.roomCode);
  const date = str(a.date);
  if (!resortSlug || !roomCode || !date) return null;
  const status = toAvailabilityStatus(a.status) ?? 'ON_REQUEST';
  const rawRooms = a.availableRooms;
  return {
    resortSlug,
    roomCode,
    date,
    availableRooms: rawRooms == null || rawRooms === '' ? null : num(rawRooms, 0),
    status,
    source: str(a.source) || 'unknown',
    importId: str(a.importId),
    updatedAt: str(a.updatedAt) || str(a.lastUpdated),
  };
}

function normalizeTransfer(raw: unknown): TransferRate | null {
  const t = asRecord(raw);
  const resortSlug = str(t.resortSlug);
  if (!resortSlug) return null;
  const mode = str(t.mode) || LEGACY_TRANSFER_MODE;
  const periodLabel = t.periodLabel == null ? null : str(t.periodLabel);
  return {
    id: str(t.id) || TRANSFER_KEY(resortSlug, mode, periodLabel),
    resortSlug,
    mode,
    periodLabel,
    validFrom: t.validFrom == null || t.validFrom === '' ? null : str(t.validFrom),
    validTo: t.validTo == null || t.validTo === '' ? null : str(t.validTo),
    adult: toPriceValue(t.adult),
    child: t.child == null || t.child === '' ? 'UNPRICED' : toPriceValue(t.child),
    currency: str(t.currency) || DEFAULT_CURRENCY,
    source: str(t.source) || 'unknown',
    importId: str(t.importId),
  };
}

function normalizeImport(raw: unknown): ImportJob | null {
  const j = asRecord(raw);
  const id = str(j.id);
  if (!id) return null;
  return {
    id,
    filename: str(j.filename),
    source: str(j.source),
    sourceType: str(j.sourceType),
    sourceId: str(j.sourceId),
    startedAt: str(j.startedAt),
    completedAt: str(j.completedAt),
    status: j.status === 'FAILED' || j.status === 'PARTIAL' ? j.status : 'SUCCESS',
    rowsProcessed: num(j.rowsProcessed, 0),
    rowsCreated: num(j.rowsCreated, 0),
    rowsUpdated: num(j.rowsUpdated, 0),
    rowsUnchanged: num(j.rowsUnchanged, 0),
    rowsFailed: num(j.rowsFailed, 0),
    errors: Array.isArray(j.errors) ? (j.errors as ImportJob['errors']) : [],
  };
}

/**
 * Upgrade any stored inventory payload to the current shape.
 * Returns a new object; the input is not mutated.
 */
export function normalizeInventory(raw: unknown): InventoryData {
  const d = asRecord(raw);
  const rates = Array.isArray(d.rates) ? d.rates.map(normalizeRate).filter((r): r is RatePeriod => r !== null) : [];
  const availability = Array.isArray(d.availability)
    ? d.availability.map(normalizeAvailability).filter((a): a is DailyAvailability => a !== null)
    : [];
  const transfers = Array.isArray(d.transfers)
    ? d.transfers.map(normalizeTransfer).filter((t): t is TransferRate => t !== null)
    : [];
  const imports = Array.isArray(d.imports)
    ? d.imports.map(normalizeImport).filter((j): j is ImportJob => j !== null)
    : [];

  return {
    version: num(d.version, 1),
    lastUpdated: str(d.lastUpdated) || new Date(0).toISOString(),
    // Keep whatever was stored; `resolveProvenance` maps anything
    // unrecognised or absent to UNKNOWN, which is suppressed.
    provenance: resolveProvenance(d),
    rates,
    availability,
    transfers,
    imports,
  };
}
