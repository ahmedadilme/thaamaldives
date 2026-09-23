import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CalendarCheck2,
  Compass,
  DoorOpen,
  Fish,
  MapPin,
  MoveRight,
  Palette,
  Phone,
  Route,
  Ship,
  Sparkles,
  Users,
} from 'lucide-react';
import { Badge, Button, Eyebrow, Reveal, SectionHeading, Stars, cx } from './ui';
import { HERO_IMAGES } from '@/data/images';
import { properties, kindLabel, lowestNightly } from '@/data/properties';
import { getPackages } from '@/data/outbound';
import { services } from '@/data/services';
import { stories } from '@/data/stories';
import { CONTACT } from '@/lib/enquiry';
import { formatUSD } from '@/lib/format';
import { getContent } from '@/content/client';
import { getActiveOffers } from '@/content/offers';

/* ----------------------------------- Hero ---------------------------------- */

const HERO_VIDEO_INTERVAL = 7000;

const HERO_LOCAL_VIDEOS: string[] = Object.values(
  import.meta.glob('/src/assets/hero/*.{mp4,webm}', { eager: true, as: 'url' })
);

function ScrollCue() {
  return (
    <button
      aria-label="Scroll down"
      className="absolute bottom-7 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-2 text-ink-500 transition-colors hover:text-ink-800 md:flex"
    >
      <span className="text-[10px] font-semibold uppercase tracking-[0.3em]">Scroll</span>
      <span className="block h-9 w-5 rounded-full border border-ink-950/25 p-1">
        <span className="mx-auto block h-1.5 w-1.5 animate-bounce rounded-full bg-gold-400" />
      </span>
    </button>
  );
}

