import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowRight, Calendar, Search } from 'lucide-react';
import { PageHero } from '@/components/PageHero';
import { Badge, Button, Reveal, SectionHeading, cx } from '@/components/ui';
import { IMG } from '@/data/images';
import { formatUSD } from '@/lib/format';
import { getContent } from '@/content/client';

const TABS = [
  { key: 'Maldives', label: 'Maldives' },
  { key: 'Specials', label: 'Special offers' },
] as const;

export default function Packages() {
  const [params, setParams] = useSearchParams();
  const initialQ = params.get('q') ?? '';
  const [query, setQuery] = useState(initialQ);
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('Maldives');

  const packages = getContent().packages;
  const q = query.toLowerCase();
  const filtered = useMemo(
    () =>
      packages
        .filter((p) => p.category === tab)
        .filter((p) => [p.title, p.region, p.id, p.label ?? ''].some((s) => s.toLowerCase().includes(q))),
    [tab, q, packages]
  );

  const highlight = initialQ ? packages.find((p) => p.id === initialQ) : undefined;

  const setTabAndClear = (k: (typeof TABS)[number]['key']) => {
    setTab(k);
    const next = new URLSearchParams();
    if (query) next.set('q', query);
    setParams(next, { replace: true });
  };

  const onSearch = (value: string) => {
    setQuery(value);
    const next = new URLSearchParams();
    if (value) next.set('q', value);
    setParams(next, { replace: true });
  };

  return (
    <>
      <PageHero
        eyebrow="Packages & offers"
        title={
          <>
            Trips we’ve priced, <span className="italic text-gold-600">for real.</span>
          </>
        }
        subtitle="Maldives stays turned into full trips — real numbers from real contracts, transfers included."
        image={IMG.maldivesResort}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
          }}
          className="relative mt-8 max-w-md"
        >
          <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            value={query}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search Dhigali, honeymoon, all-inclusive…"
            className="w-full rounded-full border border-ink-950/12 bg-white py-3.5 pl-11 pr-4 text-sm text-ink-950 placeholder:text-ink-400 focus:border-gold-500 focus:outline-none"
          />
        </form>
      </PageHero>

      {highlight && (
        <section className="mx-auto max-w-7xl px-5 pt-16 lg:px-8">
          <div className="flex flex-col gap-6 rounded-[2rem] border border-gold-500/30 bg-gradient-to-r from-sand-100 to-cream p-8 md:flex-row md:items-center md:justify-between md:p-10">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.26em] text-gold-600">Featured · {highlight.region}</p>
              <h2 className="font-display mt-2 text-3xl font-semibold">{highlight.title}</h2>
              <p className="mt-2 max-w-2xl text-sm text-ink-600">{highlight.nights} · {highlight.label}</p>
              <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-ink-600">
                {highlight.inclusions.map((inc) => (
                  <li key={inc} className="inline-flex items-center gap-1.5">· {inc}</li>
                ))}
              </ul>
            </div>
            <div className="shrink-0 text-left md:text-right">
              <p className="text-xs font-bold uppercase tracking-widest text-ink-500">From</p>
              <p className="font-display text-5xl font-semibold text-brand-700">{formatUSD(highlight.from)}</p>
              <Button to={`/contact?interest=${encodeURIComponent(`${highlight.title} package`)}`} variant="dark" className="mt-4">
                Request this trip <ArrowRight size={15} />
              </Button>
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <div className="flex flex-wrap gap-1.5 rounded-full bg-sand-100 p-1.5 self-start">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTabAndClear(t.key)}
              className={cx(
                'rounded-full px-4 py-2 text-xs font-bold transition-all',
                tab === t.key ? 'bg-brand-600 text-white shadow' : 'text-ink-600 hover:text-ink-950'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="mt-14 rounded-3xl bg-sand-100/70 p-16 text-center">
            <p className="font-display text-2xl font-semibold">Nothing matched “{query}”.</p>
            <p className="mt-2 text-sm text-ink-600">Try another search, or ask us — most trips start as a question.</p>
            <Button to="/contact?interest=Custom%20package" variant="dark" className="mt-6">Ask us anyway <ArrowRight size={15} /></Button>
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {filtered.map((p, i) => (
              <Reveal key={p.id} delay={(i % 4) * 70} className="flex">
                <a
                  href={`/contact?interest=${encodeURIComponent(`${p.title} package`)}`}
                  className={cx(
                    'group flex w-full flex-col overflow-hidden rounded-3xl bg-white shadow-[inset_0_0_0_1px_rgba(15,18,20,0.06)] transition-all hover:-translate-y-1.5 hover:shadow-card',
                    p.id === highlight?.id && 'ring-2 ring-gold-500'
                  )}
                >
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img src={p.image} alt={p.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-gradient-to-t from-ink-950/60 to-transparent" />
                    <div className="absolute left-4 top-4"><Badge tone="light">{p.category}</Badge></div>
                    {p.badge && <div className="absolute right-4 top-4"><Badge tone="gold">{p.badge}</Badge></div>}
                    <div className="absolute bottom-4 left-4 text-white">
                      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/70">{p.region}</p>
                      <h3 className="font-display text-2xl font-semibold leading-tight">{p.title}</h3>
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <p className="flex items-center gap-2 text-xs text-ink-500"><Calendar size={13} /> {p.nights} · {p.label}</p>
                    <ul className="mt-3 flex-1 space-y-1.5">
                      {p.inclusions.slice(0, 4).map((inc) => (
                        <li key={inc} className="text-xs leading-relaxed text-ink-600">{inc}</li>
                      ))}
                    </ul>
                    <div className="mt-4 flex items-end justify-between border-t border-ink-950/8 pt-4">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-400">From</p>
                        <p className="font-display text-2xl font-semibold text-brand-700">{formatUSD(p.from)}</p>
                      </div>
                      <span className="text-xs font-bold uppercase tracking-widest text-brand-700 underline decoration-2 underline-offset-4">
                        Request
                      </span>
                    </div>
                  </div>
                </a>
              </Reveal>
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-24 lg:px-8">
        <div className="relative overflow-hidden rounded-[2.5rem] border border-ink-950/6 bg-sand-100 p-10 text-center md:p-14">
          <div className="pointer-events-none absolute inset-0 opacity-15" style={{ backgroundImage: 'radial-gradient(circle at 85% 15%, rgb(var(--color-gold-500)) 0%, transparent 40%), radial-gradient(circle at 10% 90%, rgb(var(--color-brand-500)) 0%, transparent 45%)' }} />
          <div className="relative">
            <SectionHeading align="center" eyebrow="Don’t see it?" title="Packages are a shortcut, not a ceiling." />
            <p className="mx-auto mt-4 max-w-2xl text-ink-600">
              Every trip here can be stretched, shortened, upgraded or entirely re-arranged around your dates. Tell us the
              details and we’ll price it fresh.
            </p>
            <Button to="/contact?interest=Custom%20itinerary" variant="gold" size="lg" className="mt-8">
              Build my trip <ArrowRight size={16} />
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}