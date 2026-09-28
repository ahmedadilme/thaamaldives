import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { properties } from '../src/data/properties';
import { seedInventory, summarizeImport } from '../src/inventory/importer';
import type { InventoryManifest } from '../src/inventory/schema';

const dir = resolve(process.cwd(), 'src/inventory/artifacts');
mkdirSync(dir, { recursive: true });

// The source label is SEEDED, not EXCEL. These values are generated from the
// hand-written fixtures in src/data, NOT parsed out of data.xlsx, so labelling
// them as a contract import would be a false provenance claim.
const inventory = seedInventory(properties, {
  source: 'SEEDED',
  sourceId: 'generated_from_src_data_fixtures',
  importId: 'seed-1',
});

const summary = summarizeImport(inventory);

const manifest: InventoryManifest = {
  version: inventory.version,
  lastUpdated: inventory.lastUpdated,
  source: 'SEEDED · generated_from_src_data_fixtures (not parsed from data.xlsx)',
  provenance: inventory.provenance ?? 'SEEDED',
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