import { useState, type ReactNode } from 'react';
import { CheckCircle2, Plus, RotateCcw, Save, Trash2 } from 'lucide-react';
import { getContent, patchContent, resetContent } from '@/content/client';
import { DEFAULTS } from '@/content/defaults';
import type { ContentOutboundDestination, SiteContent } from '@/content/types';
import { isModuleEnabled } from '@/lib/modules';
import type { PackageOffer } from '@/types';
import { MODULES } from '@/config/modules';

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

const inp =
  'w-full rounded-xl border border-ink-950/10 bg-white px-3 py-2 text-sm text-ink-900 focus:border-brand-500 focus:outline-none';

function Field({
  label,
  value,
  onChange,
  textarea,
  placeholder,
  number,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  textarea?: boolean;
  placeholder?: string;
  number?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.14em] text-ink-500">{label}</span>
      {textarea ? (
        <textarea
          value={String(value)}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          placeholder={placeholder}
          className={inp}
        />
      ) : (
        <input
          value={String(value)}
          onChange={(e) => onChange(e.target.value)}
          type={number ? 'number' : 'text'}
          placeholder={placeholder}
          className={inp}
        />
      )}
    </label>
  );
}

function Group({
  eyebrow,
  title,
  hint,
  onReset,
  children,
}: {
  eyebrow: string;
  title: string;
  hint?: string;
  onReset: () => void;
  children: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-ink-950/8 bg-white p-6 shadow-card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand-700">{eyebrow}</p>
          <h3 className="font-display mt-1 text-xl font-semibold text-ink-950">{title}</h3>
          {hint && <p className="mt-1 max-w-xl text-sm text-ink-500">{hint}</p>}
        </div>
        <button
          onClick={onReset}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-ink-950/15 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-600 transition-colors hover:border-gold-500 hover:bg-gold-500 hover:text-ink-950"
        >
          <RotateCcw size={12} /> Reset
        </button>
      </div>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function ArrayEmpty({ label, onAdd }: { label: string; onAdd: () => void }) {
  return (
    <button
      onClick={onAdd}
      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-ink-950/20 py-4 text-sm font-semibold text-ink-500 transition-colors hover:border-brand-500 hover:text-brand-700"
    >
      <Plus size={15} /> Add {label}
    </button>
  );
}

export function ContentTab() {
  const [draft, setDraft] = useState<SiteContent>(() => getContent());
  const [msg, setMsg] = useState('');

  const set = (fn: (d: SiteContent) => void) =>
    setDraft((d) => {
      const next = clone(d);
      fn(next);
      return next;
    });

  const save = () => {
    patchContent(draft);
    setMsg('Content saved — the live site reads it immediately.');
  };

  const resetGroup = (key: keyof SiteContent) =>
    set((d) => {
      (d as unknown as Record<string, unknown>)[key] = clone(
        (DEFAULTS as unknown as Record<string, unknown>)[key]
      );
    });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-ink-500">
          Editorial content for the whole site, stored as a local override on top of committed defaults. Groups for
          modules appear only when the module is enabled.
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              resetContent();
              setDraft(clone(DEFAULTS));
              setMsg('All content reset to the committed defaults.');
            }}
            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-ink-950/20 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-ink-700 transition-colors hover:border-gold-500 hover:bg-gold-500 hover:text-ink-950"
          >
            <RotateCcw size={14} /> Reset all
          </button>
          <button
            onClick={save}
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-brand-500"
          >
            <Save size={14} /> Save all
          </button>
        </div>
      </div>
      {msg && (
        <p className="flex items-center gap-2 rounded-2xl bg-sand-100 p-3 text-sm text-ink-700">
          <CheckCircle2 size={16} className="text-gold-600" /> {msg}
        </p>
      )}

      <Group eyebrow="Brand" title="Site & contact" hint="Used across the header, footer and contact actions." onReset={() => resetGroup('site')}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Brand name" value={draft.site.brandName} onChange={(v) => set((d) => void (d.site.brandName = v))} />
          <Field label="Tagline" value={draft.site.tagline} onChange={(v) => set((d) => void (d.site.tagline = v))} />
          <Field label="Phone" value={draft.site.phone} onChange={(v) => set((d) => void (d.site.phone = v))} />
          <Field label="WhatsApp" value={draft.site.whatsapp} onChange={(v) => set((d) => void (d.site.whatsapp = v))} />
          <Field label="Email" value={draft.site.email} onChange={(v) => set((d) => void (d.site.email = v))} />
          <Field label="Address" value={draft.site.address} onChange={(v) => set((d) => void (d.site.address = v))} />
          <div className="sm:col-span-2">
            <Field textarea label="Footer blurb" value={draft.site.footerBlurb} onChange={(v) => set((d) => void (d.site.footerBlurb = v))} />
          </div>
        </div>
      </Group>

      <Group eyebrow="Navigation" title="Nav labels" hint="Labels appear in the header and mobile menu." onReset={() => resetGroup('nav')}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Explore" value={draft.nav.explore} onChange={(v) => set((d) => void (d.nav.explore = v))} />
          <Field label="Packages" value={draft.nav.packages} onChange={(v) => set((d) => void (d.nav.packages = v))} />
          <Field label="Travel guide" value={draft.nav.travelGuide} onChange={(v) => set((d) => void (d.nav.travelGuide = v))} />
          <Field label="About" value={draft.nav.about} onChange={(v) => set((d) => void (d.nav.about = v))} />
          <Field label="Outbound travel" value={draft.nav.outbound} onChange={(v) => set((d) => void (d.nav.outbound = v))} />
          <Field label="Travel services" value={draft.nav.travelServices} onChange={(v) => set((d) => void (d.nav.travelServices = v))} />
        </div>
      </Group>

      <Group eyebrow="Homepage" title="Hero, marquee & stats" onReset={() => resetGroup('home')}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Hero eyebrow" value={draft.home.hero.eyebrow} onChange={(v) => set((d) => void (d.home.hero.eyebrow = v))} />
          </div>
          <Field label="Hero title (line 1)" value={draft.home.hero.titleLine1} onChange={(v) => set((d) => void (d.home.hero.titleLine1 = v))} />
          <Field label="Hero title (accent)" value={draft.home.hero.titleAccent} onChange={(v) => set((d) => void (d.home.hero.titleAccent = v))} />
          <div className="sm:col-span-2">
            <Field textarea label="Hero subtitle" value={draft.home.hero.subtitle} onChange={(v) => set((d) => void (d.home.hero.subtitle = v))} />
          </div>
          <div className="sm:col-span-2">
            <Field
              textarea
              label="Hero videos (one URL per line — autoplay, muted, looping)"
              value={draft.home.hero.videos.join('\n')}
              onChange={(v) => set((d) => void (d.home.hero.videos = v.split('\n').map((s) => s.trim()).filter(Boolean)))}
            />
            <p className="mt-1.5 text-xs text-ink-400">
              Add short clips when you have them. With no videos the hero falls back to a clean image loop.
            </p>
          </div>
          <div className="sm:col-span-2">
            <Field
              label="Marquee strip (comma separated)"
              value={draft.home.marquee.join(', ')}
              onChange={(v) => set((d) => void (d.home.marquee = v.split(',').map((s) => s.trim()).filter(Boolean)))}
            />
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-500">Stats</p>
          {draft.home.stats.map((s, i) => (
            <div key={i} className="flex items-end gap-3">
              <Field label="Value" value={s.value} onChange={(v) => set((d) => void (d.home.stats[i].value = v))} />
              <div className="flex-1">
                <Field label="Label" value={s.label} onChange={(v) => set((d) => void (d.home.stats[i].label = v))} />
              </div>
              <button
                onClick={() => set((d) => void d.home.stats.splice(i, 1))}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-rose-500 hover:bg-rose-50"
                aria-label="Remove stat"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          <ArrayEmpty
            label="stat"
            onAdd={() => set((d) => void d.home.stats.push({ value: '', label: '' }))}
          />
        </div>
      </Group>

      <Group eyebrow="Word of mouth" title="Testimonials" hint="Shown on the homepage. Kept short — three reads best." onReset={() => resetGroup('testimonials')}>
        <div className="space-y-4">
          {draft.testimonials.map((t, i) => (
            <div key={t.id} className="rounded-2xl border border-ink-950/8 bg-sand-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-wider text-ink-400">{t.id}</p>
                <button
                  onClick={() => set((d) => void d.testimonials.splice(i, 1))}
                  className="grid h-8 w-8 place-items-center rounded-full text-rose-500 hover:bg-rose-50"
                  aria-label="Remove testimonial"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="sm:col-span-3">
                  <Field textarea label="Quote" value={t.quote} onChange={(v) => set((d) => void (d.testimonials[i].quote = v))} />
                </div>
                <Field label="Name" value={t.name} onChange={(v) => set((d) => void (d.testimonials[i].name = v))} />
                <Field label="Trip" value={t.trip} onChange={(v) => set((d) => void (d.testimonials[i].trip = v))} />
                <Field
                  label="Rating (1–5)"
                  number
                  value={t.rating}
                  onChange={(v) => set((d) => void (d.testimonials[i].rating = Math.max(1, Math.min(5, Number(v) || 5))))}
                />
              </div>
            </div>
          ))}
          <ArrayEmpty
            label="testimonial"
            onAdd={() =>
              set((d) =>
                void d.testimonials.push({ id: `t${Date.now()}`, quote: '', name: '', trip: '', rating: 5 })
              )
            }
          />
        </div>
      </Group>

      <Group eyebrow="Commerce" title="Offers & packages" hint="Offers feed the homepage offers strip and the special-offer card. Packages feed the Packages page." onReset={() => { resetGroup('offers'); resetGroup('packages'); }}>
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-500">Special offers</p>
        <div className="space-y-4">
          {draft.offers.map((o, i) => (
            <div key={o.id} className="rounded-2xl border border-ink-950/8 bg-sand-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-wider text-ink-400">{o.id}</p>
                <button
                  onClick={() => set((d) => void d.offers.splice(i, 1))}
                  className="grid h-8 w-8 place-items-center rounded-full text-rose-500 hover:bg-rose-50"
                  aria-label="Remove offer"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Title" value={o.title} onChange={(v) => set((d) => void (d.offers[i].title = v))} />
                <Field label="Badge (e.g. −25%)" value={o.badge ?? ''} onChange={(v) => set((d) => void (d.offers[i].badge = v))} />
                <div className="sm:col-span-2">
                  <Field label="Subtitle" value={o.subtitle} onChange={(v) => set((d) => void (d.offers[i].subtitle = v))} />
                </div>
                <Field label="Poster image (path or URL)" value={o.poster} onChange={(v) => set((d) => void (d.offers[i].poster = v))} />
                <Field label="CTA href" value={o.ctaHref} onChange={(v) => set((d) => void (d.offers[i].ctaHref = v))} />
                <Field label="CTA label" value={o.ctaLabel} onChange={(v) => set((d) => void (d.offers[i].ctaLabel = v))} />
                <Field label="Sort order" number value={o.sortOrder} onChange={(v) => set((d) => void (d.offers[i].sortOrder = Number(v) || 0))} />
                <Field label="Start date (yyyy-mm-dd)" value={o.startAt ?? ''} onChange={(v) => set((d) => void (d.offers[i].startAt = v))} />
                <Field label="End date (yyyy-mm-dd)" value={o.endAt ?? ''} onChange={(v) => set((d) => void (d.offers[i].endAt = v))} />
              </div>
            </div>
          ))}
          <ArrayEmpty
            label="offer"
            onAdd={() =>
              set((d) =>
                void d.offers.push({
                  id: `offer-${Date.now()}`,
                  title: '',
                  subtitle: '',
                  poster: '',
                  ctaLabel: 'Book this offer',
                  ctaHref: '/packages',
                  sortOrder: d.offers.length,
                })
              )
            }
          />
        </div>

        <p className="mb-3 mt-8 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-500">Packages</p>
        <div className="max-h-96 space-y-4 overflow-auto pr-1">
          {draft.packages.map((p, i) => (
            <PackageEditor
              key={p.id}
              pkg={p}
              onChange={(patch) => set((d) => void Object.assign(d.packages[i], patch))}
              onRemove={() => set((d) => void d.packages.splice(i, 1))}
            />
          ))}
        </div>
        <p className="mt-3 text-xs text-ink-400">Add/remove package entries by editing the source data — they ship with the defaults.</p>
      </Group>

      <OutboundEditor draft={draft} set={set} onReset={() => resetGroup('outbound')} />
    </div>
  );
}

function PackageEditor({
  pkg,
  onChange,
  onRemove,
}: {
  pkg: PackageOffer;
  onChange: (patch: Partial<PackageOffer>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-2xl border border-ink-950/8 bg-sand-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-wider text-ink-400">{pkg.id}</p>
        <button onClick={onRemove} className="grid h-8 w-8 place-items-center rounded-full text-rose-500 hover:bg-rose-50" aria-label="Remove package">
          <Trash2 size={14} />
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Title" value={pkg.title} onChange={(v) => onChange({ title: v })} />
        <Field label="Category" value={pkg.category} onChange={(v) => onChange({ category: v as PackageOffer['category'] })} />
        <Field label="Region" value={pkg.region} onChange={(v) => onChange({ region: v })} />
        <Field label="Nights" value={pkg.nights} onChange={(v) => onChange({ nights: v })} />
        <Field label="From (USD)" number value={pkg.from} onChange={(v) => onChange({ from: Number(v) || 0 })} />
        <Field label="Image path" value={pkg.image} onChange={(v) => onChange({ image: v })} />
        <Field label="Badge" value={pkg.badge ?? ''} onChange={(v) => onChange({ badge: v })} />
        <Field label="Label" value={pkg.label ?? ''} onChange={(v) => onChange({ label: v })} />
        <div className="sm:col-span-2">
          <Field
            label="Inclusions (comma separated)"
            value={pkg.inclusions.join(', ')}
            onChange={(v) => onChange({ inclusions: v.split(',').map((s) => s.trim()).filter(Boolean) })}
          />
        </div>
      </div>
    </div>
  );
}

function OutboundEditor({
  draft,
  set,
  onReset,
}: {
  draft: SiteContent;
  set: (fn: (d: SiteContent) => void) => void;
  onReset: () => void;
}) {
  const enabled = isModuleEnabled('outbound');

  if (!enabled) {
    return (
      <div className="rounded-3xl border border-dashed border-ink-950/15 bg-white p-6 text-sm text-ink-500">
        Outbound travel content is hidden. Enable the <strong className="text-ink-800">Outbound Travel</strong> module
        to edit destinations and specials here.
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-ink-950/8 bg-white p-6 shadow-card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand-700">Module content</p>
          <h3 className="font-display mt-1 text-xl font-semibold text-ink-950">Outbound travel</h3>
          <p className="mt-1 max-w-xl text-sm text-ink-500">
            Shown throughout the site because the{' '}
            <strong className="text-ink-800">{MODULES.find((m) => m.id === 'outbound')?.label}</strong> module is
            enabled.
          </p>
        </div>
        <button
          onClick={onReset}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-ink-950/15 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-600 transition-colors hover:border-gold-500 hover:bg-gold-500 hover:text-ink-950"
        >
          <RotateCcw size={12} /> Reset
        </button>
      </div>
      <div className="mt-5 space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Intro title" value={draft.outbound.title} onChange={(v) => set((d) => void (d.outbound.title = v))} />
          <div className="sm:col-span-2">
            <Field textarea label="Intro blurb" value={draft.outbound.blurb} onChange={(v) => set((d) => void (d.outbound.blurb = v))} />
          </div>
        </div>

        <div>
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-500">
            Destinations ({draft.outbound.destinations.length})
          </p>
          <div className="space-y-4">
            {draft.outbound.destinations.map((d, i) => (
              <DestinationEditor
                key={d.slug}
                dest={d}
                onChange={(patch) => set((n) => void Object.assign(n.outbound.destinations[i], patch))}
                onRemove={() => set((n) => void n.outbound.destinations.splice(i, 1))}
                onAddBefore={() =>
                  set((n) =>
                    void n.outbound.destinations.splice(i, 0, {
                      slug: `dest-${Date.now()}`,
                      name: 'New destination',
                      eyebrow: '',
                      cities: ['Male'],
                      image: '',
                      blurb: '',
                      fromPrice: 0,
                    })
                  )
                }
              />
            ))}
          </div>
          <ArrayEmpty
            label="destination"
            onAdd={() =>
              set((d) =>
                void d.outbound.destinations.push({
                  slug: `dest-${Date.now()}`,
                  name: 'New destination',
                  eyebrow: '',
                  cities: ['Male'],
                  image: '',
                  blurb: '',
                  fromPrice: 0,
                })
              )
            }
          />
        </div>
      </div>
    </div>
  );
}

function DestinationEditor({
  dest,
  onChange,
  onRemove,
  onAddBefore,
}: {
  dest: ContentOutboundDestination;
  onChange: (patch: Partial<ContentOutboundDestination>) => void;
  onRemove: () => void;
  onAddBefore: () => void;
}) {
  return (
    <div className="rounded-2xl border border-ink-950/8 bg-sand-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-wider text-ink-400">{dest.slug}</p>
        <div className="flex items-center gap-2">
          <button onClick={onAddBefore} className="grid h-8 w-8 place-items-center rounded-full text-ink-500 hover:bg-ink-950/5" aria-label="Insert before">
            <Plus size={14} />
          </button>
          <button onClick={onRemove} className="grid h-8 w-8 place-items-center rounded-full text-rose-500 hover:bg-rose-50" aria-label="Remove destination">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name" value={dest.name} onChange={(v) => onChange({ name: v })} />
        <Field label="Slug" value={dest.slug} onChange={(v) => onChange({ slug: v })} />
        <Field label="Eyebrow" value={dest.eyebrow} onChange={(v) => onChange({ eyebrow: v })} />
        <Field label="Cities (comma separated)" value={dest.cities.join(', ')} onChange={(v) => onChange({ cities: v.split(',').map((s) => s.trim()).filter(Boolean) })} />
        <Field label="Image path" value={dest.image} onChange={(v) => onChange({ image: v })} />
        <Field label="From price (USD)" number value={dest.fromPrice} onChange={(v) => onChange({ fromPrice: Number(v) || 0 })} />
        <div className="sm:col-span-2">
          <Field textarea label="Blurb" value={dest.blurb} onChange={(v) => onChange({ blurb: v })} />
        </div>
      </div>
    </div>
  );
}