import { describe, expect, it } from 'vitest';
import {
  isPriceBearing,
  pricedAmount,
  priceValueLabel,
  resolveProvenance,
  toPriceValue,
} from '../src/inventory/schema';
import { isPriceVerified, provenanceView } from '../src/inventory/provenance';

const inv = (provenance?: unknown) => ({ provenance }) as { provenance?: unknown };

describe('provenance gate', () => {
  it('allows prices only for VERIFIED_IMPORT', () => {
    expect(isPriceBearing('VERIFIED_IMPORT')).toBe(true);
    for (const p of ['SEEDED', 'MANUAL', 'UNKNOWN', undefined, null]) {
      expect(isPriceBearing(p as never)).toBe(false);
    }
  });

  it('fails closed on absent or unrecognised provenance', () => {
    expect(resolveProvenance(undefined)).toBe('UNKNOWN');
    expect(resolveProvenance(null)).toBe('UNKNOWN');
    expect(resolveProvenance({})).toBe('UNKNOWN');
    expect(resolveProvenance({ provenance: 'TOTALLY_MADE_UP' })).toBe('UNKNOWN');
    expect(resolveProvenance({ provenance: 42 })).toBe('UNKNOWN');
  });

  it('never treats tampered or missing data as sellable', () => {
    expect(isPriceVerified(inv('VERIFIED_IMPORT'))).toBe(true);
    expect(isPriceVerified(inv('SEEDED'))).toBe(false);
    expect(isPriceVerified(inv())).toBe(false);
    expect(isPriceVerified(null)).toBe(false);
    expect(isPriceVerified({ provenance: 'VERIFIED_IMPORT ' } as never)).toBe(false);
  });

  it('explains the withheld price for admin display', () => {
    const seeded = provenanceView(inv('SEEDED'));
    expect(seeded.priceVisible).toBe(false);
    expect(seeded.reason).toMatch(/withheld/i);
    const verified = provenanceView(inv('VERIFIED_IMPORT'));
    expect(verified.priceVisible).toBe(true);
  });
});

describe('PriceValue states', () => {
  it('distinguishes FOC from unpriced and from reference', () => {
    expect(toPriceValue('FOC')).toBe('FOC');
    expect(toPriceValue('Complimentary')).toBe('FOC');
    expect(toPriceValue(0)).toBe('UNPRICED');
    expect(toPriceValue('')).toBe('UNPRICED');
    expect(toPriceValue(null)).toBe('UNPRICED');
    expect(toPriceValue(undefined)).toBe('UNPRICED');
    expect(toPriceValue('Info below')).toBe('REFERENCE');
    expect(toPriceValue('TBC')).toBe('REFERENCE');
    expect(toPriceValue('on request')).toBe('REFERENCE');
    expect(toPriceValue(250)).toBe(250);
    expect(toPriceValue('1,250')).toBe(1250);
  });

  it('contributes 0 only for FOC and nothing for unresolved states', () => {
    expect(pricedAmount(250)).toBe(250);
    expect(pricedAmount('FOC')).toBe(0);
    expect(pricedAmount('UNPRICED')).toBeNull();
    expect(pricedAmount('REFERENCE')).toBeNull();
    expect(pricedAmount(null)).toBeNull();
  });

  it('labels each state distinctly', () => {
    expect(priceValueLabel('FOC')).toMatch(/free/i);
    expect(priceValueLabel('UNPRICED')).toMatch(/not quoted/i);
    expect(priceValueLabel('REFERENCE')).toMatch(/request/i);
  });
});
