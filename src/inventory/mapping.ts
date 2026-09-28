/* ------------------------------------------------------------------------ */
/*  Mapping audit — deterministic, never guesses                              */
/* ------------------------------------------------------------------------ */
/**
 * Supplier workbooks label rooms and meal plans inconsistently. This module
 * turns a set of workbook labels into a *report* against the canonical
 * definitions, and never invents a mapping.
 *
 * Only EXACT and NORMALIZED_EXACT are safe to apply automatically. CANDIDATE,
 * UNMAPPED and AMBIGUOUS must be resolved by a human before they can enter
 * live data.
 *
 * The substring tier is deliberately conservative: it is only attempted for
 * labels of at least `minCandidateLength` characters. Short labels like "WV"
 * are substrings of half a dozen room codes, and guessing between them is how
 * a rate ends up attached to the wrong room.
 */

export type MappingStatus = 'EXACT' | 'NORMALIZED_EXACT' | 'CANDIDATE' | 'UNMAPPED' | 'AMBIGUOUS';

export const MAPPING_STATUSES: readonly MappingStatus[] = [
  'EXACT',
  'NORMALIZED_EXACT',
  'CANDIDATE',
  'UNMAPPED',
  'AMBIGUOUS',
];

/** The only statuses that may be applied to live data without human review. */
export const AUTO_ACCEPTABLE: readonly MappingStatus[] = ['EXACT', 'NORMALIZED_EXACT'];

export const isAutoAcceptable = (status: MappingStatus): boolean => AUTO_ACCEPTABLE.includes(status);

export interface CanonicalCode {
  code: string;
  name?: string;
}

export interface MappingAudit {
  workbookValue: string;
  normalizedValue: string;
  candidateCanonicalCodes: string[];
  status: MappingStatus;
  reason: string;
}

export interface MappingOptions {
  /** Minimum length before substring (CANDIDATE) matching is attempted. */
  minCandidateLength?: number;
}

