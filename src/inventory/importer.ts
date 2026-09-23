import {
  AVAIL_KEY,
  RATE_ID,
  toRateCell,
  toAvailabilityStatus,
  isNumericRate,
  type AvailabilityStatus,
  type DailyAvailability,
  type ImportError,
  type ImportJob,
  type InventoryData,
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

    newRates.push({
      id: RATE_ID(property.slug, roomCode, mealCode, from),
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
    });

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

    const transferAdult = toNumberOrNull(take('Transfer Adult'));
    if (transferAdult !== null && !transferSeen.has(property.slug)) {
      transferSeen.add(property.slug);
      const transferChild = toNumberOrNull(take('Transfer Child'));
      newTransfers.push({
        resortSlug: property.slug,
        adult: transferAdult,
        child: transferChild,
        currency,
        source,
        importId,
      });
    }
  }

  const rateBase = (r: RatePeriod) => `${r.resortSlug}__${r.roomCode}__${r.mealCode}__${r.validFrom}`;
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
        id: RATE_ID(property.slug, roomCode, mealCode, range.from),
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

    const transfer = property.contract.transfers?.[0];
    if (transfer && !transferSeen.has(property.slug)) {
      transferSeen.add(property.slug);
      transfers.push({
        resortSlug: property.slug,
        adult: toNumberOrNull(Array.isArray(transfer.adult) ? transfer.adult[0] : transfer.adult) ?? 0,
        child: toNumberOrNull(Array.isArray(transfer.child) ? transfer.child[0] : transfer.child),
        currency,
        source,
        importId,
      });
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