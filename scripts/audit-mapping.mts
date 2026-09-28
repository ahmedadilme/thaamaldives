import { properties } from '../src/data/properties';
import { getRateRow, getLowestNightly, getTransfer, searchAvailability, publishInventory } from '../src/inventory/client';
import { isPriceVerified, provenanceView } from '../src/inventory/provenance';
import { seedInventory } from '../src/inventory/importer';
import type { CanonicalCode } from '../src/inventory/mapping';
import { auditResortMappings, summariseMappingReport } from '../src/inventory/mapping';
import type { ContractLike } from '../src/inventory/importer';

/* ------------------------------------------------------------------------ */
/*  1. Provenance gate — seeded data must publish no prices                    */
/* ------------------------------------------------------------------------ */

const seeded = seedInventory(properties as unknown as ContractLike[], {
  source: 'SEEDED',
  sourceId: 'audit-fixture',
});

console.log('provenance    =', seeded.provenance);
console.log('gate closed   =', !isPriceVerified(seeded), '(expected true)');
console.log('reason        =', provenanceView(seeded).reason);

/* ------------------------------------------------------------------------ */
/*  2. Public price paths                                                    */
/* ------------------------------------------------------------------------ */

const paths: Array<{ path: string; value: unknown }> = [
  { path: 'getLowestNightly', value: getLowestNightly('anantara-dhigu') },
  { path: 'getRateRow', value: getRateRow('anantara-dhigu', 'BV(Sunrise)', 'BB', undefined) },
  { path: 'getTransfer', value: getTransfer('anantara-dhigu') },
];

const search = searchAvailability({
  resortSlug: 'anantara-dhigu',
  from: '2026-02-01',
  to: '2026-02-05',
});
paths.push({ path: 'searchAvailability.minNightly', value: search.minNightly });
paths.push({ path: 'searchAvailability.minTotal', value: search.minTotal });
paths.push({ path: 'searchAvailability.priceVisible', value: search.priceVisible });

console.log('\npublic paths (seeded / unverified):');
let leaks = 0;
for (const p of paths) {
  const numeric = typeof p.value === 'number' && p.value > 0;
  if (numeric) leaks += 1;
  console.log(
    `  ${numeric ? 'LEAK' : 'ok  '}  ${p.path} = ${JSON.stringify(p.value)}`
  );
}
console.log(leaks === 0 ? '  → no numeric prices escaped' : `  → ${leaks} LEAK(S)`);

/* ------------------------------------------------------------------------ */
/*  3. Room and meal mapping audit                                           */
/* ------------------------------------------------------------------------ */

const canonical: CanonicalCode[] = [
  { code: 'BV(Sunrise)', name: 'Beach Villa Sunrise' },
  { code: 'BV', name: 'Beach Villa' },
  { code: 'WV', name: 'Water Villa' },
  { code: 'WVSR', name: 'Water Villa Sunrise' },
];

/**
 * Room and meal labels observed in the workbook. Supplied here as literals for
 * this audit only — no xlsx parsing is implemented in this task.
 */
const observed: Record<string, { rooms: string[]; meals: string[] }> = {
  'anantara-dhigu': {
    rooms: ['BV(Sunrise)', 'beach villa sunrise', 'BV', 'Water Villa', 'Beach Pool Villa'],
    meals: ['BB', 'HB', 'FB', 'Half Board', 'All Inclusive'],
  },
  'atmosphere-kanifushi': {
    rooms: ['BV(Sunrise)', 'Water Villa', 'wv', 'Garden Villa'],
    meals: ['BB', 'HB', 'Full Board', 'SAI'],
  },
  'constance-halaveli': {
    rooms: ['BV(Sunrise)', 'Water Villa Sunrise', 'Beachfront bungalow', 'V'],
    meals: ['BB', 'HB', 'FB', 'Half Board'],
  },
  'dhigali-maldives': {
    rooms: ['BV(Sunrise)', 'Water Villa', 'Beach Villa', 'Ocean Villa'],
    meals: ['BB', 'HB', 'Half Board', 'Full Board'],
  },
};

const reports = Object.entries(observed).map(([resort, v]) =>
  auditResortMappings({
    resort,
    roomValues: v.rooms,
    mealValues: v.meals,
    rooms: canonical,
    mealPlans: [
      { code: 'BB', name: 'Breakfast Only' },
      { code: 'HB', name: 'Half Board' },
      { code: 'FB', name: 'Full Board' },
      { code: 'AI', name: 'All Inclusive' },
    ],
  })
);

const summary = summariseMappingReport(reports);

console.log('\nmapping audit:');
console.log('  totals      =', JSON.stringify(summary.totals));
for (const r of reports) {
  console.log(`  ${r.resort}`);
  for (const g of [r.rooms, r.meals]) {
    for (const a of g.results) {
      const mark = a.status === 'EXACT' || a.status === 'NORMALIZED_EXACT' ? 'auto  ' : 'REVIEW';
      console.log(
        `    ${mark}  [${g.kind}] ${JSON.stringify(a.workbookValue)} → ${a.status}${
          a.candidateCanonicalCodes.length ? ` (${a.candidateCanonicalCodes.join(', ')})` : ''
        }`
      );
    }
  }
}
console.log(
  `\n  needs review = ${summary.needsReview.length} of ${
    summary.totals.EXACT +
    summary.totals.NORMALIZED_EXACT +
    summary.totals.CANDIDATE +
    summary.totals.UNMAPPED +
    summary.totals.AMBIGUOUS
  }`
);

/* ------------------------------------------------------------------------ */
/*  4. Write failure                                                         */
/* ------------------------------------------------------------------------ */

const store = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => {
    throw new DOMException('exceeded', 'QuotaExceededError');
  },
  removeItem: (k: string) => store.delete(k),
  clear: () => store.clear(),
  key: () => null,
  length: 0,
};

let threw = false;
let message = '';
try {
  publishInventory(seeded);
} catch (err) {
  threw = true;
  message = err instanceof Error ? err.message : String(err);
}
console.log('\npublish on full storage:');
console.log(`  threw       = ${threw} (expected true)`);
console.log(`  message     = ${message}`);

const ok = seeded.provenance === 'SEEDED' && !isPriceVerified(seeded) && leaks === 0 && threw;
console.log(`\n${ok ? 'AUDIT OK' : 'AUDIT FAIL'}`);
if (!ok) process.exit(1);