/** Case/punctuation-insensitive key used for all fuzzy comparison. */
export function normalizeLabel(v: unknown): string {
  return String(v ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

/**
 * Audit one workbook label against the canonical codes.
 * Deterministic: the same inputs always produce the same status and reason.
 */
export function auditMapping(
  value: string,
  canonical: readonly CanonicalCode[],
  options: MappingOptions = {}
): MappingAudit {
  const minCandidateLength = options.minCandidateLength ?? 3;
  const workbookValue = String(value ?? '');
  const normalizedValue = normalizeLabel(workbookValue);
  const base = { workbookValue, normalizedValue, candidateCanonicalCodes: [] as string[] };

  if (!normalizedValue) {
    return { ...base, status: 'UNMAPPED', reason: 'Label is empty.' };
  }
  if (canonical.length === 0) {
    return { ...base, status: 'UNMAPPED', reason: 'No canonical codes were supplied for this set.' };
  }

  // Tier 1 — literal match, highest confidence.
  const exact = canonical.filter((c) => c.code === workbookValue);
  if (exact.length === 1) {
    return { ...base, candidateCanonicalCodes: [exact[0].code], status: 'EXACT', reason: 'Matched a canonical code exactly.' };
  }
  if (exact.length > 1) {
    return {
      ...base,
      candidateCanonicalCodes: exact.map((c) => c.code),
      status: 'AMBIGUOUS',
      reason: 'Canonical set contains the same code more than once.',
    };
  }

  // Tier 2 — normalized equality. Checked against codes AND names, because
  // suppliers often use the room's display name in one column and its code in
  // another.
  const normalizedHits = canonical.filter(
    (c) => normalizeLabel(c.code) === normalizedValue || normalizeLabel(c.name) === normalizedValue
  );
  const uniqueNormalized = [...new Set(normalizedHits.map((c) => c.code))];
  if (uniqueNormalized.length === 1) {
    return {
      ...base,
      candidateCanonicalCodes: uniqueNormalized,
      status: 'NORMALIZED_EXACT',
      reason: 'Matched a canonical code or name after case/punctuation normalisation.',
    };
  }
  if (uniqueNormalized.length > 1) {
    return {
      ...base,
      candidateCanonicalCodes: uniqueNormalized.sort(),
      status: 'AMBIGUOUS',
      reason: `Normalised label matches ${uniqueNormalized.length} canonical codes; needs a human decision.`,
    };
  }

  // Tier 3 — substring containment, only for labels long enough to be safe.
  if (normalizedValue.length < minCandidateLength) {
    return {
      ...base,
      status: 'UNMAPPED',
      reason: `No exact match, and the label is shorter than ${minCandidateLength} characters, so substring matching was skipped as unsafe.`,
    };
  }
  const substringHits = canonical.filter((c) => {
    const code = normalizeLabel(c.code);
    const name = normalizeLabel(c.name);
    return (
      (code.length >= minCandidateLength && (code.includes(normalizedValue) || normalizedValue.includes(code))) ||
      (name.length >= minCandidateLength && (name.includes(normalizedValue) || normalizedValue.includes(name)))
    );
  });
  const uniqueSubstring = [...new Set(substringHits.map((c) => c.code))].sort();
  if (uniqueSubstring.length === 1) {
    return {
      ...base,
      candidateCanonicalCodes: uniqueSubstring,
      status: 'CANDIDATE',
      reason: 'No exact match; a single canonical code contains this label. Requires review before use.',
    };
  }
  if (uniqueSubstring.length > 1) {
    return {
      ...base,
      candidateCanonicalCodes: uniqueSubstring,
      status: 'AMBIGUOUS',
      reason: `Label is contained in ${uniqueSubstring.length} canonical codes; cannot be resolved automatically.`,
    };
  }

  return { ...base, status: 'UNMAPPED', reason: 'No canonical code or name resembles this label.' };
}

export interface MappingGroup {
  kind: 'room' | 'meal';
  results: MappingAudit[];
  counts: Record<MappingStatus, number>;
}

export interface MappingReport {
  groups: MappingGroup[];
  totals: Record<MappingStatus, number>;
  /** Everything that must not be auto-applied. */
  needsReview: MappingAudit[];
  autoAcceptable: MappingAudit[];
}

function emptyCounts(): Record<MappingStatus, number> {
  return { EXACT: 0, NORMALIZED_EXACT: 0, CANDIDATE: 0, UNMAPPED: 0, AMBIGUOUS: 0 };
}

/** Audit a whole set of workbook labels against one canonical set. */
export function auditMappingSet(
  values: readonly string[],
  canonical: readonly CanonicalCode[],
  kind: 'room' | 'meal',
  options: MappingOptions = {}
): MappingGroup {
  const seen = new Set<string>();
  const results: MappingAudit[] = [];
  for (const v of values) {
    const key = String(v ?? '');
    if (seen.has(key)) continue;
    seen.add(key);
    results.push(auditMapping(key, canonical, options));
  }
  const counts = emptyCounts();
  for (const r of results) counts[r.status] += 1;
  return { kind, results, counts };
}

/**
 * Audit a resort's workbook labels against its contract definitions.
 * Room codes and meal plans are audited independently so a mapping failure in
 * one never masks the other.
 */
export function auditResortMappings(input: {
  resort: string;
  roomValues: readonly string[];
  mealValues: readonly string[];
  rooms: readonly CanonicalCode[];
  mealPlans: readonly CanonicalCode[];
  options?: MappingOptions;
}): { resort: string; rooms: MappingGroup; meals: MappingGroup } {
  return {
    resort: input.resort,
    rooms: auditMappingSet(input.roomValues, input.rooms, 'room', input.options),
    meals: auditMappingSet(input.mealValues, input.mealPlans, 'meal', input.options),
  };
}

export function summariseMappingReport(reports: readonly { rooms: MappingGroup; meals: MappingGroup }[]): MappingReport {
  const totals = emptyCounts();
  const needsReview: MappingAudit[] = [];
  const autoAcceptable: MappingAudit[] = [];
  const groups: MappingGroup[] = [];
  for (const r of reports) {
    for (const g of [r.rooms, r.meals]) {
      groups.push(g);
      for (const [status, n] of Object.entries(g.counts) as Array<[MappingStatus, number]>) totals[status] += n;
      for (const audit of g.results) (isAutoAcceptable(audit.status) ? autoAcceptable : needsReview).push(audit);
    }
  }
  return { groups, totals, needsReview, autoAcceptable };
}
