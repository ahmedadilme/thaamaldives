export type RateCell = number | 'On Request' | 'N/A' | 'FOC';

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

export interface TransferRate {
  resortSlug: string;
  adult: number;
  child: number | null;
  currency: string;
  source: string;
  importId: string;
}

export interface ImportError {
  rowNumber: number;
  field: string;
  message: string;
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
  rates: RatePeriod[];
  availability: DailyAvailability[];
  transfers: TransferRate[];
  imports: ImportJob[];
}

export interface InventoryManifest {
  version: number;
  lastUpdated: string;
  source: string;
  rateRows: number;
  availabilityDays: number;
  transfers: number;
  imports: number;
}

export const DEFAULT_CURRENCY = 'USD';
export const INVENTORY_STORAGE_KEY = 'thaa.inventory.v1';
export const INVENTORY_VERSION = 1;

export const RATE_ID = (resort: string, room: string, meal: string, from: string) =>
  `${resort}__${room}__${meal}__${from}`;

export const AVAIL_KEY = (resort: string, room: string, date: string) => `${resort}__${room}__${date}`;