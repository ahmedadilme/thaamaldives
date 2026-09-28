import {
  AVAIL_KEY,
  RATE_ID,
  TRANSFER_KEY,
  toPriceValue,
  toRateCell,
  toAvailabilityStatus,
  isNumericRate,
  type AvailabilityStatus,
  type DailyAvailability,
  type ImportError,
  type ImportJob,
  type InventoryData,
  type RateCell,
  type RatePeriod,
  type TransferRate,
} from './schema';
import {
  parseFlexibleDate,
  parsePeriodLabel,
  dateRange,
  nowISO,
} from '@/lib/dates';
import { parseCSV } from '@/lib/csv';

export interface ContractLike {
  slug: string;
  name: string;
  contract: {
    currency?: string;
    valid?: string;
    periods?: string[];
    rates: Array<Record<string, unknown>>;
    rooms: Array<{ code: string; name?: string }>;
    transfers?: Array<{ type?: string; adult?: unknown; child?: unknown }>;
  };
}

export const CSV_COLUMNS = [
  'Resort',
  'Room Type',
  'Meal Plan',
  'Date From',
  'Date To',
  'Currency',
  'SGL Rate',
  'DBL Rate',
  'TPL Rate',
  'QTRP Rate',
  'Extra Adult',
  'Child Rate',
  'Infant Rate',
  'Available Rooms',
  'Transfer Adult',
  'Transfer Child',
  'Availability Status',
  'Source',
] as const;

export type CsvColumn = (typeof CSV_COLUMNS)[number];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');

/** The rate fields compared when deciding whether two rows are the same period. */
const RATE_VALUE_FIELDS = ['sgl', 'dbl', 'tpl', 'qtrp', 'ext', 'child', 'infant'] as const;

/**
 * Describe how two same-key rows disagree.
 * Returns an empty array when the rows are byte-identical in every rate field.
 */
function rateConflicts(
  a: { [K in (typeof RATE_VALUE_FIELDS)[number]]: RateCell },
  b: { [K in (typeof RATE_VALUE_FIELDS)[number]]: RateCell }
): Array<{ field: string; existing: string; incoming: string }> {
  const out: Array<{ field: string; existing: string; incoming: string }> = [];
  for (const f of RATE_VALUE_FIELDS) {
    const av = a[f];
    const bv = b[f];
    if (String(av) !== String(bv)) out.push({ field: f, existing: String(av), incoming: String(bv) });
  }
  return out;
}

export function matchResort(name: string, properties: ContractLike[]): ContractLike | undefined {
  const n = norm(name);
  if (!n) return undefined;
  return properties.find((p) => norm(p.name) === n || norm(p.slug) === n || norm(p.name).includes(n) || n.includes(norm(p.slug)));
}

export function matchRoom(codeOrName: string, c: ContractLike): { code: string } | undefined {
  const n = norm(codeOrName);
  if (!n) return undefined;
  const room = c.contract.rooms.find((r) => norm(r.code) === n || (r.name && norm(r.name) === n));
  return room ?? c.contract.rooms.find((r) => norm(r.code).includes(n) || (r.name && norm(r.name).includes(n)));
}

function rateCount(cell: unknown): boolean {
  const c = Array.isArray(cell) ? cell[0] : cell;
  if (typeof c === 'number') return c > 0;
  if (typeof c !== 'string') return false;
  const t = c.trim().toLowerCase();
  return t !== '' && t !== 'n/a' && t !== 'na' && t !== '-';
}

function cellIsOnRequest(cell: unknown): boolean {
  const c = Array.isArray(cell) ? cell[0] : cell;
  return String(c ?? '').toLowerCase().includes('on request');
}

