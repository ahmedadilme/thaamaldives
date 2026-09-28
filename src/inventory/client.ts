import baseInventory from './artifacts/inventory.json';
import {
  AVAIL_KEY,
  INVENTORY_STORAGE_KEY,
  pricedAmount,
  type AvailabilityStatus,
  type DailyAvailability,
  type InventoryData,
  type InventoryProvenance,
  type PriceValue,
  type RateCell,
  type RatePeriod,
} from './schema';
import { isPriceVerified, provenanceView } from './provenance';
import { normalizeInventory } from './migrate';
import { dateRange, diffDays, parsePeriodLabel } from '@/lib/dates';

const CACHE_TTL_MS = 60_000;

interface CacheEntry {
  at: number;
  value: unknown;
}

const cache = new Map<string, CacheEntry>();

export function invalidate(): void {
  cache.clear();
}

function cached<T>(key: string, compute: () => T, ttl: number = CACHE_TTL_MS): T {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttl) return hit.value as T;
  const value = compute();
  cache.set(key, { at: Date.now(), value });
  return value;
}

function readOverride(): InventoryData | null {
  try {
    const raw = localStorage.getItem(INVENTORY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as InventoryData;
    if (!parsed?.rates || !parsed?.availability) return null;
    // Upgrade legacy record shapes in memory; the stored bytes are untouched.
    return normalizeInventory(parsed);
  } catch {
    return null;
  }
}

/**
 * Raised when an inventory override could not be persisted.
 *
 * This is deliberately an exception rather than a silent no-op. The previous
 * implementation swallowed the failure and then re-read storage, so a full
 * localStorage reported a successful publish while the old rates stayed live —
 * the worst possible failure mode for pricing data.
 */
export class InventoryWriteError extends Error {
  readonly payloadBytes: number;
  /** Declared locally because the app targets ES2020, where Error.cause is absent from lib. */
  readonly cause: unknown;

  constructor(message: string, payloadBytes: number, cause: unknown) {
    super(message);
    this.name = 'InventoryWriteError';
    this.payloadBytes = payloadBytes;
    this.cause = cause;
  }

  get isQuota(): boolean {
    return (
      this.cause instanceof DOMException &&
      (this.cause.name === 'QuotaExceededError' || this.cause.name === 'NS_ERROR_DOM_QUOTA_REACHED')
    );
  }
}

function writeOverride(data: InventoryData): void {
  let payload: string;
  try {
    payload = JSON.stringify(data);
  } catch (err) {
    throw new InventoryWriteError('Inventory could not be serialised for storage.', 0, err);
  }
  const bytes = payload.length;
  if (typeof localStorage === 'undefined') {
    throw new InventoryWriteError('Browser storage is unavailable, so inventory cannot be published.', bytes, null);
  }
  try {
    localStorage.setItem(INVENTORY_STORAGE_KEY, payload);
  } catch (err) {
    const quota =
      err instanceof DOMException &&
      (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED');
    throw new InventoryWriteError(
      quota
        ? `Browser storage is full — the inventory payload is ${(bytes / 1024 / 1024).toFixed(1)} MB and could not be saved. Nothing was published.`
        : 'Browser storage rejected the inventory write. Nothing was published.',
      bytes,
      err
    );
  }
}

export function getInventory(): InventoryData {
  // Every read goes through normalise, so the committed artifact and any
  // legacy browser override both present the current record shape.
  return cached('inventory', () => readOverride() ?? normalizeInventory(baseInventory));
}

export function getBaselineInventory(): InventoryData {
  return cached('inventory:baseline', () => normalizeInventory(baseInventory));
}

export function isOverrideActive(): boolean {
  return readOverride() !== null;
}

export interface InventoryOverview {
  version: number;
  lastUpdated: string;
  override: boolean;
  provenance: InventoryProvenance;
  priceVisible: boolean;
  provenanceLabel: string;
  provenanceReason: string;
  resorts: number;
  rateRows: number;
  availabilityDays: number;
  transfers: number;
  imports: number;
}

export function getOverview(): InventoryOverview {
  const inv = getInventory();
  const view = provenanceView(inv);
  return cached(
    `overview:${inv.version}`,
    () => ({
      version: inv.version,
      lastUpdated: inv.lastUpdated,
      override: isOverrideActive(),
      provenance: view.provenance,
      priceVisible: view.priceVisible,
      provenanceLabel: view.label,
      provenanceReason: view.reason,
      resorts: new Set(inv.rates.map((r) => r.resortSlug)).size,
      rateRows: inv.rates.length,
      availabilityDays: inv.availability.length,
      transfers: inv.transfers.length,
      imports: inv.imports.length,
    }),
    5_000
  );
}

interface InventoryIndex {
  availByKey: Map<string, DailyAvailability>;
  ratesBySlug: Map<string, RatePeriod[]>;
}

function buildIndexes(inv: InventoryData): InventoryIndex {
  return cached(
    `index:${inv.version}`,
    () => {
      const availByKey = new Map<string, DailyAvailability>();
      for (const a of inv.availability) availByKey.set(AVAIL_KEY(a.resortSlug, a.roomCode, a.date), a);
      const ratesBySlug = new Map<string, RatePeriod[]>();
      for (const r of inv.rates) {
        const list = ratesBySlug.get(r.resortSlug) ?? [];
        list.push(r);
        ratesBySlug.set(r.resortSlug, list);
      }
      return { availByKey, ratesBySlug };
    },
    30_000
  );
}

function cellNumber(cell: RateCell | undefined): number {
  return typeof cell === 'number' ? cell : 0;
}

function rateNumber(cells: Array<RateCell | undefined>): number {
  let min = 0;
  for (const c of cells) {
    const v = cellNumber(c);
    if (v > 0 && (min === 0 || v < min)) min = v;
  }
  return min;
}

/**
 * Lowest nightly rate for a resort, or null when no verified price exists.
 *
 * Returns null unless the inventory provenance is VERIFIED_IMPORT. Structural
 * data is still available to admin views via getInventory(); this is the
 * customer-facing accessor and it will not surface unverified numbers.
 */
export function getLowestNightly(slug: string): number | null {
  const inv = getInventory();
  if (!isPriceVerified(inv)) return null;
  return cached(
    `lowest:${slug}:${inv.version}`,
    () => {
      const rates = inv.rates.filter((r) => r.resortSlug === slug);
      let min = 0;
      for (const r of rates) {
        const v = rateNumber([r.sgl, r.dbl, r.tpl]);
        if (v > 0 && (min === 0 || v < min)) min = v;
      }
      return min === 0 ? null : min;
    },
    15_000
  );
}

export interface RateRow {
  period: string;
  code: string;
  meal: string;
  sgl: RateCell;
  dbl: RateCell;
  tpl: RateCell;
  qtrp: RateCell;
  ext: RateCell;
  child: RateCell;
  infant: RateCell;
  /** How many rate periods matched. >1 means the periods overlap. */
  candidateCount: number;
  /**
   * True when more than one period matched and the lowest was chosen. Surfaced
   * rather than applied silently, so an overlapping contract can be reviewed.
   */
  ambiguous: boolean;
  /** The competing periods, for review UIs. */
  candidates?: Array<{ id: string; validFrom: string; validTo: string; dbl: RateCell; sgl: RateCell }>;
}

/**
 * A single rate row for booking, or null when there is no verified price.
 *
 * Suppressed unless provenance is VERIFIED_IMPORT, matching getLowestNightly.
 */
export function getRateRow(
  slug: string,
  code: string,
  meal: string,
  periodLabel?: string
): RateRow | null {
  const inv = getInventory();
  if (!isPriceVerified(inv)) return null;
  const pool = inv.rates.filter(
    (r) =>
      r.resortSlug === slug &&
      r.roomCode === code &&
      (!meal || r.mealCode.toLowerCase() === meal.toLowerCase())
  );
  if (pool.length === 0) return null;

  const wanted = periodLabel ? parsePeriodLabel(periodLabel) : null;
  let candidates = pool.filter(
    (r) =>
      (periodLabel && r.sourcePeriod === periodLabel) ||
      (wanted && r.validFrom === wanted.from && r.validTo === wanted.to)
  );
  if (candidates.length === 0 && wanted) {
    candidates = pool.filter((r) => r.validFrom === wanted.from && r.validTo === wanted.to);
  }
  if (candidates.length === 0) return null;

  const ranked = [...candidates].sort((a, b) => {
    const ba = rateNumber([a.dbl, a.sgl]);
    const bb = rateNumber([b.dbl, b.sgl]);
    return ba - bb;
  });
  const best = ranked[0];
  const ambiguous = ranked.length > 1;

  return {
    period: best.sourcePeriod ?? periodLabel ?? best.validFrom,
    code: best.roomCode,
    meal: best.mealCode,
    sgl: best.sgl,
    dbl: best.dbl,
    tpl: best.tpl,
    qtrp: best.qtrp,
    ext: best.ext,
    child: best.child,
    infant: best.infant,
    candidateCount: ranked.length,
    ambiguous,
    candidates: ambiguous
      ? ranked.map((r) => ({ id: r.id, validFrom: r.validFrom, validTo: r.validTo, dbl: r.dbl, sgl: r.sgl }))
      : undefined,
  };
}

export interface TransferResult {
  id: string;
  mode: string;
  periodLabel: string | null;
  adult: PriceValue;
  child: PriceValue;
  currency: string;
  /** Null when the operator did not quote it, so nothing is added to a total. */
  adultAmount: number | null;
  childAmount: number | null;
}

/** Find a transfer by resort, optionally narrowed to a mode. */
export function getTransfer(slug: string, mode?: string): TransferResult | null {
  const inv = getInventory();
  if (!isPriceVerified(inv)) return null;
  const wanted = mode ? mode.trim().toLowerCase() : null;
  const t = inv.transfers.find(
    (x) => x.resortSlug === slug && (!wanted || x.mode.toLowerCase() === wanted)
  );
  if (!t) return null;
  return {
    id: t.id,
    mode: t.mode,
    periodLabel: t.periodLabel,
    adult: t.adult,
    child: t.child,
    currency: t.currency,
    adultAmount: pricedAmount(t.adult),
    childAmount: pricedAmount(t.child),
  };
}

export interface AvailabilityDay {
  date: string;
  roomType: string;
  available: boolean;
  singleRate: number;
  status: AvailabilityStatus;
  transferRate: number;
}

export interface AvailabilitySearchResult {
  resort: string;
  from: string;
  to: string;
  nights: number;
  days: AvailabilityDay[];
  available: boolean;
  minNightly: number;
  minTotal: number;
  /** False when provenance withheld prices; minNightly/minTotal are then 0. */
  priceVisible: boolean;
}

export interface SearchRequest {
  resortSlug: string;
  from: string;
  to: string;
  guests?: number;
}

function rateForDate(slugsRates: RatePeriod[], roomCode: string, date: string, guests: number): RatePeriod | undefined {
  const covering = slugsRates.filter(
    (r) => r.roomCode === roomCode && r.validFrom <= date && date <= r.validTo
  );
  if (covering.length === 0) return undefined;
  const cellsOf = (r: RatePeriod) => (guests >= 2 ? [r.dbl, r.tpl] : [r.sgl, r.dbl]);
  return [...covering].sort((a, b) => rateNumber(cellsOf(a)) - rateNumber(cellsOf(b)))[0];
}

const SELLABLE: AvailabilityStatus[] = ['AVAILABLE', 'ON_REQUEST'];

/**
 * Availability search. Dates and status are structural and always returned;
 * every numeric price field is zeroed unless provenance is VERIFIED_IMPORT, so
 * an unverified dataset can still show "available" without inventing a price.
 */
export function searchAvailability(req: SearchRequest): AvailabilitySearchResult {
  const inv = getInventory();
  const priceVisible = isPriceVerified(inv);
  const { availByKey, ratesBySlug } = buildIndexes(inv);
  const guests = req.guests ?? 2;
  const dates = dateRange(req.from, req.to);
  const rates = ratesBySlug.get(req.resortSlug) ?? inv.rates.filter((r) => r.resortSlug === req.resortSlug);
  const rooms = Array.from(new Set(inv.availability.filter((a) => a.resortSlug === req.resortSlug).map((a) => a.roomCode)));
  const transfer = inv.transfers.find((t) => t.resortSlug === req.resortSlug);
  const transferAdult = transfer ? pricedAmount(transfer.adult) : null;
  const transferRate = priceVisible ? (transferAdult ?? 0) : 0;

  const days: AvailabilityDay[] = [];
  const lowestPerNight: number[] = [];
  for (const date of dates) {
    const night: AvailabilityDay[] = [];
    let nightRate = 0;
    for (const roomCode of rooms) {
      const avail = availByKey.get(AVAIL_KEY(req.resortSlug, roomCode, date));
      if (!avail || !SELLABLE.includes(avail.status)) continue;
      const rateRow = rateForDate(rates, roomCode, date, guests);
      if (!rateRow) continue;
      const r = priceVisible ? rateNumber(guests >= 2 ? [rateRow.dbl, rateRow.tpl] : [rateRow.sgl, rateRow.dbl]) : 0;
      night.push({
        date,
        roomType: roomCode,
        available: true,
        singleRate: r,
        status: avail.status,
        transferRate,
      });
      if (nightRate === 0 || (r > 0 && r < nightRate)) nightRate = r;
    }
    if (night.length === 0) continue;
    days.push(...night);
    lowestPerNight.push(nightRate);
  }

  const nights = diffDays(req.from, req.to) + 1;
  const covered = new Set(days.map((d) => d.date));
  const available = dates.length === nights && nights > 0 && dates.every((d) => covered.has(d));
  const minNightly = priceVisible && lowestPerNight.length ? Math.min(...lowestPerNight) : 0;
  const minTotal = available ? minNightly * nights : minNightly;

  return {
    resort: req.resortSlug,
    from: req.from,
    to: req.to,
    nights,
    days,
    available,
    minNightly,
    minTotal,
    priceVisible,
  };
}

export interface NightAvailability {
  slug: string;
  available: boolean;
  minNightly: number;
  missingDates: string[];
  priceVisible: boolean;
}

export function searchForNights(req: {
  resortSlug: string;
  from: string;
  nights: number;
  guests?: number;
}): NightAvailability {
  const to = addDaysTo(req.from, req.nights);
  const result = searchAvailability({
    resortSlug: req.resortSlug,
    from: req.from,
    to,
    guests: req.guests,
  });
  const covered = new Set(result.days.map((d) => d.date));
  const missingDates = dateRange(req.from, to).filter((d) => !covered.has(d));
  return {
    slug: req.resortSlug,
    available: result.available,
    minNightly: result.minNightly,
    missingDates,
    priceVisible: result.priceVisible,
  };
}

export interface ResortSearchResult {
  slug: string;
  available: boolean;
  from: string;
  to: string;
  nights: number;
  minNightly: number;
  minTotal: number;
  sellableDays: number;
  priceVisible: boolean;
}

export function searchAll(req: Omit<SearchRequest, 'resortSlug'>): ResortSearchResult[] {
  const inv = getInventory();
  const slugs = Array.from(new Set(inv.rates.map((r) => r.resortSlug)));
  return slugs
    .map((slug) => {
      const r = searchAvailability({ ...req, resortSlug: slug });
      return {
        slug,
        available: r.available,
        from: r.from,
        to: r.to,
        nights: r.nights,
        minNightly: r.minNightly,
        minTotal: r.minTotal,
        sellableDays: new Set(r.days.map((d) => d.date)).size,
        priceVisible: r.priceVisible,
      };
    })
    .filter((r) => r.sellableDays > 0);
}

function addDaysTo(from: string, nights: number): string {
  const d = new Date(from + 'T00:00:00');
  d.setDate(d.getDate() + nights - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export interface ApplyPatchResult {
  inventory: InventoryData;
  jobSummary: { created: number; updated: number; unchanged: number };
}

export function patchAvailability(
  updates: Array<Pick<DailyAvailability, 'resortSlug' | 'roomCode' | 'date' | 'status' | 'availableRooms'>>
): ApplyPatchResult {
  const inv: InventoryData = JSON.parse(JSON.stringify(getInventory()));
  const byKey = new Map(inv.availability.map((a) => [AVAIL_KEY(a.resortSlug, a.roomCode, a.date), a]));
  let created = 0;
  let updated = 0;
  let unchanged = 0;
  for (const u of updates) {
    const key = AVAIL_KEY(u.resortSlug, u.roomCode, u.date);
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, {
        resortSlug: u.resortSlug,
        roomCode: u.roomCode,
        date: u.date,
        availableRooms: u.availableRooms,
        status: u.status,
        source: 'MANUAL',
        importId: `manual-${Date.now()}`,
        updatedAt: new Date().toISOString(),
      });
      created += 1;
    } else if (prev.status === u.status && prev.availableRooms === u.availableRooms) {
      unchanged += 1;
      continue;
    } else {
      byKey.set(key, { ...prev, status: u.status, availableRooms: u.availableRooms, updatedAt: new Date().toISOString(), source: 'MANUAL', importId: `manual-${Date.now()}` });
      updated += 1;
    }
  }
  const availability = Array.from(byKey.values());
  // `...inv` carries provenance forward on purpose: hand-editing availability is
  // an operational override, not a re-attestation of the rates. Provenance is
  // re-stamped by the next verified import.
  const result: InventoryData = {
    ...inv,
    version: inv.version + 1,
    lastUpdated: new Date().toISOString(),
    availability,
    imports: [
      {
        id: `manual-${Date.now()}`,
        filename: 'admin-availability',
        source: 'MANUAL',
        sourceType: 'MANUAL',
        sourceId: 'admin',
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        status: updated + created > 0 ? 'SUCCESS' : 'PARTIAL',
        rowsProcessed: updates.length,
        rowsCreated: created,
        rowsUpdated: updated,
        rowsUnchanged: unchanged,
        rowsFailed: 0,
        errors: [],
      },
      ...inv.imports,
    ],
  };
  return { inventory: result, jobSummary: { created, updated, unchanged } };
}

/**
 * Persist an inventory as the active override.
 *
 * On failure this throws {@link InventoryWriteError} and leaves the previous
 * override and cache untouched. A caller can never observe a "successful"
 * publish that did not happen.
 */
export function publishInventory(data: InventoryData): InventoryData {
  writeOverride(data);
  invalidate();
  return getInventory();
}

export function resetToArtifact(): InventoryData {
  try {
    localStorage.removeItem(INVENTORY_STORAGE_KEY);
  } catch {
    // ignore
  }
  invalidate();
  return getBaselineInventory();
}

export const clientVersion = 'phase-1';