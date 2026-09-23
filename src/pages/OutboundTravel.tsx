import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Calendar, Compass, Globe2, MapPin, Plane, Ticket } from 'lucide-react';
import { PageHero } from '@/components/PageHero';
import { Badge, Button, Reveal, SectionHeading } from '@/components/ui';
import { IMG } from '@/data/images';
import { getPackages } from '@/data/outbound';
import { formatUSD } from '@/lib/format';
import { cx } from '@/components/ui';
import { getContent } from '@/content/client';

const STEPS = [
  { n: '01', t: 'Tell us where', d: 'A country, a vibe, or “surprise me”. Dates and people are all we need.' },
  { n: '02', t: 'We build the route', d: 'Flights, stays, transfers, insurance — quoted together, compared honestly.' },
  { n: '03', t: 'You book it easy', d: 'Pay how you like, travel with 24/7 Ace support from Malé.' },
];

export default function OutboundTravel() {
  const [params] = useSearchParams();
  const dest = params.get('dest');

  useEffect(() => {
    if (dest) {
      const el = document.getElementById(`dest-${dest}`);
      if (el) {
        const y = el.getBoundingClientRect().top + window.scrollY - 110;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }
  }, [dest]);

  const specials = getPackages('Specials').slice(0, 4);
  const outbound = getContent().outbound;
  const outboundDestinations = outbound.destinations;

  return (
    <>
      <PageHero
        eyebrow="Outbound travel"
        title={
          <>
            The world is <span className="italic text-gold-600">closer than it looks.</span>
          </>
        }
        subtitle="Which way does your calendar point? International holidays arranged from Malé — flights, stays and full itineraries, quoted together."
        image={IMG.europe}
      />

      {/* Destinations */}
      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <SectionHeading
          eyebrow="Our destinations"
          title={
            <>
              Four corners of the <span className="italic text-brand-600">world map.</span>
            </>
          }
          description={outbound.blurb}
        />
        <div className="mt-14 space-y-8">
          {outboundDestinations.map((d, i) => (
            <Reveal key={d.slug} delay={i * 60}>
              <div
                id={`dest-${d.slug}`}
                className={cx(
                  'grid scroll-mt-28 items-center gap-8 rounded-[2rem] p-8 lg:grid-cols-2 lg:p-10',
                  i % 2 === 0 ? 'bg-white shadow-[inset_0_0_0_1px_rgba(15,18,20,0.06)] lg:grid-cols-[1fr_1.2fr]' : 'bg-sand-100/70 lg:grid-cols-[1.2fr_1fr] [&>*:first-child]:lg:order-2'
                )}
              >
                <img src={d.image} alt={d.name} loading="lazy" className="aspect-[16/10] w-full rounded-3xl object-cover" />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-gold-500">{d.eyebrow}</p>
                  <h3 className="font-display mt-2 text-4xl font-semibold sm:text-5xl">{d.name}</h3>
                  <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-bold uppercase tracking-widest text-brand-700">
                    {d.cities.map((c) => (
                      <span key={c} className="inline-flex items-center gap-1.5"><MapPin size={12} /> {c}</span>
                    ))}
                  </p>
                  <p className="mt-4 max-w-xl leading-relaxed text-ink-600">{d.blurb}</p>
                  <div className="mt-6 flex flex-wrap items-center gap-4">
                    <p className="text-sm text-ink-600">
                      From <span className="font-display text-2xl font-semibold text-brand-700">{formatUSD(d.fromPrice)}</span>
                    </p>
                    <Button to={`/contact?interest=${encodeURIComponent(`${d.name} outbound trip`)}`} variant="dark" size="md">
                      Plan this trip <ArrowRight size={15} />
                    </Button>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-sand-100/70 py-20">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <SectionHeading eyebrow="How it works" title="Three steps to anywhere." />
          <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 80}>
                <div className="h-full rounded-3xl border border-ink-950/6 bg-white p-7 shadow-[inset_0_0_0_1px_rgba(15,18,20,0.04)]">
                  <p className="font-display text-5xl font-semibold text-gold-500/70">{s.n}</p>
                  <h3 className="mt-4 font-display text-2xl font-semibold text-ink-950">{s.t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-600">{s.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Specials relevant to outbound */}
      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading eyebrow="Current offers" title="Outbound deals right now." />
          <Button to="/packages" variant="outline" size="sm">
            View all packages <ArrowRight size={14} />
          </Button>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {specials.map((p, i) => (
            <Reveal key={p.id} delay={i * 70}>
              <a href={`/packages?q=${encodeURIComponent(p.id)}`} className="group block h-full overflow-hidden rounded-3xl bg-white shadow-[inset_0_0_0_1px_rgba(15,18,20,0.06)] transition-all hover:-translate-y-1.5 hover:shadow-card">
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img src={p.image} alt={p.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink-950/60 to-transparent" />
                  <div className="absolute left-4 top-4"><Badge tone="gold">{p.badge ?? 'Offer'}</Badge></div>
                </div>
                <div className="p-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-ink-400">{p.region}</p>
                  <h3 className="font-display mt-1 text-xl font-semibold">{p.title}</h3>
                  <p className="mt-2 flex items-center gap-2 text-xs text-ink-500"><Calendar size={13} /> {p.nights}</p>
                  <p className="mt-3">
                    From <span className="font-display text-2xl font-semibold text-brand-700">{formatUSD(p.from)}</span>
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-brand-700">
                    View trip <ArrowUpRight size={13} />
                  </span>
                </div>
              </a>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-5 pb-24 lg:px-8">
        <div className="flex flex-col items-center gap-8 rounded-[2.5rem] bg-sand-100 p-12 text-center md:p-16">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-brand-600 text-white">
            <Compass size={28} />
          </span>
          <h2 className="font-display max-w-2xl text-balance text-4xl font-semibold">
            We arrange trips to <span className="italic text-brand-600">anywhere</span> — visas, flights, hotels and fun.
          </h2>
          <Button to="/contact?interest=Outbound%20travel" variant="dark" size="lg">
            Start planning <ArrowRight size={16} />
          </Button>
          <p className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-bold uppercase tracking-widest text-ink-500">
            <span className="inline-flex items-center gap-2"><Plane size={13} /> Flights</span>
            <span className="inline-flex items-center gap-2"><Globe2 size={13} /> Visa assistance</span>
            <span className="inline-flex items-center gap-2"><Ticket size={13} /> Tours & cruises</span>
          </p>
        </div>
      </section>
    </>
  );
}