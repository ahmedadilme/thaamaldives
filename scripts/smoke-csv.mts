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
  result.inventory.transfers.length === 2 &&
  (result.inventory.transfers.find((t) => t.resortSlug === 'ocean-breeze-maafushi')?.adult ?? 0) === 15 &&
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
  templateResult.inventory.transfers.length === 2 &&
  templateResult.inventory.availability.some(
    (a) => a.resortSlug === 'coral-sands-male' && a.date === '2026-12-31'
  );

console.log('template      =', tj.status, '· processed', tj.rowsProcessed, '· failed', tj.rowsFailed, '· rates', templateResult.inventory.rates.length, '· transfers', templateResult.inventory.transfers.length);

console.log(ok && templateOk ? 'SMOKE OK' : 'SMOKE FAIL');
if (!(ok && templateOk)) process.exit(1);