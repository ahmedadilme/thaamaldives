import { ArrowRight, CalendarHeart, HandHeart, MapPin, Quote, ShieldCheck, Sparkles } from 'lucide-react';
import { PageHero } from '@/components/PageHero';
import { Button, Reveal, SectionHeading, Stars } from '@/components/ui';
import { IMG } from '@/data/images';
import { testimonials } from '@/data/testimonials';

const VALUES = [
  { icon: MapPin, t: 'Local to the core', d: 'Based in Malé for over 15 years — the island knowledge doesn’t come from a manual.' },
  { icon: Sparkles, t: 'Real prices', d: 'Contract rates, printed openly. If a deal is “special”, we tell you why and when it ends.' },
  { icon: HandHeart, t: 'Human support', d: 'One dedicated person on your trip, before, during and after — 24/7 in an emergency.' },
  { icon: ShieldCheck, t: 'No corner cutting', d: 'Trusted transfers, vetted resorts and insurance advice, every single time.' },
];

const STATS = [
  { value: '2007', label: 'Serving travellers since' },
  { value: '15+', label: 'Years in Maldives travel' },
  { value: '40+', label: 'Partner resorts & destinations' },
  { value: '12k+', label: 'Travellers looked after' },
];

export default function About() {
  return (
    <>
      <PageHero
eyebrow="About Thaa Maldives"
        title={
          <>
            The Maldives team <span className="italic text-gold-600">in your corner.</span>
          </>
        }
        subtitle="Thaa Maldives sells the islands — resorts, hotels and guest houses across the archipelago, with real contract rates and people who answer in Malé."
        image={IMG.maldivesLagoon}
      />

      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="grid items-start gap-12 lg:grid-cols-[1fr_1.2fr]">
          <div className="lg:sticky lg:top-28">
            <SectionHeading eyebrow="Our story" title={<>From Malé, for travellers who want it done right.</>} />
            <img src={IMG.seaplane} alt="Seaplane in the Maldives" loading="lazy" className="mt-8 aspect-[4/3] w-full rounded-[2rem] object-cover" />
          </div>
          <div className="space-y-5 text-base leading-loose text-ink-700">
            <p>
              Thaa Maldives started with a simple frustration we had in common with every guest: the Maldives is
              magnificent, and booking it is a maze. Dozens of booking engines, dozens of "best rates", islands you
              can't picture — and if anything changes, you're on hold with a robot.
            </p>
            <p>
              So we built the opposite. A platform that holds real contracts with real resorts, publishes its rates
              openly, and answers the phone with a person in Malé who actually knows which side of the island the
              sunset is on.
            </p>
            <p>
              Today we sell stays across the Maldives — from five-star overwater resorts to guesthouses on local islands — with
              transparent room rates, meal plans, transfers and add-ons. Every listing is a real contract, not an affiliate link.
            </p>
            <p className="rounded-2xl bg-sand-100 p-6 italic text-ink-800">
              "You don't book a stay with Thaa. You hand it over, and we build you a better trip than you imagined."
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {STATS.map((s) => (
                <div key={s.value} className="rounded-2xl border border-ink-950/6 bg-white p-4">
                  <p className="font-display text-2xl font-semibold text-brand-700">{s.value}</p>
                  <p className="mt-1 text-[11px] leading-tight text-ink-500">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-sand-100/70 py-20">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <SectionHeading eyebrow="What we stand for" title="The lines we don’t cross." />
          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((v, i) => (
              <Reveal key={v.t} delay={i * 80}>
                <div className="h-full rounded-3xl border border-ink-950/6 bg-white p-7 shadow-[inset_0_0_0_1px_rgba(15,18,20,0.04)]">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-gold-500 text-ink-950">
                    <v.icon size={20} />
                  </span>
                  <h3 className="font-display mt-4 text-xl font-semibold text-ink-950">{v.t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-600">{v.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <SectionHeading align="center" eyebrow="Word of mouth" title="Travelers, in their own words." />
        <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <Reveal key={t.name} delay={i * 90}>
              <figure className="flex h-full flex-col rounded-3xl bg-sand-100/70 p-7">
                <Quote size={22} className="text-gold-500" />
                <div className="mt-3">
                <Stars count={t.rating} />
              </div>
                <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-ink-700">“{t.quote}”</blockquote>
                <figcaption className="mt-5 border-t border-ink-950/8 pt-4">
                  <p className="font-semibold text-ink-950">{t.name}</p>
                  <p className="mt-0.5 text-xs uppercase tracking-wide text-ink-500">{t.trip}</p>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-24 lg:px-8">
        <div className="flex flex-col items-center gap-8 rounded-[2.5rem] bg-sand-100 p-12 text-center md:p-16">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-brand-600 text-white">
            <CalendarHeart size={28} />
          </span>
          <h2 className="font-display max-w-2xl text-balance text-4xl font-semibold">
            Come travel with people who <span className="italic text-brand-600">know the islands.</span>
          </h2>
          <Button to="/contact" variant="dark" size="lg">
            Talk to Thaa Maldives <ArrowRight size={16} />
          </Button>
        </div>
      </section>
    </>
  );
}