function resolveStatus(
  explicit: ReturnType<typeof toAvailabilityStatus>,
  availableRooms: number | null,
  hasOnRequestRate: boolean,
  hasAnyRate: boolean
): AvailabilityStatus {
  if (explicit) return explicit;
  if (hasOnRequestRate) return 'ON_REQUEST';
  if (availableRooms !== null) return availableRooms > 0 ? 'AVAILABLE' : 'SOLD_OUT';
  return hasAnyRate ? 'AVAILABLE' : 'ON_REQUEST';
}

function toNumberOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(typeof v === 'number' ? v : String(v).replace(/[,\s]/g, ''));
  return Number.isFinite(n) ? n : null;
}

export interface ImportResult {
  inventory: InventoryData;
  job: ImportJob;
}

export function importInventoryFromCsv(
  text: string,
  options: {
    properties: ContractLike[];
    current: InventoryData;
    filename?: string;
    source?: string;
    sourceId?: string;
    importId?: string;
  }
): ImportResult {
  const {
    properties,
    current,
    filename = 'availability.csv',
    source = 'CSV',
    sourceId = filename,
    importId = String((current.imports[0] ? parseInt(current.imports[0].id, 10) : 0) + 1),
  } = options;

  const rows = parseCSV(text);
  const header = (rows[0] ?? []).map((h) => h.trim().toLowerCase());

  const colIndex = (name: CsvColumn) => {
    const key = name.toLowerCase();
    const idx = header.indexOf(key);
    return idx === -1 ? null : idx;
  };

  const startedAt = nowISO();
  const errors: ImportError[] = [];
  const newRates: RatePeriod[] = [];
  const newAvailability: DailyAvailability[] = [];
  const newTransfers: TransferRate[] = [];
  const transferSeen = new Set<string>();
  /** Natural key → index into newRates, for intra-file duplicate detection. */
  const incomingRateIndex = new Map<string, number>();
  let processed = 0;

  for (let i = 1; i < rows.length; i += 1) {
    const cells = rows[i];
    if (cells.length === 1 && cells[0].trim() === '') continue;
    const rowNumber = i + 1;
    const take = (name: CsvColumn) => {
      const idx = colIndex(name);
      return idx === null ? '' : (cells[idx] ?? '');
    };

    const resortName = take('Resort');
    const property = matchResort(resortName, properties);
    if (!property) {
      errors.push({ rowNumber, field: 'Resort', message: `Unknown resort "${resortName}"` });
      continue;
    }

    const room = matchRoom(take('Room Type'), property);
    if (!room) {
      errors.push({ rowNumber, field: 'Room Type', message: `Unknown room type "${take('Room Type')}" for ${property.name}` });
      continue;
    }

    const mealCode = (take('Meal Plan') || 'BB').trim().toUpperCase();
    const from = parseFlexibleDate(take('Date From'));
    const to = parseFlexibleDate(take('Date To'));
    if (!from || !to) {
      errors.push({ rowNumber, field: 'Date From / Date To', message: 'Invalid date(s)' });
      continue;
    }
    if (to < from) {
      errors.push({ rowNumber, field: 'Date To', message: 'End date is before start date' });
      continue;
    }

    const currency = (take('Currency') || 'USD').trim().toUpperCase();
    const sgl = toRateCell(take('SGL Rate'));
    const dbl = toRateCell(take('DBL Rate'));
    const tpl = toRateCell(take('TPL Rate'));
    const qtrp = toRateCell(take('QTRP Rate'));
    const ext = toRateCell(take('Extra Adult'));
    const child = toRateCell(take('Child Rate'));
    const infant = toRateCell(take('Infant Rate'));

    if (![sgl, dbl, tpl, qtrp, ext, child].some(rateCount) && sgl !== 'On Request' && dbl !== 'On Request') {
      errors.push({ rowNumber, field: 'Rates', message: 'No rate defined for any occupancy' });
      continue;
    }

    const roomCode = room.code;
    const availableRooms = toNumberOrNull(take('Available Rooms'));
    const explicit = toAvailabilityStatus(take('Availability Status'));
    const status = resolveStatus(
      explicit,
      availableRooms,
      cellIsOnRequest(sgl) || cellIsOnRequest(dbl) || cellIsOnRequest(tpl),
      [sgl, dbl, tpl].some(rateCount) || cellIsOnRequest(sgl) || cellIsOnRequest(dbl)
    );

    processed += 1;

    const periodRange = { from, to };

    const candidate: RatePeriod = {
      id: RATE_ID(property.slug, roomCode, mealCode, from, to),
      resortSlug: property.slug,
      roomCode,
      mealCode,
      validFrom: from,
      validTo: to,
      currency,
      sgl,
      dbl,
      tpl,
      qtrp,
      ext,
      child,
      infant,
      source,
      importId,
    };

    // Duplicate natural key inside a single file. The first occurrence wins, but
    // the collision is always recorded with the exact field-level differences
    // so a reviewer can see which of the two rows to trust.
    const priorIndex = incomingRateIndex.get(candidate.id);
    if (priorIndex !== undefined) {
      const existing = newRates[priorIndex];
      const conflicts = rateConflicts(existing, candidate);
      const identical = conflicts.length === 0;
      errors.push({
        rowNumber,
        field: 'Room + Meal + Period',
        code: identical ? 'DUPLICATE_RATE_PERIOD_IDENTICAL' : 'DUPLICATE_RATE_PERIOD_CONFLICT',
        message: identical
          ? `${property.slug} / ${roomCode} / ${mealCode} repeats for ${from} → ${to}; the identical row was ignored.`
          : `${property.slug} / ${roomCode} / ${mealCode} repeats for ${from} → ${to} with different prices; the first row was kept and this one dropped.`,
        detail: {
          resort: property.slug,
          room: roomCode,
          mealPlan: mealCode,
          validFrom: from,
          validTo: to,
          ...(conflicts.length > 0 ? { conflicts } : {}),
        },
      });
    } else {
      incomingRateIndex.set(candidate.id, newRates.length);
      newRates.push(candidate);
    }

    for (const date of dateRange(periodRange.from, periodRange.to)) {
      newAvailability.push({
        resortSlug: property.slug,
        roomCode,
        date,
        availableRooms,
        status,
        source,
        importId,
        updatedAt: startedAt,
      });
    }

    // Transfer identity is (resort, mode, period). The flat CSV has a single
    // unnamed transfer column pair, so the mode is recorded as the operator's
    // default leg and a differing price in a later period is kept as a separate
    // record rather than overwriting the first one seen.
    const transferAdult = toPriceValue(take('Transfer Adult'));
    if (transferAdult !== 'UNPRICED') {
      const mode = 'default';
      const key = TRANSFER_KEY(property.slug, mode, from);
      if (transferSeen.has(key)) {
        errors.push({
          rowNumber,
          field: 'Transfer',
          code: 'DUPLICATE_TRANSFER_PERIOD',
          message: `Transfer for ${property.slug} / ${mode} repeats for ${from} → ${to}; the first row was kept.`,
          detail: { resort: property.slug, validFrom: from, validTo: to },
        });
      } else {
        transferSeen.add(key);
        const transferChild = toPriceValue(take('Transfer Child'));
        newTransfers.push({
          id: key,
          resortSlug: property.slug,
          mode,
          periodLabel: null,
          validFrom: from,
          validTo: to,
          adult: transferAdult,
          child: transferChild,
          currency,
          source,
          importId,
        });
      }
    }
  }

  const rateBase = (r: RatePeriod) => RATE_ID(r.resortSlug, r.roomCode, r.mealCode, r.validFrom, r.validTo);
  const availBase = (a: DailyAvailability) => AVAIL_KEY(a.resortSlug, a.roomCode, a.date);

  const previousRates = new Map(current.rates.map((r) => [rateBase(r), r]));
  const previousAvail = new Map(current.availability.map((a) => [availBase(a), a]));

  let created = 0;
  let updated = 0;
  let unchanged = 0;
  for (const r of newRates) {
    const key = rateBase(r);
    const prev = previousRates.get(key);
    if (!prev) created += 1;
    else if (rateKey(prev) === rateKey(r)) unchanged += 1;
    else updated += 1;
  }
  for (const a of newAvailability) {
    const key = availBase(a);
    const prev = previousAvail.get(key);
    if (!prev) created += 1;
    else if (prev.status === a.status && prev.availableRooms === a.availableRooms) unchanged += 1;
    else updated += 1;
  }

  const inventory: InventoryData = {
    version: current.version + 1,
    lastUpdated: nowISO(),
    // A CSV the operator deliberately uploaded is an explicit, auditable
    // import: it attests the provenance and is the only path that makes prices
    // sellable. This is stamped by the importer, not by a client-side toggle.
    provenance: 'VERIFIED_IMPORT',
    rates: newRates,
    availability: newAvailability,
    transfers: newTransfers,
    imports: [
      {
        id: importId,
        filename,
        source,
        sourceType: source.toUpperCase(),
        sourceId,
        startedAt,
        completedAt: nowISO(),
        status: errors.length > 0 ? 'PARTIAL' : newRates.length + newAvailability.length > 0 ? 'SUCCESS' : 'FAILED',
        rowsProcessed: processed,
        rowsCreated: created,
        rowsUpdated: updated,
        rowsUnchanged: unchanged,
        rowsFailed: errors.length,
        errors,
      },
      ...current.imports,
    ],
  };

  return { inventory, job: inventory.imports[0] };
}

