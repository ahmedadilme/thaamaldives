import { useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  Baby,
  Check,
  Fish,
  Heart,
  Info,
  MapPin,
  Sparkles,
  Users,
  Waves,
} from 'lucide-react';
import { PageHero } from '@/components/PageHero';
import { Badge, Button, Reveal, SectionHeading, Stars, cx } from '@/components/ui';
import { getProperty, kindLabel, properties, lowestNightly } from '@/data/properties';
import type { Property, RateValue } from '@/types';
import { formatUSD } from '@/lib/format';

const PROFILE = [
  { key: 'honeymoon', label: 'Honeymooners favourite', icon: Heart },
  { key: 'diving', label: 'Diving', icon: Fish },
  { key: 'houseReef', label: 'House reef', icon: Waves },
  { key: 'family', label: 'Family friendly', icon: Users },
  { key: 'kidsClub', label: 'Kids club', icon: Baby },
] as const;

function cell(value: RateValue) {
  if (value === undefined || value === '') return <span className="text-ink-300">—</span>;
  if (typeof value === 'string' && (value.toLowerCase() === 'n/a' || value.toLowerCase() === 'na' || value === '0.00' || Number(value) === 0)) {
    return <span className="text-ink-300">N/A</span>;
  }
  const n = Number(value);
  if (!Number.isNaN(n) && String(value).trim() !== '') return formatUSD(n);
  return <span className="text-ink-500">{value}</span>;
}

