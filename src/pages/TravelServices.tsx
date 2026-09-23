import { ArrowRight, BadgeCheck, Headset, ShipWheel, Sparkles } from 'lucide-react';
import { PageHero } from '@/components/PageHero';
import { Button, Reveal, SectionHeading } from '@/components/ui';
import { IMG } from '@/data/images';
import { services } from '@/data/services';
import { type ModuleId } from '@/config/modules';
import { isModuleEnabled } from '@/lib/modules';
import { cx } from '@/components/ui';

const PROMISES = [
  { icon: BadgeCheck, t: 'One point of contact', d: 'A single person on your trip from quote to comeback.' },
  { icon: ShipWheel, t: 'Transfers matched to you', d: 'Seaplane, speedboat or domestic — fitted around your flight, not the other way round.' },
  { icon: Headset, t: '24/7 support', d: 'Real people when you’re in the air, at the airport or on the island.' },
];

export default function TravelServices() {
  const visible = services.filter((s) => !s.module || isModuleEnabled(s.module as ModuleId));

  return (
    <>
      <PageHero
        eyebrow="Travel services"
        title={
          <>
            Every part your trip needs, <span className="italic text-gold-600">handled.</span>
          </>
        }
        subtitle="A travel agency isn’t a booking engine with a phone number. It’s the whole operational layer behind your holiday."
        image={IMG.airport}
      />

      {visible.length === 0 && (
        <section className="mx-auto max-w-7xl px-5 py-20 text-center lg:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-ink-400">No issue at all</p>
          <h2 className="font-display mx-auto mt-3 max-w-xl text-3xl font-semibold">
            Right now we focus on stays — and a handful of services power that.
          </h2>
          <Button to="/explore" variant="dark" size="lg" className="mt-7">
            Explore stays <ArrowRight size={15} />
          </Button>
        </section>
      )}

      <section className="mx-auto max-w-7xl space-y-20 px-5 py-20 lg:px-8">
        {visible.map((s, i) => (
          <div key={s.slug} id={s.slug} className="grid scroll-mt-28 items-center gap-8 lg:grid-cols-2 lg:gap-14">
            <Reveal className={cx(i % 2 === 1 && 'lg:order-2')}>
              <img src={s.image} alt={s.name} loading="lazy" className="aspect-[4/3] w-full rounded-[2rem] object-cover" />
            </Reveal>
            <Reveal delay={80}>
              <div className="flex items-center gap-3">
                <span className="font-display text-6xl font-semibold leading-none text-gold-400">{String(i + 1).padStart(2, '0')}</span>
                <span className="h-px flex-1 bg-ink-950/10" />
              </div>
              <h2 className="font-display mt-5 text-3xl font-semibold sm:text-4xl">{s.name}</h2>
              <p className="mt-5 leading-relaxed text-ink-600">{s.long}</p>
              <Button to={`/contact?interest=${encodeURIComponent(s.name)}`} variant="dark" size="md" className="mt-7">
                Ask about {s.name} <ArrowRight size={15} />
              </Button>
            </Reveal>
          </div>
        ))}
      </section>

      {visible.length > 0 && (
      <section className="bg-sand-100/70 py-20">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <SectionHeading eyebrow="Service, not just services" title="Three promises behind everything we do." />
          <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
            {PROMISES.map((p, i) => (
              <Reveal key={p.t} delay={i * 80}>
                <div className="h-full rounded-3xl border border-ink-950/6 bg-white p-7 shadow-[inset_0_0_0_1px_rgba(15,18,20,0.04)]">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gold-500 text-ink-950">
                    <p.icon size={22} />
                  </span>
                  <h3 className="font-display mt-5 text-2xl font-semibold text-ink-950">{p.t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-600">{p.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
      )}

      {visible.length === 0 && (
        <section className="bg-sand-100/70 py-20">
          <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-5 text-center lg:px-8">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-gold-50 text-gold-600"><Sparkles size={24} /></span>
            <h2 className="font-display max-w-2xl text-3xl font-semibold">Flight booking, visas and more are on our roadmap.</h2>
            <p className="max-w-xl text-sm text-ink-600">These modules are switched on by our team when ready — check back, or ask us directly.</p>
            <Button to="/contact?interest=Travel%20services" variant="dark" size="lg">Ask about a service <ArrowRight size={15} /></Button>
          </div>
        </section>
      )}
    </>
  );
}