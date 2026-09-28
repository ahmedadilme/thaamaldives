import { describe, expect, it, vi } from 'vitest';
import { RATE_ID, TRANSFER_KEY, type InventoryData } from '../src/inventory/schema';
import { normalizeInventory } from '../src/inventory/migrate';

const baseInventory = (over: Partial<InventoryData> = {}): InventoryData => ({
  version: 1,
  lastUpdated: '2026-01-01T00:00:00.000Z',
  rates: [],
  availability: [],
  transfers: [],
  imports: [],
  ...over,
});

/** A minimal localStorage stand-in; publishInventory talks only to this. */
const withStorage = (impl: Storage['setItem']): void => {
  vi.stubGlobal('localStorage', { setItem: impl });
};

describe('RATE_ID', () => {
  it('separates periods that share a start date but end differently', () => {
    const a = RATE_ID('r', 'BV', 'BB', '2026-01-01', '2026-03-31');
    const b = RATE_ID('r', 'BV', 'BB', '2026-01-01', '2026-04-30');
    expect(a).not.toBe(b);
  });
});

describe('TRANSFER_KEY', () => {
  it('separates mode and period', () => {
    expect(TRANSFER_KEY('r', 'return', 'A')).not.toBe(TRANSFER_KEY('r', 'spl', 'A'));
    expect(TRANSFER_KEY('r', 'return', 'A')).not.toBe(TRANSFER_KEY('r', 'return', 'B'));
    expect(TRANSFER_KEY('r', 'return', null)).toBe(TRANSFER_KEY('r', 'return', undefined));
  });
});

describe('normalizeInventory', () => {
  it('treats a provenance-less artifact as UNKNOWN rather than sellable', () => {
    const n = normalizeInventory(baseInventory());
    expect(n.provenance).toBe('UNKNOWN');
  });

  it('preserves a valid stored provenance', () => {
    expect(normalizeInventory(baseInventory({ provenance: 'VERIFIED_IMPORT' })).provenance).toBe(
      'VERIFIED_IMPORT'
    );
    expect(normalizeInventory(baseInventory({ provenance: 'SEEDED' as never })).provenance).toBe('SEEDED');
  });

  it('upgrades legacy transfers that had no id, mode, or period', () => {
    const n = normalizeInventory(
      baseInventory({
        transfers: [
          { resortSlug: 'r', adult: 120, child: 60, currency: 'USD', source: 'x', importId: 'i1' },
        ] as never,
      })
    );
    expect(n.transfers).toHaveLength(1);
    const t = n.transfers[0];
    expect(t.id).toBeTruthy();
    expect(t.mode).toBe('return');
    expect(t.adult).toBe(120);
    expect(t.child).toBe(60);
  });

  it('never invents a price for a legacy missing child rate', () => {
    const n = normalizeInventory(
      baseInventory({ transfers: [{ resortSlug: 'r', adult: 120, currency: 'USD' }] as never })
    );
    expect(n.transfers[0].child).toBe('UNPRICED');
  });

  it('recomputes rate ids with the validTo component', () => {
    const n = normalizeInventory(
      baseInventory({
        rates: [
          {
            id: 'stale-4-part-id',
            resortSlug: 'r',
            roomCode: 'BV',
            mealCode: 'BB',
            validFrom: '2026-01-01',
            validTo: '2026-03-31',
            sgl: 100,
            dbl: 120,
          },
        ] as never,
      })
    );
    expect(n.rates[0].id).toBe(RATE_ID('r', 'BV', 'BB', '2026-01-01', '2026-03-31'));
  });

  it('drops unusable rows instead of inventing values', () => {
    const n = normalizeInventory(
      baseInventory({ rates: [{ roomCode: 'BV' }, { resortSlug: 'r' }] as never })
    );
    expect(n.rates).toHaveLength(0);
  });
});

describe('publishInventory write failures', () => {
  it('throws instead of reporting a successful publish', async () => {
    withStorage(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    const { publishInventory, InventoryWriteError } = await import('../src/inventory/client');
    const data = baseInventory({ provenance: 'VERIFIED_IMPORT' });
    expect(() => publishInventory(data)).toThrow(InventoryWriteError);
    expect(() => publishInventory(data)).toThrow(/nothing was published/i);
  });

  it('reports the payload size so the cause is actionable', async () => {
    withStorage(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    const { publishInventory, InventoryWriteError } = await import('../src/inventory/client');
    const data = baseInventory({ provenance: 'VERIFIED_IMPORT' });
    try {
      publishInventory(data);
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(InventoryWriteError);
      expect((err as InstanceType<typeof InventoryWriteError>).isQuota).toBe(true);
      expect((err as InstanceType<typeof InventoryWriteError>).payloadBytes).toBeGreaterThan(0);
    }
  });
});
