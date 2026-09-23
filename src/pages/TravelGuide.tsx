import { ArrowRight, CalendarDays, Compass, Lightbulb, MapPinned } from 'lucide-react';
import { PageHero } from '@/components/PageHero';
import { Badge, Button, Reveal, SectionHeading } from '@/components/ui';
import { IMG } from '@/data/images';
import { stories } from '@/data/stories';

const GUIDE_PLUS = [
  { icon: Lightbulb, t: 'Know before you go', d: 'Weather windows, visas, insurance and the little practicalities that make or break a first trip.' },
  { icon: CalendarDays, t: 'When to go', d: 'High seasons, shoulder seasons and the quiet months locals actually book.' },
  { icon: MapPinned, t: 'Neighbourhoods & islands', d: 'Straight answers on which atoll, district or island matches the trip you’re dreaming of.' },
];

export default function TravelGuide() {
  return (
    <>
      <PageHero
        eyebrow="Travel guide"
        title={
          <>
            Inspiration you can <span className="italic text-gold-600">actually pack.</span>
          </>
        }
        subtitle="Destination edits, planning advice and honest notes from the team that puts your itineraries together."
        image={IMG.japanTorii}
      />

      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="grid gap-5 md:grid-cols-3">
          {stories.map((s, i) => (
            <Reveal key={s.slug} delay={i * 80}>
              <article id={s.slug} className="group h-full scroll-mt-28 overflow-hidden rounded-3xl bg-white shadow-[inset_0_0_0_1px_rgba(15,18,20,0.06)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-card">
                <div className="relative aspect-[16/10] overflow-hidden">
                  <img src={s.image} alt={s.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink-950/50 to-transparent" />
                  <div className="absolute left-4 top-4"><Badge>{s.category}</Badge></div>
                  <p className="absolute bottom-4 left-4 text-[11px] font-bold uppercase tracking-widest text-white/85">{s.readMins} min read</p>
                </div>
                <div className="p-6">
                  <h2 className="font-display text-2xl font-semibold leading-snug group-hover:text-brand-700">{s.title}</h2>
                  <p className="mt-3 text-sm leading-relaxed text-ink-600">{s.excerpt}</p>
                  <p className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-brand-700">
                    When you're ready, we plan <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
                  </p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-24 lg:px-8">
        <div className="rounded-[2.5rem] bg-sand-100/70 p-10 md:p-14">
          <SectionHeading eyebrow="Go beyond the list" title="What the guides don’t cover — until you ask." />
          <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
            {GUIDE_PLUS.map((g, i) => (
              <Reveal key={g.t} delay={i * 80}>
                <div className="h-full rounded-3xl bg-white p-7 shadow-[inset_0_0_0_1px_rgba(15,18,20,0.06)]">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-700">
                    <g.icon size={20} />
                  </span>
                  <h3 className="font-display mt-4 text-xl font-semibold">{g.t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-600">{g.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <div className="mt-12 flex flex-wrap items-center justify-between gap-6">
            <p className="flex items-center gap-3 font-display text-2xl font-semibold">
              <Compass className="text-brand-600" /> Still deciding? Let’s talk it through.
            </p>
            <Button to="/contact?interest=Travel%20advice" variant="dark" size="lg">
              Ask a Travel Expert <ArrowRight size={16} />
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}