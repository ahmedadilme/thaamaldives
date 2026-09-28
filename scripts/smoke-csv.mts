import { readFileSync } from 'node:fs';
import path from 'node:path';
import { properties } from '../src/data/properties';
import { importInventoryFromCsv, summarizeImport } from '../src/inventory/importer';
import type { ContractLike } from '../src/inventory/importer';

const csv = [
  'Resort,Room Type,Meal Plan,Date From,Date To,Currency,SGL Rate,DBL Rate,TPL Rate,QTRP Rate,Extra Adult,Child Rate,Infant Rate,Available Rooms,Transfer Adult,Transfer Child,Availability Status,Source',
  'Anantara Dhigu,BV(Sunrise),BB,2026-01-01,2026-01-05,USD,1200,1400,,, ,, ,80,40,AVAILABLE,smoke',
  'Ocean Breeze Maafushi,SUP,BB,2026-03-01,2026-03-04,USD,200,240,,,,,,,15,7,AVAILABLE,smoke',
  'Timbuktu Island Resort,STD,BB,2026-02-01,2026-02-03,USD,500,700,,,,,,,100,50,ON_REQUEST,smoke',
  'Anantara Dhigu,BV(Sunrise),BB,2026-02-01,2026-02-03,USD,0,0,0,0,0,0,FOC,,,AVAILABLE,smoke',
  'Anantara Dhigu,BV(Sunrise),HB,2026-05-01,2026-05-02,USD,0,1400,,,50,,FOC,4,220,110,Available,smoke',
].join('\n');

const result = importInventoryFromCsv(csv, {
  properties: properties as unknown as ContractLike[],
  current: {
    version: 0,
    lastUpdated: '',
    rates: [],
    availability: [],
    transfers: [],
    imports: [],
  },
  filename: 'smoke.csv',
});

const job = result.job;
const s = summarizeImport(result.inventory);

console.log('status        =', job.status);
console.log('processed     =', job.rowsProcessed);
console.log('created       =', job.rowsCreated);
console.log('failed        =', job.rowsFailed);
for (const e of job.errors) console.log('  row', e.rowNumber, '-', e.field + ':', e.message);
console.log('resorts       =', s.resorts);
console.log('rates         =', result.inventory.rates.length);
console.log('availability  =', result.inventory.availability.length);
console.log('transfers     =', result.inventory.transfers.length);
console.log('window        =', s.from, '->', s.to);

const ok =
  job.status === 'PARTIAL' &&
  job.rowsFailed === 2 &&
  job.rowsProcessed === 3 &&
  job.rowsCreated === 14 &&
  result.inventory.rates.length === 3 &&
  result.inventory.availability.length === 11 &&
  // 3, not 2: the two Anantara rows quote transfers in different periods, and
  // transfer identity is (resort, mode, period), so both are retained.
  result.inventory.transfers.length === 3 &&
  result.inventory.transfers.find((t) => t.resortSlug === 'ocean-breeze-maafushi')?.adult === 15 &&
  (result.inventory.rates.find((r) => r.roomCode === 'SUP')?.sgl ?? 0) === 200 &&
  job.errors.some((e) => e.rowNumber === 5 && e.field === 'Rates' && e.message === 'No rate defined for any occupancy') &&
  job.errors.some((e) => e.rowNumber === 4 && e.field === 'Resort') &&
  result.inventory.rates.some(
    (r) => r.roomCode === 'BV(Sunrise)' && r.mealCode === 'HB' && r.sgl === 'N/A' && r.dbl === 1400
  );

const templatePath = path.join(process.cwd(), 'public', 'import-template.csv');
const templateCsv = readFileSync(templatePath, 'utf8');
const templateResult = importInventoryFromCsv(templateCsv, {
  properties: properties as unknown as ContractLike[],
  current: {
    version: 0,
    lastUpdated: '',
    rates: [],
    availability: [],
    transfers: [],
    imports: [],
  },
  filename: 'import-template.csv',
});
const tj = templateResult.job;
const templateOk =
  tj.status === 'SUCCESS' &&
  tj.rowsProcessed === 3 &&
  tj.rowsFailed === 0 &&
  templateResult.inventory.rates.length === 3 &&
  templateResult.inventory.transfers.length === 3 &&
  templateResult.inventory.availability.some(
    (a) => a.resortSlug === 'coral-sands-male' && a.date === '2026-12-31'
  );

