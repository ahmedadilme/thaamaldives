import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, BedDouble, CalendarRange, MapPin, Search, SlidersHorizontal, Sparkles } from 'lucide-react';
import { PageHero } from '@/components/PageHero';
import { Badge, Button, Reveal, SectionHeading, cx } from '@/components/ui';
import { IMG } from '@/data/images';
import { properties, allAtolls, kindLabel, lowestNightly } from '@/data/properties';
import type { Property } from '@/types';
import { formatUSD } from '@/lib/format';
import { packages } from '@/data/outbound';

type Tab = 'stay' | 'rooms' | 'packages';

interface RoomOffer {
  key: string;
  property: Property;
  code: string;
  name: string;
  meal: string;
  from: number;
  periods: number;
}

function buildRoomOffers(): RoomOffer[] {
  const offers: RoomOffer[] = [];
  for (const p of properties) {
    const seen = new Set<string>();
    const byCode = new Map<string, { meal: string; min: number; periods: Set<string> }>();
    for (const row of p.contract.rates) {
      const key = `${row.code}__${row.meal}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const nums = [row.sgl, row.dbl, row.tpl]
        .map((v) => (typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : NaN))
        .filter((n) => !Number.isNaN(n) && n > 0);
      const min = nums.length ? Math.min(...nums) : 0;
      byCode.set(key, { meal: row.meal, min, periods: new Set([row.period]) });
    }
    // merge same code+meal across periods to find overall minimum + period count
    for (const row of p.contract.rates) {
      const key = `${row.code}__${row.meal}`;
      const entry = byCode.get(key);
      if (!entry) continue;
      entry.periods.add(row.period);
      const nums = [row.sgl, row.dbl, row.tpl]
        .map((v) => (typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : NaN))
        .filter((n) => !Number.isNaN(n) && n > 0);
      if (nums.length) entry.min = Math.min(entry.min, ...nums);
    }
    for (const row of p.contract.rates) {
      const key = `${row.code}__${row.meal}`;
      const entry = byCode.get(key);
      if (!entry) continue;
      if (offers.some((o) => o.key === `${p.slug}__${key}`)) continue;
      const room = p.contract.rooms.find((r) => r.code === row.code);
      offers.push({
        key: `${p.slug}__${key}`,
        property: p,
        code: row.code,
        name: room?.name ?? row.code,
        meal: entry.meal,
        from: entry.min,
        periods: entry.periods.size,
      });
    }
  }
  return offers.sort((a, b) => a.from - b.from);
}

export default function Explore() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'stay';
  const q = (params.get('q') ?? '').toLowerCase();
  const [kind, setKind] = useState<'all' | 'resort' | 'hotel' | 'guesthouse'>((params.get('type') as never) ?? 'all');
  const [atoll, setAtoll] = useState(params.get('atoll') ?? 'All');
  const [board, setBoard] = useState(params.get('board') ?? 'Any');
  const [sort, setSort] = useState<'price' | 'name'>('price');

  const rooms = useMemo(() => buildRoomOffers(), []);

  const setTabParam = (t: Tab) => {
    const next = new URLSearchParams(params);
    next.set('tab', t);
    setParams(next, { replace: true });
  };

  const filteredProperties = useMemo(() => {
    let list = properties.filter((p) => (kind === 'all' ? true : p.kind === kind));
    if (atoll !== 'All') {
      const short = atoll.split('·')[0].trim();
      list = list.filter((p) => p.atoll.includes(short));
    }
    if (q) list = list.filter((p) => `${p.name} ${p.atoll} ${p.description}`.toLowerCase().includes(q));
    list = [...list].sort((a, b) => (sort === 'price' ? lowestNightly(a) - lowestNightly(b) : a.name.localeCompare(b.name)));
    return list;
  }, [kind, atoll, q, sort]);

  const filteredRooms = useMemo(() => {
    let list = rooms.filter((o) => (kind === 'all' ? true : o.property.kind === kind));
    if (atoll !== 'All') {
      const short = atoll.split('·')[0].trim();
      list = list.filter((o) => o.property.atoll.includes(short));
    }
    if (board !== 'Any') list = list.filter((o) => o.meal === board);
    if (q) list = list.filter((o) => `${o.property.name} ${o.name} ${o.meal} ${o.property.atoll}`.toLowerCase().includes(q));
    return list;
  }, [rooms, kind, atoll, board, q]);

  const maldivesPackages = useMemo(() => packages.filter((p) => p.category === 'Maldives'), []);
  const filteredPackages = useMemo(() => {
    let list = maldivesPackages;
    if (q) list = list.filter((p) => `${p.title} ${p.region} ${p.nights}`.toLowerCase().includes(q));
    return list;
  }, [maldivesPackages, q]);

  const TABS: Array<{ key: Tab; label: string }> = [
    { key: 'stay', label: 'Stays' },
    { key: 'rooms', label: 'Rooms' },
    { key: 'packages', label: 'Packages' },
  ];

  return (
    <>
      <PageHero
        eyebrow="Explore the catalogue"
        title={
          <>
            Resorts, hotels & guest houses — <span className="italic text-gold-600">real rates, bookable.</span>
          </>
        }
        subtitle="Every listing is a contract we hold with the property. Filter, compare, then book a stay with an instant estimate."
        image={IMG.maldivesAerial}
      >
        <div className="mt-8 max-w-xl">
          <div className="flex items-center gap-2 rounded-full border border-ink-950/12 bg-white px-5 py-3.5">
            <Search size={17} className="text-ink-400" />
            <input
              value={q}
              onChange={(e) => {
                const next = new URLSearchParams(params);
                if (e.target.value) next.set('q', e.target.value);
                else next.delete('q');
                setParams(next, { replace: true });
              }}
              placeholder="Search by property, room or atoll…"
              className="w-full bg-transparent text-sm text-ink-950 placeholder:text-ink-400 focus:outline-none"
            />
          </div>
        </div>
      </PageHero>

      <section className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        {/* Tabs */}
        <div className="flex flex-wrap justify-between gap-4">
          <div className="flex flex-wrap gap-1.5 rounded-full bg-sand-100 p-1.5">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTabParam(t.key)}
                className={cx(
                  'rounded-full px-5 py-2.5 text-xs font-bold transition-all',
                  tab === t.key ? 'bg-brand-600 text-white shadow' : 'text-ink-600 hover:text-ink-950'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink-500">
            <SlidersHorizontal size={14} className="text-brand-600" />
            <select value={kind} onChange={(e) => setKind(e.target.value as never)} className="rounded-full border border-ink-950/12 bg-white px-3 py-2 text-xs font-semibold text-ink-800 focus:border-brand-500 focus:outline-none">
              <option value="all">All types</option>
              <option value="resort">Resorts</option>
              <option value="hotel">Hotels</option>
              <option value="guesthouse">Guest Houses</option>
            </select>
            <select value={atoll} onChange={(e) => setAtoll(e.target.value)} className="rounded-full border border-ink-950/12 bg-white px-3 py-2 text-xs font-semibold text-ink-800 focus:border-brand-500 focus:outline-none">
              <option>All</option>
              {allAtolls.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
            {tab === 'rooms' && (
              <select value={board} onChange={(e) => setBoard(e.target.value)} className="rounded-full border border-ink-950/12 bg-white px-3 py-2 text-xs font-semibold text-ink-800 focus:border-brand-500 focus:outline-none">
                <option>Any</option>
                {['RO', 'BB', 'HB', 'FB', 'AI', 'AKAI', 'PAI'].map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
            )}
            {tab === 'stay' && (
              <select value={sort} onChange={(e) => setSort(e.target.value as never)} className="rounded-full border border-ink-950/12 bg-white px-3 py-2 text-xs font-semibold text-ink-800 focus:border-brand-500 focus:outline-none">
                <option value="price">Price · low → high</option>
                <option value="name">Name · A–Z</option>
              </select>
            )}
          </div>
        </div>

        {/* Stays */}
        {tab === 'stay' && (
          <div className="mt-10">
            {filteredProperties.length === 0 ? (
              <EmptyState query={q} />
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredProperties.map((p, i) => (
                  <Reveal key={p.slug} delay={(i % 3) * 70}>
                    <Link to={`/property/${p.slug}`} className="group flex h-full flex-col overflow-hidden rounded-3xl bg-white shadow-[inset_0_0_0_1px_rgba(15,18,20,0.06)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-card">
                      <div className="relative aspect-[16/10] overflow-hidden">
                        <img src={p.image} alt={p.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/60 to-transparent" />
                        <div className="absolute left-4 top-4 flex gap-2">
                          <Badge tone="light">{kindLabel[p.kind]}</Badge>
                          {p.stars ? <Badge tone="gold">{'★'.repeat(p.stars)}</Badge> : null}
                        </div>
                        <div className="absolute bottom-4 left-4 right-4 text-white">
                          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-white/70">
                            <MapPin size={12} /> {p.atoll}
                          </p>
                          <h3 className="font-display mt-1 text-2xl font-semibold leading-tight">{p.name}</h3>
                        </div>
                      </div>
                      <div className="flex flex-1 flex-col p-6">
                        <p className="text-sm italic leading-relaxed text-ink-600">“{p.tagline}”</p>
                        <div className="mt-5 flex items-end justify-between border-t border-ink-950/8 pt-4">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-400">From · per night</p>
                            <p className="font-display text-2xl font-semibold text-brand-700">{formatUSD(lowestNightly(p))}</p>
                          </div>
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-brand-700">
                            View & book <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  </Reveal>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Rooms */}
        {tab === 'rooms' && (
          <div className="mt-10">
            <p className="flex items-center gap-2 text-sm text-ink-500">
              <BedDouble size={15} className="text-brand-600" /> {filteredRooms.length} room options across {kind === 'all' ? properties.length : properties.filter((p) => p.kind === kind).length} properties
            </p>
            {filteredRooms.length === 0 ? (
              <EmptyState query={q} />
            ) : (
              <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                {filteredRooms.map((o, i) => (
                  <Reveal key={o.key} delay={(i % 3) * 70}>
                    <div className="flex h-full flex-col overflow-hidden rounded-3xl bg-white shadow-[inset_0_0_0_1px_rgba(15,18,20,0.06)]">
                      <div className="flex items-center gap-5 border-b border-ink-950/6 bg-sand-50/70 p-5">
                        <img src={o.property.image} alt={o.property.name} loading="lazy" className="h-16 w-16 rounded-2xl object-cover" />
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-400">{kindLabel[o.property.kind]} · {o.property.atoll.split('·')[0].trim()}</p>
                          <Link to={`/property/${o.property.slug}`} className="font-display block truncate text-lg font-semibold hover:text-brand-700">{o.property.name}</Link>
                        </div>
                      </div>
                      <div className="flex flex-1 flex-col p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h4 className="font-display text-xl font-semibold">{o.name}</h4>
                            <p className="mt-1 flex items-center gap-2 text-xs text-ink-500">
                              <Badge tone="dark">{o.meal}</Badge> <CalendarRange size={13} /> {o.periods} season{o.periods > 1 ? 's' : ''} · {o.property.contract.valid}
                            </p>
                          </div>
                        </div>
                        <div className="mt-auto flex items-end justify-between pt-5">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-400">From · per night</p>
                            <p className="font-display text-2xl font-semibold text-brand-700">{formatUSD(o.from)}</p>
                          </div>
                          <Link
                            to={`/book?property=${o.property.slug}&room=${encodeURIComponent(o.code)}&board=${encodeURIComponent(o.meal)}`}
                            className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-3 text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-gold-500 hover:text-ink-950"
                          >
                            Book this room <ArrowRight size={14} />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Packages */}
        {tab === 'packages' && (
          <div className="mt-10">
            <p className="flex items-center gap-2 text-sm text-ink-500">
              <Sparkles size={15} className="text-gold-600" /> {filteredPackages.length} Maldives packages
            </p>
            {filteredPackages.length === 0 ? (
              <EmptyState query={q} />
            ) : (
              <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredPackages.map((p, i) => (
                  <Reveal key={p.id} delay={(i % 3) * 70}>
                    <Link to={`/contact?interest=${encodeURIComponent(`${p.title} package`)}`} className="group flex h-full flex-col overflow-hidden rounded-3xl bg-white shadow-[inset_0_0_0_1px_rgba(15,18,20,0.06)] transition-all hover:-translate-y-1.5 hover:shadow-card">
                      <div className="relative aspect-[4/3] overflow-hidden">
                        <img src={p.image} alt={p.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/60 to-transparent" />
                        {p.badge && <div className="absolute left-4 top-4"><Badge tone="gold">{p.badge}</Badge></div>}
                        <div className="absolute bottom-4 left-4 text-white">
                          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/70">{p.region}</p>
                          <h3 className="font-display text-2xl font-semibold leading-tight">{p.title}</h3>
                        </div>
                      </div>
                      <div className="flex flex-1 flex-col p-5">
                        <p className="text-xs text-ink-500">{p.nights} · {p.label}</p>
                        <ul className="mt-3 flex-1 space-y-1.5">
                          {p.inclusions.slice(0, 3).map((inc) => (
                            <li key={inc} className="text-xs leading-relaxed text-ink-600">{inc}</li>
                          ))}
                        </ul>
                        <div className="mt-4 flex items-end justify-between border-t border-ink-950/8 pt-4">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-400">From</p>
                            <p className="font-display text-2xl font-semibold text-brand-700">{formatUSD(p.from)}</p>
                          </div>
                          <span className="text-xs font-bold uppercase tracking-widest text-brand-700">Request trip</span>
                        </div>
                      </div>
                    </Link>
                  </Reveal>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Bottom CTA */}
        <div className="mt-16 rounded-[2rem] bg-sand-100 p-9 text-center md:p-12">
          <SectionHeading
            align="center"
            eyebrow="Can’t decide?"
            title={
              <>
                Describe the trip you want — <span className="italic text-brand-600">we’ll shortlist it.</span>
              </>
            }
          />
          <Button to="/contact?interest=Maldives%20resort%20advice" variant="dark" size="lg" className="mt-7">
            Talk to a Travel Expert <ArrowRight size={16} />
          </Button>
        </div>
      </section>
    </>
  );
}

function EmptyState({ query }: { query: string }) {
  return (
    <div className="mt-10 rounded-3xl bg-sand-100/70 p-14 text-center">
      <p className="font-display text-2xl font-semibold">Nothing matched “{query}”.</p>
      <p className="mt-2 text-sm text-ink-600">Try a different type, atoll or search — or ask us, most trips start as a question.</p>
      <Button to="/contact?interest=Custom%20itinerary" variant="dark" className="mt-6">
        Ask us anyway <ArrowRight size={15} />
      </Button>
    </div>
  );
}