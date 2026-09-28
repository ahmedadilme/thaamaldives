import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowRight, Check, ChevronRight, Info, Minus, Plus, Waves } from 'lucide-react';
import { PageHero } from '@/components/PageHero';
import { Badge, Button, cx } from '@/components/ui';
import { IMG } from '@/data/images';
import { properties, getProperty, kindLabel, getAddonsFor } from '@/data/properties';
import type { RateRow } from '@/types';
import { formatUSD } from '@/lib/format';
import { submitBooking } from '@/lib/enquiry';
import { getInventory, getRateRow, getTransfer } from '@/inventory/client';
import { isPriceVerified, provenanceView } from '@/inventory/provenance';
import { pricedAmount, priceValueLabel } from '@/inventory/schema';

function num(v: string | number | undefined): number {
  if (v === undefined || v === '' || v === 'N/A' || v === 'n/a' || v === '0.00') return 0;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isNaN(n) ? 0 : n;
}

function isoDate(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

export default function Book() {
  const [params] = useSearchParams();

  const [step, setStep] = useState(0);
  const [slug, setSlug] = useState(params.get('property') ?? '');
  const [roomCode, setRoomCode] = useState(params.get('room') ?? '');
  const [meal, setMeal] = useState(params.get('board') ?? '');
  const [period, setPeriod] = useState(params.get('period') ?? '');
  const [occupancy, setOccupancy] = useState<'sgl' | 'dbl'>(params.get('adults') === '1' ? 'sgl' : 'dbl');
  const [checkIn, setCheckIn] = useState(params.get('checkIn') ?? isoDate(14));
  const [nights, setNights] = useState(Number(params.get('nights') ?? '3'));
  const [adults, setAdults] = useState(Number(params.get('adults') ?? '2'));
  const [children, setChildren] = useState(Number(params.get('children') ?? '0'));
  const transferOn = true;
  const [selectedAddons, setSelectedAddons] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [resultMsg, setResultMsg] = useState('');
  const [guest, setGuest] = useState({ name: '', email: '', phone: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const property = getProperty(slug);

  const availableRooms = useMemo(() => {
    if (!property) return [];
    const rooms: Array<{ code: string; name: string; detail?: string; meal: string; row: RateRow }> = [];
    for (const row of property.contract.rates) {
      if (period && row.period !== period) continue;
      if (meal && row.meal !== meal) continue;
      const room = property.contract.rooms.find((r) => r.code === row.code);
      rooms.push({ code: row.code, name: room?.name ?? row.code, detail: room?.detail, meal: row.meal, row });
    }
    return rooms;
  }, [property, period, meal]);

  const periods = property ? [...new Set(property.contract.rates.map((r) => r.period))] : [];
  const mealsForProperty = property ? [...new Set(property.contract.rates.map((r) => r.meal))] : [];

  const matchingRow = useMemo((): RateRow | undefined => {
    if (!property) return undefined;
    // getRateRow already returns null unless provenance is VERIFIED_IMPORT, so
    // the fallback below is reached only when a verified import simply has no
    // matching period. Unverified data never reaches this branch.
    const fromInventory = getRateRow(property.slug, roomCode, meal, period);
    if (fromInventory) {
      return {
        period: fromInventory.period,
        code: fromInventory.code,
        meal: fromInventory.meal,
        sgl: String(fromInventory.sgl),
        dbl: String(fromInventory.dbl),
        tpl: String(fromInventory.tpl),
        qtrp: String(fromInventory.qtrp),
        ext: String(fromInventory.ext),
        child: String(fromInventory.child),
        infant: String(fromInventory.infant),
      } as RateRow;
    }
    if (!isPriceVerified(getInventory())) return undefined;
    const rows = property.contract.rates.filter(
      (r) => r.code === roomCode && r.meal === meal && (!period || r.period === period)
    );
    if (rows.length === 0) return undefined;
    return rows[0];
  }, [property, roomCode, meal, period]);

  const nightlyRate = useMemo(() => {
    if (!matchingRow) return 0;
    if (occupancy === 'sgl') {
      const v = num(matchingRow.sgl);
      return v > 0 ? v : num(matchingRow.dbl);
    }
    const v = num(matchingRow.dbl);
    return v > 0 ? v : num(matchingRow.sgl);
  }, [matchingRow, occupancy]);

  const addons = useMemo(() => {
    if (!property) return [];
    return getAddonsFor(property.slug, property.addons);
  }, [property]);

  /**
   * Transfer charge, or null when the operator has not quoted a real price.
   *
   * null is distinct from 0: `pricedAmount` returns null for UNPRICED and
   * REFERENCE so those are excluded from the total rather than silently added
   * as zero, and only FOC collapses to a genuine 0 ("included").
   */
  const transferCost = useMemo((): number | null => {
    if (!property || !transferOn) return 0;
    const t = getTransfer(property.slug);
    if (t) {
      const perAdult = pricedAmount(t.adult);
      return perAdult === null ? null : perAdult * adults;
    }
    if (!isPriceVerified(getInventory())) return null;
    const legacy = property.contract.transfers[0];
    if (!legacy) return null;
    const v = num(legacy.adult);
    return v > 0 ? v * adults : null;
  }, [property, transferOn, adults]);

  const addonsTotal = useMemo(() => {
    const pax = adults + children;
    let total = 0;
    for (const a of addons) {
      if (!selectedAddons[a.id]) continue;
      if (a.unit === 'per night') total += a.price * nights;
      else if (a.unit === 'per person') total += a.price * pax;
      else total += a.price;
    }
    return total;
  }, [addons, selectedAddons, nights, adults, children]);

  const roomTotal = nightlyRate * nights;
  const transferCharge = transferCost ?? 0;
  const grandTotal = roomTotal + transferCharge + addonsTotal;
  const roomOnRequest = nightlyRate <= 0;
  /** A grand total is only trustworthy when every component is a real number. */
  const totalComplete = transferCost !== null;
  /** Why the numbers above are missing, for an honest "no price" state. */
  const inventoryView = provenanceView(getInventory());
  const priceVisible = inventoryView.priceVisible;
  const priceWithheldReason = inventoryView.reason;

  const toggleAddon = (id: string) => setSelectedAddons((prev) => ({ ...prev, [id]: !prev[id] }));
  const selectedAddonList = addons.filter((a) => selectedAddons[a.id]);

  const guestReady = guest.name.trim().length > 0 && /\S+@\S+\.\S+/.test(guest.email.trim());

  const onSubmit = async () => {
    if (!property || !matchingRow || submitting || !guestReady) return;
    setSubmitting(true);
    setSubmitError(null);
    const room = property.contract.rooms.find((r) => r.code === roomCode);
    const res = await submitBooking({
      name: guest.name.trim(),
      email: guest.email.trim(),
      phone: guest.phone.trim() || undefined,
      message: guest.notes.trim() || undefined,
      propertySlug: property.slug,
      propertyName: property.name,
      roomCode,
      roomName: room?.name ?? roomCode,
      board: meal,
      checkIn,
      nights,
      adults,
      children,
      addons: selectedAddonList.map((a) => ({ id: a.id, name: a.name })),
      transferType: transferOn ? property.contract.transfers[0]?.type : undefined,
      estimateUSD: grandTotal,
    });
    setSubmitting(false);
    if (!res.ok) {
      setSubmitError(res.message);
      return;
    }
    setResultMsg(res.message);
    setSubmitted(true);
  };

  const STEPS = [
    { label: 'Property', icon: ChevronRight },
    { label: 'Room & board', icon: ChevronRight },
    { label: 'Dates & guests', icon: ChevronRight },
    { label: 'Add-ons', icon: ChevronRight },
    { label: 'Confirm', icon: ChevronRight },
  ];

  return (
    <>
      <PageHero
        eyebrow="Booking wizard"
        title={
          <>
            Build your stay, <span className="italic text-gold-600">see the estimate.</span>
          </>
        }
        subtitle="Pick a property, choose a room and board, add any extras — then submit a booking request with a clear estimate."
        image={property ? property.image : IMG.maldivesAerial}
      />

      <section className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        {/* Steps */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-widest text-ink-400">
          {STEPS.map((s, i) => (
            <span key={i} className={cx('flex items-center gap-2', i === step && 'text-brand-700')}>
              <span className={cx(
                'inline-flex h-7 w-7 items-center justify-center rounded-full',
                i < step ? 'bg-brand-600 text-white' : i === step ? 'bg-gold-500 text-ink-950' : 'bg-sand-100 text-ink-400'
              )}>
                {i < step ? <Check size={12} /> : i + 1}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
              {i < STEPS.length - 1 && <span className="h-px w-4 bg-ink-950/10" />}
            </span>
          ))}
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_360px]">
          {/* Left panel */}
          <div className="min-w-0 space-y-8">

            {/* Step 0: Property */}
            <div className={cx(step !== 0 && 'hidden')}>
              <h2 className="font-display text-2xl font-semibold">Where would you like to stay?</h2>
              <div className="mt-5 space-y-3">
                <select
                  value={slug}
                  onChange={(e) => { setSlug(e.target.value); setRoomCode(''); setMeal(''); setPeriod(''); }}
                  className="w-full rounded-2xl border border-ink-950/12 bg-white px-5 py-3.5 text-sm text-ink-800 focus:border-brand-500 focus:outline-none"
                >
                  <option value="">Select a property…</option>
                  {properties.map((p) => (
                    <option key={p.slug} value={p.slug}>{p.name} ({kindLabel[p.kind]})</option>
                  ))}
                </select>
              </div>
              {property && (
                <div className="mt-6 flex items-center gap-4 rounded-2xl bg-sand-50 p-5">
                  <img src={property.image} alt="" className="h-20 w-20 rounded-2xl object-cover" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-400">{kindLabel[property.kind]} · {property.atoll.split('·')[0].trim()}</p>
                    <p className="font-display text-lg font-semibold">{property.name}</p>
                    <p className="text-xs text-ink-500">{property.tagline}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Step 1: Room & board */}
            <div className={cx(step !== 1 && 'hidden')}>
              <h2 className="font-display text-2xl font-semibold">Room & board</h2>
              {!property ? (
                <p className="mt-4 text-sm text-ink-500">Go back and pick a property first.</p>
              ) : (
                <>
                  <div className="mt-5 flex flex-wrap gap-3">
                    {periods.length > 0 && (
                      <select value={period} onChange={(e) => setPeriod(e.target.value)} className="rounded-2xl border border-ink-950/12 bg-white px-4 py-3 text-sm text-ink-800 focus:border-brand-500 focus:outline-none">
                        <option value="">Any season</option>
                        {periods.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    )}
                    {mealsForProperty.length > 0 && (
                      <select value={meal} onChange={(e) => setMeal(e.target.value)} className="rounded-2xl border border-ink-950/12 bg-white px-4 py-3 text-sm text-ink-800 focus:border-brand-500 focus:outline-none">
                        <option value="">Any board</option>
                        {mealsForProperty.map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                    )}
                  </div>
                  <p className="mt-4 text-xs text-ink-400">{availableRooms.length} options · pick one to continue</p>
                  <div className="mt-4 space-y-3">
                    {availableRooms.map((o, i) => {
                      const row = o.row;
                      const price = num(row.dbl) > 0 ? num(row.dbl) : num(row.sgl);
                      const priced = price > 0;
                      const selected = o.code === roomCode && o.meal === meal;
                      return (
                        <button
                          key={`${o.code}-${o.meal}-${i}`}
                          onClick={() => { setRoomCode(o.code); setMeal(o.meal); if (!period) setPeriod(row.period); }}
                          className={cx(
                            'flex w-full items-center justify-between gap-5 rounded-2xl border p-5 text-left transition-all',
                            selected ? 'border-brand-600 bg-brand-50 shadow-sm' : 'border-ink-950/8 bg-white hover:border-brand-400'
                          )}
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-bold uppercase tracking-wide text-ink-400">{row.period} · {row.meal}</p>
                            <p className="mt-1 truncate text-sm font-bold text-ink-950">{o.name}</p>
                            {o.detail && <p className="text-xs text-ink-500">{o.detail}</p>}
                          </div>
                          <div className="shrink-0 text-right">
                            {priced ? (
                              <>
                                <p className="font-display text-2xl font-semibold text-brand-700">{formatUSD(price)}</p>
                                <p className="text-[10px] uppercase tracking-wide text-ink-400">/night</p>
                              </>
                            ) : (
                              <span className="inline-flex rounded-full bg-brand-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-brand-700">
                                On request
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Step 2: Dates & guests */}
            <div className={cx(step !== 2 && 'hidden')}>
              <h2 className="font-display text-2xl font-semibold">Dates & guests</h2>
              <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <label className="col-span-2 flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-ink-400">Check-in</span>
                  <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="rounded-2xl border border-ink-950/12 bg-white px-4 py-3 text-sm focus:border-brand-500 focus:outline-none" />
                </label>
                <label className="col-span-2 flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-ink-400">Nights</span>
                  <div className="flex items-center gap-2 rounded-2xl border border-ink-950/12 bg-white px-4 py-3">
                    <button onClick={() => setNights((n) => Math.max(1, n - 1))} className="text-ink-400 hover:text-ink-700"><Minus size={16} /></button>
                    <span className="min-w-[2.5rem] text-center text-sm font-bold text-ink-950">{nights}</span>
                    <button onClick={() => setNights((n) => Math.min(30, n + 1))} className="text-ink-400 hover:text-ink-700"><Plus size={16} /></button>
                  </div>
                </label>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-ink-400">Adults</span>
                  <div className="flex items-center gap-2 rounded-2xl border border-ink-950/12 bg-white px-4 py-3">
                    <button onClick={() => { setAdults((n) => Math.max(1, n - 1)); setOccupancy(adults - 1 <= 1 ? 'sgl' : 'dbl'); }} className="text-ink-400 hover:text-ink-700"><Minus size={16} /></button>
                    <span className="min-w-[2.5rem] text-center text-sm font-bold text-ink-950">{adults}</span>
                    <button onClick={() => { setAdults((n) => Math.min(8, n + 1)); setOccupancy('dbl'); }} className="text-ink-400 hover:text-ink-700"><Plus size={16} /></button>
                  </div>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-ink-400">Children</span>
                  <div className="flex items-center gap-2 rounded-2xl border border-ink-950/12 bg-white px-4 py-3">
                    <button onClick={() => setChildren((n) => Math.max(0, n - 1))} className="text-ink-400 hover:text-ink-700"><Minus size={16} /></button>
                    <span className="min-w-[2.5rem] text-center text-sm font-bold text-ink-950">{children}</span>
                    <button onClick={() => setChildren((n) => Math.min(4, n + 1))} className="text-ink-400 hover:text-ink-700"><Plus size={16} /></button>
                  </div>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-ink-400">Occupancy</span>
                  <div className="flex overflow-hidden rounded-2xl border border-ink-950/12">
                    {(['sgl', 'dbl'] as const).map((o) => (
                      <button key={o} onClick={() => setOccupancy(o)} className={cx('flex-1 px-3 py-3 text-xs font-bold uppercase transition-all', occupancy === o ? 'bg-brand-600 text-white' : 'bg-white text-ink-600')}>
                        {o === 'sgl' ? 'Single' : 'Double'}
                      </button>
                    ))}
                  </div>
                </label>
              </div>
              {property && (
                <div className="mt-6 flex items-start gap-3 rounded-2xl bg-sand-50 p-5 text-xs leading-relaxed text-ink-600">
                  <Info size={15} className="mt-0.5 shrink-0 text-brand-600" />
                  <span><strong className="text-ink-950">Transfers:</strong> {property.transferNote ?? property.transfer}.{' '}
                    {(() => {
                      const t = getTransfer(property.slug);
                      if (t) {
                        return t.adultAmount === 0
                          ? 'Included in rate.'
                          : t.adultAmount === null
                            ? `Quoted as ${priceValueLabel(t.adult).toLowerCase()}.`
                            : `Estimated from ${formatUSD(t.adultAmount)} per adult for ${adults} adult(s).`;
                      }
                      if (!priceVisible) return 'No verified transfer price is published yet.';
                      const legacy = num(property.contract.transfers[0]?.adult);
                      return legacy === 0 ? 'Included in rate.' : `Estimated from ${formatUSD(legacy * adults)} for ${adults} adult(s).`;
                    })()}
                  </span>
                </div>
              )}
            </div>

            {/* Step 3: Add-ons */}
            <div className={cx(step !== 3 && 'hidden')}>
              <h2 className="font-display text-2xl font-semibold">Optional add-ons</h2>
              <p className="mt-2 text-sm text-ink-500">All optional — toggle anything you’d like added to the booking.</p>
              {addons.length === 0 ? (
                <p className="mt-6 text-sm text-ink-500">No extras listed for this property yet.</p>
              ) : (
                <div className="mt-5 space-y-3">
                  {addons.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => toggleAddon(a.id)}
                      className={cx(
                        'flex w-full items-center justify-between gap-5 rounded-2xl border p-5 text-left transition-all',
                        selectedAddons[a.id] ? 'border-brand-600 bg-brand-50 shadow-sm' : 'border-ink-950/8 bg-white hover:border-brand-400'
                      )}
                    >
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-ink-400">{a.category}</p>
                        <p className="mt-1 text-sm font-bold text-ink-950">{a.name}</p>
                        {a.description && <p className="mt-1 text-xs text-ink-500">{a.description}</p>}
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-brand-700">{formatUSD(a.price)} {a.unit}</p>
                      </div>
                      <span className={cx('flex h-7 w-7 shrink-0 items-center justify-center rounded-full border', selectedAddons[a.id] ? 'border-brand-600 bg-brand-600 text-white' : 'border-ink-950/20 text-ink-300')}>
                        {selectedAddons[a.id] && <Check size={14} />}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Step 4: Confirm */}
            <div className={cx(step !== 4 && 'hidden')}>
              {submitted ? (
                <div className="rounded-3xl bg-sand-100 p-10 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-brand-600">Request received</p>
                  <p className="font-display mt-3 text-2xl font-semibold text-ink-950">{resultMsg}</p>
                  <Button to="/explore" variant="dark" size="lg" className="mt-8">
                    Explore more stays <ArrowRight size={15} />
                  </Button>
                </div>
              ) : (
                <>
                  <h2 className="font-display text-2xl font-semibold">Review & submit</h2>
                  <p className="mt-2 text-sm text-ink-500">Here’s a summary of your request. Check everything looks right, then submit to send us the booking.</p>
                  {property && (
                    <div className="mt-6 overflow-hidden rounded-3xl border border-ink-950/8 bg-white">
                      <div className="flex items-center gap-5 border-b border-ink-950/6 bg-sand-50/70 p-5">
                        <img src={property.image} alt="" className="h-16 w-16 rounded-2xl object-cover" />
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-400">{kindLabel[property.kind]}</p>
                          <p className="font-display text-lg font-semibold">{property.name}</p>
                        </div>
                      </div>
                      <dl className="grid grid-cols-2 gap-4 p-5 text-sm">
                        <div><dt className="text-ink-400">Room</dt><dd className="font-bold text-ink-950">{property.contract.rooms.find((r) => r.code === roomCode)?.name ?? roomCode}</dd></div>
                        <div><dt className="text-ink-400">Board</dt><dd className="font-bold text-ink-950">{meal}</dd></div>
                        <div><dt className="text-ink-400">Check-in</dt><dd className="font-bold text-ink-950">{checkIn}</dd></div>
                        <div><dt className="text-ink-400">Nights</dt><dd className="font-bold text-ink-950">{nights}</dd></div>
                        <div><dt className="text-ink-400">Adults</dt><dd className="font-bold text-ink-950">{adults}</dd></div>
                        <div><dt className="text-ink-400">Children</dt><dd className="font-bold text-ink-950">{children}</dd></div>
                        {transferOn && <div><dt className="text-ink-400">Transfer</dt><dd className="font-bold text-ink-950">{property.contract.transfers[0]?.type ?? 'Included'}</dd></div>}
                        {selectedAddonList.length > 0 && (
                          <div className="col-span-2">
                            <dt className="text-ink-400">Add-ons</dt>
                            <dd className="mt-1 flex flex-wrap gap-1.5">
                              {selectedAddonList.map((a) => <Badge key={a.id} tone="dark">{a.name}</Badge>)}
                            </dd>
                          </div>
                        )}
                      </dl>
                    </div>
                  )}
                  <p className="mt-6 text-xs leading-relaxed text-ink-500">
                    Submitting sends a request — availability and a final quote will be confirmed within one business day. Prices shown are estimates from our contract and may vary by season and occupancy.
                  </p>

                  <div className="mt-8 rounded-3xl border border-ink-950/8 bg-white p-6">
                    <h3 className="font-display text-lg font-semibold text-ink-950">Who should we confirm with?</h3>
                    <p className="mt-1 text-sm text-ink-500">We only use these to reply about this booking.</p>
                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.14em] text-ink-500">Full name</span>
                        <input
                          required
                          value={guest.name}
                          onChange={(e) => setGuest((g) => ({ ...g, name: e.target.value }))}
                          placeholder="e.g. Aishath Naseer"
                          className="w-full rounded-xl border border-ink-950/10 bg-white px-3.5 py-2.5 text-sm text-ink-900 focus:border-brand-500 focus:outline-none"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.14em] text-ink-500">Email</span>
                        <input
                          required
                          type="email"
                          value={guest.email}
                          onChange={(e) => setGuest((g) => ({ ...g, email: e.target.value }))}
                          placeholder="you@example.com"
                          className="w-full rounded-xl border border-ink-950/10 bg-white px-3.5 py-2.5 text-sm text-ink-900 focus:border-brand-500 focus:outline-none"
                        />
                      </label>
                      <label className="block sm:col-span-2">
                        <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.14em] text-ink-500">Phone / WhatsApp <span className="font-normal normal-case tracking-normal text-ink-400">(optional)</span></span>
                        <input
                          value={guest.phone}
                          onChange={(e) => setGuest((g) => ({ ...g, phone: e.target.value }))}
                          placeholder="+960 7xxx xxxx"
                          className="w-full rounded-xl border border-ink-950/10 bg-white px-3.5 py-2.5 text-sm text-ink-900 focus:border-brand-500 focus:outline-none"
                        />
                      </label>
                      <label className="block sm:col-span-2">
                        <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.14em] text-ink-500">Anything we should know? <span className="font-normal normal-case tracking-normal text-ink-400">(optional)</span></span>
                        <textarea
                          rows={3}
                          value={guest.notes}
                          onChange={(e) => setGuest((g) => ({ ...g, notes: e.target.value }))}
                          placeholder="Celebrations, dietary needs, flight details…"
                          className="w-full rounded-xl border border-ink-950/10 bg-white px-3.5 py-2.5 text-sm text-ink-900 focus:border-brand-500 focus:outline-none"
                        />
                      </label>
                    </div>
                    {submitError && (
                      <p className="mt-4 flex items-start gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm leading-relaxed text-rose-700">
                        <Info size={15} className="mt-0.5 shrink-0" /> {submitError}
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right sticky estimate */}
          {property && !submitted && (
            <div className="lg:sticky lg:top-28 lg:self-start">
              <div className="rounded-3xl border border-ink-950/6 bg-white p-7 shadow-card">
                <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-brand-700">Live estimate</p>
                <div className="mt-5 space-y-3 text-sm">
                  <div className="flex justify-between gap-4"><span className="text-ink-500">Room · {nights} nights</span><span className="font-semibold text-ink-950">{roomOnRequest ? 'On request' : formatUSD(roomTotal)}</span></div>
                  {transferOn && <div className="flex justify-between gap-4"><span className="text-ink-500">Transfer ({property.contract.transfers[0]?.type ?? 'Included'})</span><span className="font-semibold text-ink-950">{transferCost === null ? (priceVisible ? 'On request' : 'Not quoted') : transferCost > 0 ? formatUSD(transferCost) : 'Included'}</span></div>}
                  {addonsTotal > 0 && <div className="flex justify-between gap-4"><span className="text-ink-500">Add-ons ({selectedAddonList.length})</span><span className="font-semibold text-ink-950">{formatUSD(addonsTotal)}</span></div>}
                </div>
                <div className="mt-5 flex items-end justify-between border-t border-ink-950/8 pt-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-brand-700">Estimated total</p>
                  <p className="font-display text-3xl font-semibold text-ink-950">
                    {roomOnRequest || !totalComplete ? 'On request' : formatUSD(grandTotal)}
                  </p>
                </div>
                <p className="mt-3 flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-ink-400">
                  <Waves size={12} />
                  {roomOnRequest
                    ? '≈ Room rate on request — final quote confirmed'
                    : !priceVisible
                      ? '≈ No verified price published yet — final quote confirmed'
                      : !totalComplete
                        ? '≈ Transfer price pending — final quote confirmed'
                        : `≈ ${formatUSD(nightlyRate)} per night (${occupancy === 'sgl' ? 'single' : 'double'} occupancy)`}
                </p>
                {!priceVisible && (
                  <p className="mt-3 rounded-xl bg-sand-50 px-4 py-3 text-[11px] leading-relaxed text-ink-600">
                    {priceWithheldReason}
                  </p>
                )}
                <div className="mt-6 space-y-2">
                  {step < 4 && (
                    <button
                      onClick={() => setStep((s) => Math.min(4, s + 1))}
                      disabled={step === 0 && !slug}
                      className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-brand-500 disabled:opacity-40"
                    >
                      {step === 3 ? 'Review & submit' : 'Continue'} <ChevronRight size={14} />
                    </button>
                  )}
                  {step === 4 && (
                    <button
                      onClick={onSubmit}
                      disabled={submitting || !guestReady}
                      className="flex w-full items-center justify-center gap-2 rounded-full bg-gold-500 px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-ink-950 transition-all hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {submitting ? 'Sending…' : 'Submit booking request'} {!submitting && <ArrowRight size={14} />}
                    </button>
                  )}
                  {step > 0 && step < 4 && (
                    <button onClick={() => setStep((s) => Math.max(0, s - 1))} className="flex w-full items-center justify-center gap-2 rounded-full border border-ink-950/15 px-5 py-3 text-xs font-bold uppercase tracking-wider text-ink-600 transition-all hover:text-ink-950">
                      Back
                    </button>
                  )}
                </div>
                <p className="mt-4 text-center text-[10px] text-ink-400">Prices are estimates · final quote confirmed within a day.</p>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}