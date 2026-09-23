import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { properties } from '../src/data/properties';
import { seedInventory, summarizeImport } from '../src/inventory/importer';
import type { InventoryManifest } from '../src/inventory/schema';

const dir = resolve(process.cwd(), 'src/inventory/artifacts');
mkdirSync(dir, { recursive: true });

const inventory = seedInventory(properties, {
  source: 'EXCEL',
  sourceId: 'contract_workbook_2025_2026',
  importId: 'seed-1',
});

const summary = summarizeImport(inventory);

const manifest: InventoryManifest = {
  version: inventory.version,
  lastUpdated: inventory.lastUpdated,
  source: 'EXCEL · contract_workbook_2025_2026',
  rateRows: inventory.rates.length,
  availabilityDays: inventory.availability.length,
  transfers: inventory.transfers.length,
  imports: inventory.imports.length,
};

writeFileSync(resolve(dir, 'inventory.json'), JSON.stringify(inventory), 'utf8');
writeFileSync(resolve(dir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

console.log('[seed] wrote src/inventory/artifacts/inventory.json');
console.log('[seed] wrote src/inventory/artifacts/manifest.json');
console.log(
  `[seed] ${summary.resorts} resorts · ${summary.rooms} room/board keys · rates=${inventory.rates.length} · availabilityDays=${inventory.availability.length} · transfers=${inventory.transfers.length}`
);
console.log(`[seed] date range ${summary.from || '-'} → ${summary.to || '-'}`);