function rateKey(r: { sgl: unknown; dbl: unknown; tpl: unknown; qtrp: unknown; ext: unknown; child: unknown; infant: unknown }) {
  return [r.sgl, r.dbl, r.tpl, r.qtrp, r.ext, r.child, r.infant].map(String).join('|');
}

/** Widest period window declared by a property's contract, used for non-period records. */
function firstPeriodRange(property: ContractLike): { from: string | null; to: string | null } {
  const periods = property.contract.periods ?? [];
  let from: string | null = null;
  let to: string | null = null;
  for (const p of periods) {
    const range = parsePeriodLabel(p);
    if (!range) continue;
    if (range.from && (from === null || range.from < from)) from = range.from;
    if (range.to && (to === null || range.to > to)) to = range.to;
  }
  return { from, to };
}

export interface SeedOptions {
  source?: string;
  sourceId?: string;
  importId?: string;
}

export function seedInventory(properties: ContractLike[], options: SeedOptions = {}): InventoryData {
  const {
    source = 'EXCEL',
    sourceId = 'contract_workbook_2025_2026',
    importId = 'seed-1',
  } = options;

  const startedAt = nowISO();
  const errors: ImportError[] = [];
  const rates: RatePeriod[] = [];
  const availability: DailyAvailability[] = [];
  const transfers: TransferRate[] = [];
  const transferSeen = new Set<string>();
  let processed = 0;

  for (const property of properties) {
    const currency = property.contract.currency || 'USD';
    const validity = parsePeriodLabel(property.contract.valid ?? '');
    for (const row of property.contract.rates) {
      const label = String(row.period ?? '');
      const range = parsePeriodLabel(label) ?? validity;
      if (!range) {
        errors.push({ rowNumber: processed + 1, field: 'Period', message: `Unparseable period "${label}" for ${property.name}` });
        continue;
      }
      processed += 1;
      const code = String(row.code ?? '');
      const room = matchRoom(code, property);
      const roomCode = room?.code ?? code;
      const mealCode = String(row.meal ?? 'BB').trim().toUpperCase();

      const sgl = toRateCell(Array.isArray(row.sgl) ? row.sgl[0] : row.sgl);
      const dbl = toRateCell(Array.isArray(row.dbl) ? row.dbl[0] : row.dbl);
      const tpl = toRateCell(Array.isArray(row.tpl) ? row.tpl[0] : row.tpl);
      const qtrp = toRateCell(Array.isArray(row.qtrp) ? row.qtrp[0] : row.qtrp);
      const ext = toRateCell(Array.isArray(row.ext) ? row.ext[0] : row.ext);
      const child = toRateCell(Array.isArray(row.child) ? row.child[0] : row.child);
      const infant = toRateCell(Array.isArray(row.infant) ? row.infant[0] : row.infant);

      rates.push({
        id: RATE_ID(property.slug, roomCode, mealCode, range.from, range.to),
        resortSlug: property.slug,
        roomCode,
        mealCode,
        validFrom: range.from,
        validTo: range.to,
        currency,
        sgl,
        dbl,
        tpl,
        qtrp,
        ext,
        child,
        infant,
        sourcePeriod: label,
        source,
        importId,
      });

      const status: AvailabilityStatus =
        sgl === 'On Request' || dbl === 'On Request' || tpl === 'On Request'
          ? 'ON_REQUEST'
          : isNumericRate(sgl) || isNumericRate(dbl)
            ? 'AVAILABLE'
            : 'ON_REQUEST';

      for (const date of dateRange(range.from, range.to)) {
        availability.push({
          resortSlug: property.slug,
          roomCode,
          date,
          availableRooms: status === 'AVAILABLE' ? null : null,
          status,
          source,
          importId,
          updatedAt: startedAt,
        });
      }
    }

  // Transfers sit outside the per-period loop, so the seeded record uses the
  // property's overall contract window rather than any single row's period.
  const seededRange = firstPeriodRange(property);
  const transfer = property.contract.transfers?.[0];
  if (transfer) {
    const mode = 'default';
    const key = TRANSFER_KEY(property.slug, mode, seededRange.to ?? null);
    if (!transferSeen.has(key)) {
      transferSeen.add(key);
      transfers.push({
        id: key,
        resortSlug: property.slug,
        mode,
        periodLabel: null,
        validFrom: seededRange.from ?? null,
        validTo: seededRange.to ?? null,
        adult: toPriceValue(Array.isArray(transfer.adult) ? transfer.adult[0] : transfer.adult),
        child: toPriceValue(Array.isArray(transfer.child) ? transfer.child[0] : transfer.child),
        currency,
        source,
        importId,
      });
    }
  }
  }

  const seenAvail = new Set<string>();
  const collapsed: DailyAvailability[] = [];
  for (const a of availability) {
    const key = AVAIL_KEY(a.resortSlug, a.roomCode, a.date);
    if (seenAvail.has(key)) continue;
    seenAvail.add(key);
    collapsed.push(a);
  }

  const job: ImportJob = {
    id: importId,
    filename: sourceId,
    source,
    sourceType: source.toUpperCase(),
    sourceId,
    startedAt,
    completedAt: nowISO(),
    status: errors.length > 0 ? 'PARTIAL' : rates.length > 0 ? 'SUCCESS' : 'FAILED',
    rowsProcessed: processed,
    rowsCreated: rates.length + collapsed.length,
    rowsUpdated: 0,
    rowsUnchanged: 0,
    rowsFailed: errors.length,
    errors,
  };

  return {
    version: 1,
    lastUpdated: nowISO(),
    provenance: 'SEEDED',
    rates,
    availability: collapsed,
    transfers,
    imports: [job],
  };
}

export function summarizeImport(inventory: InventoryData): { resorts: number; rooms: number; from: string; to: string } {
  const resorts = new Set(inventory.rates.map((r) => r.resortSlug)).size;
  const rooms = new Set(inventory.rates.map((r) => `${r.resortSlug}__${r.roomCode}`)).size;
  const dates = inventory.availability.map((a) => a.date);
  const from = dates.length ? dates.reduce((a, b) => (a < b ? a : b)) : '';
  const to = dates.length ? dates.reduce((a, b) => (a > b ? a : b)) : '';
  return { resorts, rooms, from, to };
}