function RateGrid({ property }: { property: Property }) {
  const [period, setPeriod] = useState(property.contract.periods[0]);

  const rows = useMemo(() => property.contract.rates.filter((r) => r.period === period), [property, period]);
  const col = (key: 'tpl' | 'qtrp' | 'ext') =>
    rows.some((r) => typeof r[key] === 'number' || (typeof r[key] === 'string' && r[key] !== 'N/A' && r[key] !== 'n/a' && r[key] !== ''));

  const showTpl = col('tpl');
  const showQtrp = col('qtrp');
  const showExt = col('ext');

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 rounded-full bg-sand-100 p-1.5">
        {property.contract.periods.map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={cx(
              'rounded-full px-4 py-2 text-xs font-bold transition-all',
              period === p ? 'bg-brand-600 text-white shadow' : 'text-ink-600 hover:text-ink-950'
            )}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="mt-6 overflow-hidden rounded-3xl border border-ink-950/8 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="bg-brand-600 text-white">
                <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-[0.18em]">Room</th>
                <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-[0.18em]">SGL</th>
                <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-[0.18em]">DBL</th>
                {showTpl && <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-[0.18em]">TPL</th>}
                {showExt && <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-[0.18em]">EXT/ADL</th>}
                {showQtrp && <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-[0.18em]">QTRP</th>}
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const room = property.contract.rooms.find((x) => x.code === row.code);
                const href = `/book?property=${property.slug}&room=${encodeURIComponent(row.code)}&board=${encodeURIComponent(row.meal)}&period=${encodeURIComponent(row.period)}&adults=${row.meal === 'AKAI' || row.meal === 'PAI' ? 2 : 2}`;
                return (
                  <tr key={`${row.code}-${row.meal}-${i}`} className={cx('border-t border-ink-950/6', i % 2 === 0 && 'bg-sand-50/60')}>
                    <td className="px-5 py-4">
                      <p className="font-bold text-ink-950">{room?.name ?? row.code}</p>
                      <p className="mt-0.5 text-xs text-ink-500">
                        {row.meal} {room?.detail ? `· ${room.detail}` : ''}
                      </p>
                    </td>
                    <td className="px-5 py-4 font-semibold text-brand-700">{cell(row.sgl)}</td>
                    <td className="px-5 py-4 font-semibold text-brand-700">{cell(row.dbl)}</td>
                    {showTpl && <td className="px-5 py-4 font-semibold">{cell(row.tpl)}</td>}
                    {showExt && <td className="px-5 py-4 font-semibold">{cell(row.ext)}</td>}
                    {showQtrp && <td className="px-5 py-4 font-semibold">{cell(row.qtrp)}</td>}
                    <td className="px-5 py-4 text-right">
                      <Link to={href} className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-gold-500 hover:text-ink-950">
                        Book <ArrowRight size={12} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="flex items-start gap-2 border-t border-ink-950/8 px-5 py-4 text-xs leading-relaxed text-ink-500">
          <Info size={14} className="mt-0.5 shrink-0 text-brand-600" />
          {property.contract.rateNote}
        </p>
      </div>
    </div>
  );
}

export default function PropertyDetail() {
  const { slug } = useParams();
  const property = getProperty(slug ?? '');
  const [offerOpen, setOfferOpen] = useState<number | null>(null);

  if (!property) return <Navigate to="/explore" replace />;

  const gallery = (property.gallery ?? [property.image]).slice(0, 4);
  const amenities = property.contract.amenities;
  const profileActive = PROFILE.filter((b) => property[b.key] === true || property[b.key] === 'on call');

  return (
    <>
      <PageHero
        eyebrow={`${property.atoll}${property.stars ? ` · ${property.stars} stars` : ''}`}
        title={property.name}
        subtitle={property.tagline}
        image={property.image}
      >
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Badge tone="gold">{kindLabel[property.kind]}</Badge>
          {property.stars ? <Stars count={property.stars} /> : null}
          {property.stars && <span className="h-1 w-1 rounded-full bg-white/40" />}
          <span className="flex items-center gap-1.5 text-sm text-white/70">
            <MapPin size={14} /> {property.atoll}
          </span>
          <span className="h-1 w-1 rounded-full bg-white/40" />
          <span className="text-sm text-white/70">{property.transfer}</span>
        </div>
      </PageHero>

      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <section className="-mt-16 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {gallery.map((img, i) => (
            <Reveal key={img + i} delay={i * 70}>
              <img src={img} alt="" loading="lazy" className={cx('aspect-[4/5] w-full rounded-3xl object-cover shadow-lift', i === 0 && 'lg:translate-y-4')} />
            </Reveal>
          ))}
        </section>
      </div>

      {/* About */}
      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <SectionHeading eyebrow={property.name} title={<>The property, in short.</>} />
            <p className="mt-6 max-w-3xl text-base leading-loose text-ink-700">{property.description}</p>
            {property.transferNote && (
              <p className="mt-6 flex max-w-3xl items-start gap-3 rounded-2xl bg-sand-100 p-5 text-sm text-ink-700">
                <Info size={16} className="mt-0.5 shrink-0 text-brand-600" />
                <span><strong className="text-ink-950">Transfers:</strong> {property.transferNote}</span>
              </p>
            )}
            <div className="mt-10">
              <h3 className="text-xs font-black uppercase tracking-[0.24em] text-ink-400">Amenities & inclusions</h3>
              <div className="mt-4 grid gap-8 sm:grid-cols-2">
                {(amenities.complimentary ?? []).length > 0 && (
                  <div>
                    <p className="text-sm font-bold text-brand-700">Complimentary</p>
                    <ul className="mt-3 space-y-2">
                      {amenities.complimentary!.map((a) => (
                        <li key={a} className="flex items-center gap-2 text-sm text-ink-600"><Check size={14} className="text-brand-600" /> {a}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {(amenities.inclusive ?? []).length > 0 && (
                  <div>
                    <p className="text-sm font-bold text-brand-700">Included in plan</p>
                    <ul className="mt-3 space-y-2">
                      {amenities.inclusive!.map((a) => (
                        <li key={a} className="flex items-center gap-2 text-sm text-ink-600"><Check size={14} className="text-gold-600" /> {a}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {(amenities.chargeable ?? []).length > 0 && (
                  <div>
                    <p className="text-sm font-bold text-ink-500">At a charge</p>
                    <ul className="mt-3 space-y-2">
                      {amenities.chargeable!.map((a) => (
                        <li key={a} className="flex items-center gap-2 text-sm text-ink-600"><span className="text-ink-300">·</span> {a}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>

          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-3xl border border-ink-950/6 bg-white p-7 shadow-card">
              <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-brand-700">Quick facts</p>
              <dl className="mt-5 space-y-4 text-sm">
                <div className="flex justify-between gap-4"><dt className="text-ink-500">Type</dt><dd className="text-right font-semibold text-ink-950">{kindLabel[property.kind]}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-ink-500">Meal basis</dt><dd className="text-right font-semibold text-ink-950">{property.contract.mealPlans.map((m) => m.code).join(' · ')}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-ink-500">Transfers</dt><dd className="text-right font-semibold text-ink-950">{property.contract.transfers.map((t) => t.type).join(' / ')}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-ink-500">Contract</dt><dd className="text-right font-semibold text-ink-950">{property.contract.label}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-ink-500">Validity</dt><dd className="text-right font-semibold text-ink-950">{property.contract.valid}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-ink-500">Currency</dt><dd className="text-right font-semibold text-ink-950">{property.contract.currency}</dd></div>
              </dl>
              <Button to={`/book?property=${property.slug}&adults=2`} variant="gold" className="mt-7 w-full">
                Book a stay at {property.name.split(' ')[0]} <ArrowRight size={15} />
              </Button>
            </div>

            {(profileActive.length > 0 || property.doctor === true) && (
              <div className="mt-5 rounded-3xl bg-sand-100 p-7">
                <div className="flex flex-wrap gap-1.5">
                  {profileActive.map((b) => (
                    <span key={b.key} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-ink-700">
                      <b.icon size={12} className="text-brand-600" /> {b.label}
                    </span>
                  ))}
                  {property.doctor === true && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-ink-700">On-call doctor</span>
                  )}
                </div>
                {property.kind === 'resort' && <p className="mt-5 text-sm text-ink-600">{property.name} dive centre and stats available on request.</p>}
              </div>
            )}
          </aside>
        </div>
      </section>

      {/* Rates */}
      <section className="bg-sand-100/70 py-20">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <SectionHeading
            eyebrow="Contract rates"
            title={
              <>
                {property.contract.periods.length} seasons, <span className="italic text-brand-600">live rates.</span>
              </>
            }
            description="Direct from our contract. Pick a season, then book a room straight from the grid."
          />
          <div className="mt-10"><RateGrid property={property} /></div>
        </div>
      </section>

      {/* Offers */}
      {property.contract.offers.length > 0 && (
        <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
          <SectionHeading eyebrow="Special offers" title={<>Deals at {property.name}.</>} />
          <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2">
            {property.contract.offers.map((o, i) => (
              <Reveal key={o.title} delay={i * 60}>
                <div className="flex h-full flex-col rounded-3xl border border-ink-950/6 bg-white p-7 transition-shadow hover:shadow-card">
                  <h3 className="flex items-center gap-2 font-display text-xl font-semibold">
                    <Sparkles size={18} className="text-gold-500" /> {o.title}
                  </h3>
                  <ul className="mt-4 flex-1 space-y-2.5">
                    {o.details.map((d) => (
                      <li key={d} className="flex items-start gap-2 text-sm text-ink-600">
                        <Check size={14} className="mt-0.5 shrink-0 text-brand-600" /> {d}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => setOfferOpen(offerOpen === i ? null : i)}
                    className="mt-6 self-start text-xs font-bold uppercase tracking-widest text-brand-700 underline underline-offset-4"
                  >
                    {offerOpen === i ? 'Hide' : 'Read full terms'}
                  </button>
                  {offerOpen === i && (
                    <p className="mt-3 rounded-xl bg-sand-50 p-4 text-xs leading-relaxed text-ink-500">
                      {property.contract.label} · {property.contract.valid}. Terms apply at booking; offers cannot be combined unless stated.
                    </p>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* Policies */}
      <section className="bg-sand-100/70 py-20">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <SectionHeading eyebrow="Good to know" title="Policies & details." />
          <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
            {property.contract.policies.map((p, i) => (
              <Reveal key={p.title} delay={i * 70}>
                <div className="h-full rounded-3xl border border-ink-950/6 bg-white p-7 shadow-[inset_0_0_0_1px_rgba(15,18,20,0.04)]">
                  <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-brand-700">0{i + 1}</p>
                  <h3 className="mt-3 font-display text-xl font-semibold text-ink-950">{p.title}</h3>
                  <ul className="mt-4 space-y-2.5">
                    {p.items.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-ink-600">
                        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-gold-500" /> {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* More to explore */}
      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading eyebrow="Keep browsing" title="More stays to love." />
          <Button to="/explore" variant="outline" size="sm">
            All stays <ArrowRight size={14} />
          </Button>
        </div>
        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
          {properties.filter((p) => p.slug !== property.slug).slice(0, 3).map((p, i) => (
            <Reveal key={p.slug} delay={i * 80}>
              <Link to={`/property/${p.slug}`} className="group relative block aspect-[4/5] overflow-hidden rounded-3xl">
                <img src={p.image} alt={p.name} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink-950/85 via-ink-950/15 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-6">
                  <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-white/60">{kindLabel[p.kind]} · {p.atoll.split('·')[0].trim()}</p>
                  <h3 className="font-display mt-1 text-3xl font-semibold text-white">{p.name}</h3>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-gold-300">From {formatUSD(lowestNightly(p))}/night</p>
                  <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-white">
                    View & book <ArrowUpRight size={14} />
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-5 pb-24 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-6 rounded-[2.5rem] bg-sand-100 p-10 md:flex-row md:items-center md:p-14">
          <div>
            <h2 className="font-display max-w-xl text-3xl font-semibold sm:text-4xl">
              Ready to lock in rates at {property.name}?
            </h2>
            <p className="mt-3 max-w-xl text-ink-600">Build your stay with dates, meal plan and add-ons — we’ll confirm availability and a final quote within a day.</p>
          </div>
          <Button to={`/book?property=${property.slug}&adults=2`} variant="dark" size="lg">
            Start booking <ArrowRight size={16} />
          </Button>
        </div>
      </section>
    </>
  );
}