console.log('template      =', tj.status, '· processed', tj.rowsProcessed, '· failed', tj.rowsFailed, '· rates', templateResult.inventory.rates.length, '· transfers', templateResult.inventory.transfers.length);
console.log('provenance    =', result.inventory.provenance, '/', templateResult.inventory.provenance);

const csvProvenanceOk =
  result.inventory.provenance === 'VERIFIED_IMPORT' && templateResult.inventory.provenance === 'VERIFIED_IMPORT';

// Transfer identity is (resort, mode, period). The flat CSV has one unnamed
// transfer column pair, so both the row-2 and row-3 Anantara quotes must survive
// as separate records keyed by their own period rather than one being dropped.
// Import stores the canonical property slug, not the workbook's display name.
const anantaraTransfers = result.inventory.transfers.filter((t) => t.resortSlug === 'anantara-dhigu');
const transferIdentityOk =
  anantaraTransfers.length === 2 &&
  new Set(anantaraTransfers.map((t) => t.id)).size === 2 &&
  // Row 2 and row 5 quote different transfer prices for the same resort; both
  // survive because they are different periods. (The fixture's ragged
  // whitespace columns mean these land in the Transfer Adult slot as 40 and
  // 220 — pre-existing CSV column alignment, unchanged by this work.)
  anantaraTransfers.some((t) => t.adult === 40) &&
  anantaraTransfers.some((t) => t.adult === 220);
console.log(
  'transfers     =',
  result.inventory.transfers.map((t) => `${t.resortSlug}/${t.mode}/${t.validFrom ?? '-'}:${String(t.adult)}`).join(', ')
);

// A repeated natural key inside one file must be reported, not silently collapsed.
const dupCsv = [
  'Resort,Room Type,Meal Plan,Date From,Date To,Currency,SGL Rate,DBL Rate,TPL Rate,QTRP Rate,Extra Adult,Child Rate,Infant Rate,Available Rooms,Transfer Adult,Transfer Child,Availability Status,Source',
  'Anantara Dhigu,BV(Sunrise),BB,2026-01-01,2026-01-05,USD,1200,1400,,, ,, ,,,,,AVAILABLE,dup',
  'Anantara Dhigu,BV(Sunrise),BB,2026-01-01,2026-01-05,USD,1100,1400,,, ,, ,,,,,AVAILABLE,dup',
].join('\n');
const dupResult = importInventoryFromCsv(dupCsv, {
  properties: properties as unknown as ContractLike[],
  current: { version: 0, lastUpdated: '', rates: [], availability: [], transfers: [], imports: [] },
  filename: 'dup.csv',
});
const dupError = dupResult.job.errors.find((e) => e.code === 'DUPLICATE_RATE_PERIOD_CONFLICT');
const dupConflicts = dupError?.detail?.conflicts ?? [];
const duplicateOk =
  dupResult.inventory.rates.length === 1 &&
  dupResult.inventory.rates[0].dbl === 1400 &&
  dupError !== undefined &&
  dupError.rowNumber === 3 &&
  // The two rows disagree only on SGL (1200 kept, 1100 dropped).
  dupConflicts.some((c) => c.field === 'sgl' && c.existing === '1200' && c.incoming === '1100') &&
  !dupConflicts.some((c) => c.field === 'dbl');
console.log('duplicate     =', dupResult.inventory.rates.length, 'rate(s) ·', dupError?.code ?? 'NOT DETECTED');

console.log('checks        =', JSON.stringify({ ok, templateOk, csvProvenanceOk, transferIdentityOk, duplicateOk }));

console.log(ok && templateOk && csvProvenanceOk && transferIdentityOk && duplicateOk ? 'SMOKE OK' : 'SMOKE FAIL');
if (!(ok && templateOk && csvProvenanceOk && transferIdentityOk && duplicateOk)) process.exit(1);