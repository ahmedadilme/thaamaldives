import { describe, expect, it } from 'vitest';
import {
  auditMapping,
  auditMappingSet,
  auditResortMappings,
  isAutoAcceptable,
  normalizeLabel,
  summariseMappingReport,
  type CanonicalCode,
} from '../src/inventory/mapping';

const rooms: CanonicalCode[] = [
  { code: 'BV', name: 'Beach Villa' },
  { code: 'BVSR', name: 'Beach Villa Sunrise' },
  { code: 'WV', name: 'Water Villa' },
  { code: 'WVS', name: 'Water Villa Sunrise' },
  { code: 'OV', name: 'Ocean Villa' },
];

const meals: CanonicalCode[] = [
  { code: 'BB', name: 'Breakfast Only' },
  { code: 'HB', name: 'Half Board' },
  { code: 'FB', name: 'Full Board' },
  { code: 'AI', name: 'All Inclusive' },
];

describe('normalizeLabel', () => {
  it('is case and punctuation insensitive', () => {
    expect(normalizeLabel('Beach Villa (Sunrise)')).toBe('beachvillasunrise');
    expect(normalizeLabel('  B.V.S.R. ')).toBe('bvsr');
    expect(normalizeLabel('Half-Board')).toBe('halfboard');
    expect(normalizeLabel(undefined)).toBe('');
  });
});

describe('auditMapping', () => {
  it('reports EXACT for a literal code match', () => {
    const a = auditMapping('BV', rooms);
    expect(a.status).toBe('EXACT');
    expect(a.candidateCanonicalCodes).toEqual(['BV']);
    expect(isAutoAcceptable(a.status)).toBe(true);
  });

  it('reports NORMALIZED_EXACT for case and punctuation variants', () => {
    expect(auditMapping('b.v.', rooms).status).toBe('NORMALIZED_EXACT');
    expect(auditMapping('Beach Villa (Sunrise)', rooms).status).toBe('NORMALIZED_EXACT');
    expect(auditMapping('Half Board', meals).status).toBe('NORMALIZED_EXACT');
  });

  it('reports AMBIGUOUS rather than guessing between similar codes', () => {
    // "Villa Sunrise" normalises into both BVSR and WVS.
    const a = auditMapping('villa sunrise', rooms);
    expect(a.status).toBe('AMBIGUOUS');
    expect(a.candidateCanonicalCodes).toEqual(['BVSR', 'WVS']);
    expect(isAutoAcceptable(a.status)).toBe(false);
  });

  it('refuses substring matching on short labels instead of guessing', () => {
    const a = auditMapping('V', rooms);
    expect(a.status).toBe('UNMAPPED');
    expect(a.reason).toMatch(/shorter than/i);
  });

  it('marks a single-substring match CANDIDATE, requiring review', () => {
    // "WVS Deluxe" extends the WVS code, so it is contained in exactly one
    // canonical entry but is not equal to it — review-only, never automatic.
    const a = auditMapping('WVS Deluxe', rooms);
    expect(a.status).toBe('CANDIDATE');
    expect(a.candidateCanonicalCodes).toEqual(['WVS']);
    expect(isAutoAcceptable(a.status)).toBe(false);
  });

  it('reports UNMAPPED with a reason for unknown labels', () => {
    const a = auditMapping('Overwater Bungalow', rooms);
    expect(a.status).toBe('UNMAPPED');
    expect(a.reason).toBeTruthy();
  });

  it('handles empty labels and an empty canonical set', () => {
    expect(auditMapping('', rooms).status).toBe('UNMAPPED');
    expect(auditMapping('BV', []).status).toBe('UNMAPPED');
  });

  it('is deterministic', () => {
    const runs = Array.from({ length: 5 }, () => auditMapping('beach villa sunrise', rooms));
    expect(new Set(runs.map((r) => r.status)).size).toBe(1);
  });
});

describe('auditMappingSet', () => {
  it('de-duplicates repeated workbook labels and tallies by status', () => {
    const g = auditMappingSet(['BV', 'b.v.', 'BV', 'bvsr', 'nonsense'], rooms, 'room');
    // 'BV' appears twice and collapses to one audit entry.
    expect(g.results).toHaveLength(4);
    // Only 'BV' is a literal code match; 'bvsr' and 'b.v.' both need
    // normalisation, and 'nonsense' fails outright.
    expect(g.counts.EXACT).toBe(1);
    expect(g.counts.NORMALIZED_EXACT).toBe(2);
    expect(g.counts.UNMAPPED).toBe(1);
  });
});

describe('auditResortMappings', () => {
  it('audits rooms and meals independently', () => {
    const report = auditResortMappings({
      resort: 'anantara-dhigu',
      roomValues: ['BV', 'Beach Villa (Sunrise)', 'Mystery Hut'],
      mealValues: ['BB', 'Half Board', 'All Inclusive'],
      rooms,
      mealPlans: meals,
    });
    expect(report.resort).toBe('anantara-dhigu');
    // A room failure must not mask meal results, and vice versa.
    expect(report.rooms.results.some((r) => r.status === 'UNMAPPED')).toBe(true);
    expect(report.meals.results.every((r) => isAutoAcceptable(r.status))).toBe(true);

    const summary = summariseMappingReport([report]);
    expect(summary.totals.UNMAPPED).toBe(1);
    expect(summary.needsReview.length).toBe(1);
    expect(summary.autoAcceptable.length).toBeGreaterThan(0);
  });
});