export function Hero() {
  const [index, setIndex] = useState(0);
  const hero = getContent().home.hero;
  const cmsVideos = hero.videos ?? [];
  const videos = cmsVideos.length > 0 ? cmsVideos : HERO_LOCAL_VIDEOS;
  const slides = videos.length > 0 ? videos : HERO_IMAGES;
  const isVideo = videos.length > 0;

  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % slides.length), HERO_VIDEO_INTERVAL);
    return () => clearInterval(t);
  }, [slides.length]);

  return (
    <section className="relative flex min-h-[100svh] items-center overflow-hidden bg-cream">
      {slides.map((src, i) =>
        isVideo ? (
          <video
            key={src}
            src={src}
            poster={HERO_IMAGES[i % HERO_IMAGES.length]}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            className={cx(
              'absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-out',
              i === index ? 'opacity-100' : 'opacity-0'
            )}
          />
        ) : (
          <img
            key={src}
            src={src}
            alt=""
            className={cx(
              'absolute inset-0 h-full w-full object-cover transition-opacity duration-[1600ms] ease-out',
              i === index ? 'opacity-100' : 'opacity-0'
            )}
          />
        )
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-cream/50 via-cream/20 to-cream/65" />
      <div className="absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_30%,transparent_0%,rgba(250,244,232,0.45)_100%)]" />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-5 pb-36 pt-36 lg:px-8">
        <div className="max-w-3xl">
          <p className="animate-fade-in text-[11px] font-bold uppercase tracking-[0.4em] text-brand-700">
            {hero.eyebrow}
          </p>
          <h1 className="font-display mt-6 text-balance text-display-xl font-semibold leading-none text-ink-950">
            {hero.titleLine1}
            <span className="block italic text-gold-600">{hero.titleAccent}</span>
          </h1>
          <p className="mt-6 max-w-xl animate-fade-in-up text-base leading-relaxed text-ink-700 [animation-delay:200ms] sm:text-lg">
            {hero.subtitle}
          </p>
          <div className="mt-9 flex flex-wrap gap-4">
            <Button to="/explore" variant="gold" size="lg">
              Explore stays <ArrowRight size={15} />
            </Button>
            <Button href={CONTACT.phoneHref} variant="outline" size="lg">
              <Phone size={15} /> Talk to a travel expert
            </Button>
          </div>
        </div>
      </div>
      <ScrollCue />
    </section>
  );
}

/* ------------------------------ Journey selector ---------------------------- */

const JOURNEYS = [
  { key: 'stays', label: 'Stays', icon: DoorOpen },
  { key: 'experiences', label: 'Experiences', icon: Fish },
  { key: 'packages', label: 'Packages', icon: Compass },
] as const;

export function JourneySelector() {
  const [active, setActive] = useState<(typeof JOURNEYS)[number]['key']>('stays');
  const [destination, setDestination] = useState(properties[0]?.name ?? '');
  const [travellers, setTravellers] = useState('2 adults');
  const navigate = useNavigate();

  const options =
    active === 'stays'
      ? properties.map((p) => p.name)
      : active === 'experiences'
        ? ['Diving', 'Sunset cruises', 'Sandbank picnics', 'Local island life', 'Whale sharks']
        : getPackages('Maldives').map((p) => p.title);

  const go = (e: FormEvent) => {
    e.preventDefault();
    if (active === 'stays') {
      const property = properties.find((p) => p.name === destination);
      navigate(`/book?property=${property?.slug ?? ''}&adults=${travellers.startsWith('1') ? 1 : 2}`);
    } else if (active === 'experiences') {
      navigate(`/explore?tab=rooms&q=${encodeURIComponent(destination)}`);
    } else {
      const pkg = getPackages('Maldives').find((p) => p.title === destination);
      navigate(`/packages?q=${pkg?.id ?? ''}`);
    }
  };

  return (
    <section className="relative z-20 mx-auto -mt-20 max-w-6xl px-5 lg:px-8">
      <Reveal>
        <div className="rounded-[2rem] border border-ink-950/5 bg-white px-6 py-7 shadow-lift sm:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Eyebrow>Plan your stay</Eyebrow>
              <h2 className="font-display mt-3 text-3xl font-semibold sm:text-4xl">
                Find your island moment
              </h2>
            </div>
            <div className="flex flex-wrap gap-1 rounded-full bg-sand-100 p-1">
              {JOURNEYS.map((j) => {
                const Icon = j.icon;
                return (
                  <button
                    key={j.key}
                    onClick={() => {
                      setActive(j.key);
                      setDestination(
                        j.key === 'stays' ? properties[0]?.name : j.key === 'experiences' ? 'Diving' : getPackages('Maldives')[0]?.title ?? ''
                      );
                    }}
                    className={cx(
                      'inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold tracking-wide transition-all',
                      active === j.key ? 'bg-brand-600 text-white shadow' : 'text-ink-600 hover:text-ink-950'
                    )}
                  >
                    <Icon size={14} /> {j.label}
                  </button>
                );
              })}
            </div>
          </div>

          <form
            onSubmit={go}
            className="mt-7 grid grid-cols-1 gap-4 border-t border-ink-950/8 pt-6 md:grid-cols-[1fr_1fr_auto] md:items-end"
          >
            <label className="block">
              <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-ink-500">
                <MapPin size={13} /> {active === 'experiences' ? 'Experience' : active === 'packages' ? 'Package' : 'Property'}
              </span>
              <span className="relative mt-2 block">
                <select
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-ink-950/12 bg-sand-50 px-4 py-3.5 pr-10 text-sm text-ink-950 focus:border-brand-500 focus:outline-none"
                >
                  {options.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
                <MoveRight size={15} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink-400" />
              </span>
            </label>
            <label className="block">
              <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-ink-500">
                <Users size={13} /> Travellers
              </span>
              <span className="relative mt-2 block">
                <select
                  value={travellers}
                  onChange={(e) => setTravellers(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-ink-950/12 bg-sand-50 px-4 py-3.5 pr-10 text-sm text-ink-950 focus:border-brand-500 focus:outline-none"
                >
                  {['1 adult', '2 adults', '2 adults + 1 child', '2 adults + 2 children', '3–4 adults', 'Family group'].map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
                <MoveRight size={15} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink-400" />
              </span>
            </label>
            <Button type="submit" variant="gold" size="lg" className="md:h-[3.4rem]">
              Explore <ArrowRight size={16} />
            </Button>
          </form>
        </div>
      </Reveal>
    </section>
  );
}

/* ------------------------------ Featured stays ------------------------------ */

export function FeaturedStays() {
  const featured = [...properties].sort((a, b) => (b.stars ?? 0) - (a.stars ?? 0)).slice(0, 4);

  return (
    <section className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeading
          eyebrow="Featured stays"
          title="Islands we’d book you into tomorrow."
          description="Every stay is backed by a live contract — see real per-night rates before you ask."
        />
        <Button to="/explore" variant="outline" size="sm">
          Browse all stays <ArrowRight size={14} />
        </Button>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {featured.map((p, i) => (
          <Reveal key={p.slug} delay={(i % 4) * 70}>
            <div className="group flex h-full flex-col overflow-hidden rounded-3xl bg-white shadow-[inset_0_0_0_1px_rgba(15,18,20,0.06)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-card">
              <a href={`/property/${p.slug}`} className="relative block aspect-[4/3] overflow-hidden">
                <img src={p.image} alt={p.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink-950/65 to-transparent" />
                <div className="absolute left-4 top-4 flex gap-2">
                  <Badge tone="light">{kindLabel[p.kind]}</Badge>
                  {p.stars ? <Badge tone="gold">{'★'.repeat(p.stars)}</Badge> : null}
                </div>
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/70">{p.atoll.split('·')[0].trim()}</p>
                  <h3 className="font-display mt-1 text-3xl font-semibold text-white">{p.name}</h3>
                </div>
              </a>
              <div className="flex flex-1 flex-col p-5">
                <p className="text-sm italic leading-relaxed text-ink-600">“{p.tagline}”</p>
                <div className="mt-5 flex items-end justify-between border-t border-ink-950/8 pt-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-400">From · per night</p>
                    <p className="font-display text-2xl font-semibold text-brand-700">{formatUSD(lowestNightly(p))}</p>
                  </div>
                  <a href={`/property/${p.slug}`} className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-brand-700">
                    View <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
                  </a>
                </div>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------- Kinds of stay ------------------------------ */

const STAY_COLUMNS = [
  { key: 'resort', title: 'Resorts', icon: Sparkles, items: ['Overwater villas', 'All-inclusive plans', 'Seaplanes', 'House reefs', 'Kids clubs'], dest: 'type=resort' },
  { key: 'hotel', title: 'Hotels', icon: Route, items: ['Malé & Hulhumalé', 'City comfort', 'Stopovers', 'Business stays', 'Rooftop views'], dest: 'type=hotel' },
  { key: 'guesthouse', title: 'Guest Houses', icon: Palette, items: ['Local island life', 'Dive shops', 'Beach BBQ nights', 'Ferry-friendly', 'Budget escapes'], dest: 'type=guesthouse' },
  { key: 'rooms', title: 'Rooms & rates', icon: Fish, items: ['Every room on contract', 'Boards & seasons', 'Live per-night prices', 'Instant booking', 'Add-ons'], dest: 'tab=rooms' },
] as const;

export function StayKinds() {
  return (
    <section id="discover-maldives" className="bg-sand-100/70 py-24">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_1.9fr] lg:items-end">
          <SectionHeading
            eyebrow="Ways to stay"
            title={
              <>
                Four ways into the same <span className="italic text-brand-600">beautiful problem.</span>
              </>
            }
            description="Resort, hotel, guest house — or skip straight to the rooms. Start where your kind of escape begins."
          />
          <Reveal className="justify-self-start lg:justify-self-end">
            <Button to="/explore" variant="dark" size="lg">
              Explore the Maldives <ArrowRight size={16} />
            </Button>
          </Reveal>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STAY_COLUMNS.map((col, i) => {
            const Icon = col.icon;
            return (
              <Reveal key={col.title} delay={i * 90}>
                <a
                  href={`/explore?${col.dest}`}
                  className="group block h-full rounded-3xl border border-ink-950/6 bg-white p-7 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-card"
                >
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-700 transition-colors group-hover:bg-brand-600 group-hover:text-white">
                    <Icon size={22} />
                  </span>
                  <h3 className="font-display mt-5 text-2xl font-semibold">{col.title}</h3>
                  <ul className="mt-4 space-y-2.5">
                    {col.items.map((item) => (
                      <li key={item} className="flex items-center gap-2 text-sm text-ink-600">
                        <span className="h-1 w-1 rounded-full bg-gold-400" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <span className="mt-6 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-brand-700">
                    Explore <MoveRight size={14} className="transition-transform group-hover:translate-x-1" />
                  </span>
                </a>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ Special offers ------------------------------ */

export function SpecialOffers() {
  const offers = getActiveOffers();
  const hasCustom = (getContent().offers?.length ?? 0) > 0;

  return (
    <section className="bg-sand-100/70 py-24">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading
            eyebrow="Special offers"
            title="Deals worth leaving the island for."
            description="Contract rates brought to life as trips — resorts, transfers and stays in one price."
          />
          <Button to="/packages" variant="dark" size="sm">
            View all offers <ArrowRight size={14} />
          </Button>
        </div>

        {hasCustom ? (
          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {offers.map((o, i) => (
              <Reveal key={o.id} delay={i * 80}>
                <a href={o.ctaHref ?? '/packages'} className="group block h-full overflow-hidden rounded-3xl bg-white shadow-[inset_0_0_0_1px_rgba(15,18,20,0.06)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-card">
                  <div className="relative aspect-[4/3] overflow-hidden">
                    {o.poster ? (
                      <img src={o.poster} alt={o.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-brand-600 via-brand-700 to-ink-950" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-ink-950/70 to-transparent" />
                    {o.badge && <div className="absolute left-4 top-4"><Badge tone="gold">{o.badge}</Badge></div>}
                    <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                      <p className="font-display text-2xl font-semibold leading-tight text-white">{o.title}</p>
                    </div>
                  </div>
                  <div className="p-5">
                    <p className="text-sm leading-relaxed text-ink-600">{o.subtitle}</p>
                    <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-brand-700">
                      {o.ctaLabel ?? 'View offer'} <ArrowRight size={13} />
                    </span>
                  </div>
                </a>
              </Reveal>
            ))}
          </div>
        ) : (
          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {getPackages('Maldives').slice(0, 4).map((p, i) => (
              <Reveal key={p.id} delay={i * 80}>
                <a href={`/packages?q=${encodeURIComponent(p.id)}`} className="group block h-full overflow-hidden rounded-3xl bg-white shadow-[inset_0_0_0_1px_rgba(15,18,20,0.06)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-card">
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img src={p.image} alt={p.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-gradient-to-t from-ink-950/70 to-transparent" />
                    {p.badge && <div className="absolute left-4 top-4"><Badge tone="gold">{p.badge}</Badge></div>}
                    <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/70">{p.region}</p>
                        <p className="font-display mt-1 text-2xl font-semibold text-white">{p.title}</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-5">
                    <p className="flex items-center gap-2 text-xs text-ink-500"><CalendarCheck2 size={13} /> {p.nights}</p>
                    <p className="mt-3 text-sm text-ink-600">
                      From <span className="font-display text-2xl font-semibold text-brand-700">{formatUSD(p.from)}</span>
                    </p>
                    <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-brand-700">
                      View trip <ArrowRight size={13} />
                    </span>
                  </div>
                </a>
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ----------------------------- Services section ----------------------------- */

export function ServicesSection() {
  const core = services.filter((s) => !s.module);

  return (
    <section className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeading
          eyebrow="Travel made simple"
          title={
            <>
              Everything around the stay, <span className="italic text-brand-600">handled.</span>
            </>
          }
          description="Transfers, island packages, support and a human answer at every step."
        />
        <Button to="/travel-services" variant="outline" size="sm">
          See the services <ArrowRight size={14} />
        </Button>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {core.map((s, i) => (
          <Reveal key={s.slug} delay={i * 60}>
            <a
              href={`/travel-services#${s.slug}`}
              className="group flex h-full flex-col rounded-2xl border border-ink-950/6 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-card"
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-gold-50 text-gold-600 transition-colors group-hover:bg-gold-500 group-hover:text-ink-950">
                <Compass size={20} />
              </span>
              <h3 className="mt-4 font-display text-xl font-semibold">{s.name}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-600">{s.blurb}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-brand-700">
                Learn more <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
              </span>
            </a>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* --------------------------------- Why Thaa --------------------------------- */

export function WhyAce() {
  const stats = getContent().home.stats;

  return (
    <section className="relative overflow-hidden bg-cream py-24">
      <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'radial-gradient(circle at 30% 20%, rgb(var(--color-brand-500)) 0%, transparent 45%), radial-gradient(circle at 80% 80%, rgb(var(--color-gold-500)) 0%, transparent 40%)' }} />
      <div className="relative mx-auto grid max-w-7xl gap-14 px-5 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:px-8">
        <div>
          <SectionHeading
            eyebrow="Why Thaa Maldives"
            title={
              <>
                Book with someone <span className="italic text-brand-600">standing on the islands.</span>
              </>
            }
            description="We hold the contracts, we have the boats arranged, and we answer the phone in Malé. You get resort rates and local knowledge in one conversation."
          />
          <div className="mt-9 flex flex-wrap gap-4">
            <Button to="/contact" variant="gold" size="lg">
              <Phone size={16} /> Talk to a Travel Expert
            </Button>
            <Button href={CONTACT.phoneHref} variant="outline" size="lg">
              {CONTACT.phone}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {stats.map((s, i) => (
            <Reveal key={s.value} delay={i * 100}>
              <div className="rounded-3xl border border-ink-950/6 bg-white p-6 shadow-[inset_0_0_0_1px_rgba(15,18,20,0.04)]">
                <p className="font-display text-4xl font-semibold text-brand-700 sm:text-5xl">{s.value}</p>
                <p className="mt-2 text-sm text-ink-600">{s.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ Stories section ----------------------------- */

export function StoriesSection() {
  const featured = stories.filter((s) => !s.module).slice(0, 3);

  return (
    <section className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeading
          eyebrow="Travel guide"
          title="Notes from the islands."
          description="Honest planning guides from the team that lives on this side of the itinerary."
        />
        <Button to="/travel-guide" variant="outline" size="sm">
          Read the guide <ArrowRight size={14} />
        </Button>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
        {featured.map((s, i) => (
          <Reveal key={s.slug} delay={i * 90}>
            <a href={`/travel-guide#${s.slug}`} className="group block overflow-hidden rounded-3xl bg-white shadow-[inset_0_0_0_1px_rgba(15,18,20,0.06)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-card">
              <div className="relative aspect-[16/10] overflow-hidden">
                <img src={s.image} alt={s.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute left-4 top-4"><Badge>{s.category}</Badge></div>
              </div>
              <div className="p-6">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-400">{s.readMins} min read</p>
                <h3 className="font-display mt-2 text-2xl font-semibold leading-snug group-hover:text-brand-700">{s.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-ink-600">{s.excerpt}</p>
              </div>
            </a>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------ Testimonials -------------------------------- */

export function TestimonialsSection() {
  const list = getContent().testimonials;

  return (
    <section className="bg-sand-100/70 py-24">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <SectionHeading align="center" eyebrow="Real travellers" title="Word of mouth, in writing." />
        <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
          {list.map((t, i) => (
            <Reveal key={t.id} delay={i * 90}>
              <figure className="flex h-full flex-col rounded-3xl bg-white p-7 shadow-[inset_0_0_0_1px_rgba(15,18,20,0.05)]">
                <Stars count={t.rating} />
                <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-ink-700">“{t.quote}”</blockquote>
                <figcaption className="mt-6 border-t border-ink-950/8 pt-4">
                  <p className="font-semibold text-ink-950">{t.name}</p>
                  <p className="mt-0.5 text-xs uppercase tracking-wide text-ink-500">{t.trip}</p>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------- How it works ------------------------------ */

const HOW = [
  { step: '01', icon: MoveRight, t: 'Browse the catalogue', d: 'Resorts, hotels and guest houses with their real contract rates laid out room by room.' },
  { step: '02', icon: Ship, t: 'Book with an estimate', d: 'Pick a room, board and dates in the wizard — the total updates live as you add nights and extras.' },
  { step: '03', icon: CalendarCheck2, t: 'We confirm & arrange', d: 'A travel expert confirms availability, locks the rate and handles transfers. You pack.' },
] as const;

export function HowItWorks() {
  return (
    <section className="mx-auto max-w-7xl px-5 pb-24 lg:px-8">
      <SectionHeading align="center" eyebrow="How it works" title="Three steps to the water’s edge." />
      <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
        {HOW.map((h, i) => {
          const Icon = h.icon;
          return (
            <Reveal key={h.step} delay={i * 90}>
              <div className="relative h-full rounded-3xl border border-ink-950/6 bg-white p-7">
                <span className="font-display text-6xl font-semibold text-sand-200">{h.step}</span>
                <span className="absolute right-7 top-7 grid h-11 w-11 place-items-center rounded-2xl bg-gold-50 text-gold-600">
                  <Icon size={20} />
                </span>
                <h3 className="font-display -mt-4 text-2xl font-semibold">{h.t}</h3>
                <p className="mt-3 text-sm leading-relaxed text-ink-600">{h.d}</p>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

/* ------------------------------ Newsletter hero ----------------------------- */

export function NewsletterSection() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  return (
    <section className="mx-auto max-w-7xl px-5 pb-24 lg:px-8">
      <Reveal>
        <div className="relative overflow-hidden rounded-[2.5rem] border border-ink-950/6 bg-sand-100 px-7 py-16 md:px-16">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 85% 20%, rgb(var(--color-gold-500)) 0%, transparent 40%), radial-gradient(circle at 10% 90%, rgb(var(--color-brand-500)) 0%, transparent 45%)' }} />
          <div className="relative grid items-center gap-10 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-brand-700">Newsletter</p>
              <h2 className="font-display mt-4 text-4xl font-semibold text-ink-950 sm:text-5xl">
                Island news, offers and <span className="italic text-gold-600">the occasional great rate.</span>
              </h2>
              <p className="mt-4 max-w-md text-ink-600">
                New contract stays, seasonal offers and honest planning notes from Malé — a few times a month, never spam.
              </p>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (email.trim()) {
                  setSent(true);
                  setEmail('');
                }
              }}
              className="flex w-full flex-col gap-3 sm:flex-row"
            >
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="w-full flex-1 rounded-full border border-ink-950/12 bg-white px-5 py-4 text-sm text-ink-950 placeholder:text-ink-400 focus:border-gold-500 focus:outline-none"
              />
              <Button type="submit" variant="gold" size="lg">
                Subscribe
              </Button>
            </form>
            {sent && <p className="text-sm text-brand-700 lg:col-start-2">You’re on the list — see you on the lagoon.</p>}
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ------------------------------ Promo banner -------------------------------- */

export function PromoBanner() {
  return (
    <section className="border-y border-gold-600/20 bg-gradient-to-r from-gold-500 via-gold-400 to-gold-500 py-5">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-5 text-ink-950 sm:flex-row lg:px-8">
        <p className="flex items-center gap-3 text-center text-sm font-bold sm:text-left">
          <Sparkles size={16} />
          DHIGALI HONEYMOON PACKAGE — EARLY-BIRD SAVINGS ON PREMIUM ALL-INCLUSIVE
        </p>
        <a href="/packages?q=mdv-dhigali-honeymoon" className="group inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] underline decoration-2 underline-offset-4">
          Explore offer <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
        </a>
      </div>
    </section>
  );
}