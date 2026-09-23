import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Clock, Mail, MapPin, Phone, Send } from 'lucide-react';
import { PageHero } from '@/components/PageHero';
import { Button, Reveal, SectionHeading } from '@/components/ui';
import { IMG } from '@/data/images';
import { properties } from '@/data/properties';
import { services } from '@/data/services';
import { CONTACT, submitEnquiry, type EnquiryPayload } from '@/lib/enquiry';

const INTEREST_STATIC = ['General enquiry', 'Maldives resort advice', 'Guest house island stay', 'Packages', 'Transfers', 'Honeymoon planning', 'Group trip', 'Custom itinerary'];

function buildInterestOptions() {
  const set = new Set<string>(INTEREST_STATIC);
  properties.forEach((p) => set.add(p.name));
  services.forEach((s) => set.add(s.name));
  return Array.from(set);
}

const INPUT =
  'w-full rounded-xl border border-ink-950/12 bg-white px-4 py-3.5 text-sm text-ink-950 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100';
const LABEL = 'text-[11px] font-bold uppercase tracking-[0.18em] text-ink-500';

export default function Contact() {
  const [params] = useSearchParams();
  const [interest, setInterest] = useState(params.get('interest') ?? 'General enquiry');
  const [subject] = useState(params.get('subjects') ?? '');
  const [form, setForm] = useState<EnquiryPayload>({ name: '', email: '', phone: '', travellers: '', travelDates: '', message: '' });
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const i = params.get('interest');
    if (i && INTEREST_STATIC.concat(properties.map((p) => p.name), services.map((s) => s.name)).includes(i)) {
      setInterest(i);
    }
  }, [params]);

  const update = (k: keyof EnquiryPayload) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSending(true);
    const payload: EnquiryPayload = { ...form, interest, message: [subject && `Subject: ${subject}`, form.message].filter(Boolean).join('\n') };
    const res = await submitEnquiry(payload);
    setSending(false);
    if (res.ok) {
      setResult(res.message);
    } else {
      setError(res.message);
    }
  };

  return (
    <>
      <PageHero
        eyebrow="Contact us"
        title={
          <>
            Say hello — <span className="italic text-gold-600">we reply fast.</span>
          </>
        }
        subtitle="Questions, dates, quotes or just daydreaming out loud. A real person in Malé picks this up."
        image={IMG.maldivesResort}
      />

      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.3fr]">
          {/* Info */}
          <div className="space-y-5 lg:sticky lg:top-28 lg:self-start">
            <Reveal>
              <div className="rounded-3xl border border-ink-950/6 bg-sand-100 p-8 shadow-[inset_0_0_0_1px_rgba(15,18,20,0.04)]">
                <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-brand-700">Thaa Maldives</p>
                <ul className="mt-6 space-y-5 text-sm text-ink-950">
                  <li>
                    <a href={CONTACT.phoneHref} className="flex items-start gap-3 transition-colors hover:text-brand-700">
                      <Phone size={17} className="mt-0.5 text-brand-700" />
                      <span><span className="block text-[11px] uppercase tracking-widest text-ink-400">Call / WhatsApp</span>{CONTACT.phone} · {CONTACT.whatsapp}</span>
                    </a>
                  </li>
                  <li>
                    <a href={CONTACT.emailHref} className="flex items-start gap-3 transition-colors hover:text-brand-700">
                      <Mail size={17} className="mt-0.5 text-brand-700" />
                      <span><span className="block text-[11px] uppercase tracking-widest text-ink-400">Email</span>{CONTACT.email}</span>
                    </a>
                  </li>
                  <li>
                    <span className="flex items-start gap-3">
                      <MapPin size={17} className="mt-0.5 text-brand-700" />
                      <span><span className="block text-[11px] uppercase tracking-widest text-ink-400">Visit</span>{CONTACT.address}</span>
                    </span>
                  </li>
                  <li>
                    <span className="flex items-start gap-3">
                      <Clock size={17} className="mt-0.5 text-brand-700" />
                      <span><span className="block text-[11px] uppercase tracking-widest text-ink-400">Hours</span>Mon–Sat 09:00–18:00 · 24/7 guest support</span>
                    </span>
                  </li>
                </ul>
              </div>
            </Reveal>
            <Reveal delay={100}>
              <div className="rounded-3xl bg-sand-100 p-7">
                <p className="text-xs font-bold uppercase tracking-widest text-ink-500">Popular shortcuts</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {properties.slice(0, 5).map((p) => (
                    <a key={p.slug} href={`/contact?interest=${encodeURIComponent(p.name)}`} className="rounded-full bg-white px-3.5 py-2 text-xs font-bold text-ink-700 transition-colors hover:bg-gold-400 hover:text-ink-950">
                      {p.name}
                    </a>
                  ))}
                  <a href="/contact?interest=Honeymoon%20planning" className="rounded-full bg-white px-3.5 py-2 text-xs font-bold text-ink-700 transition-colors hover:bg-gold-400 hover:text-ink-950">
                    Honeymoon planning
                  </a>
                  <a href="/contact?interest=Transfers" className="rounded-full bg-white px-3.5 py-2 text-xs font-bold text-ink-700 transition-colors hover:bg-gold-400 hover:text-ink-950">
                    Transfers
                  </a>
                </div>
              </div>
            </Reveal>
          </div>

          {/* Form */}
          <Reveal delay={80}>
            <div className="rounded-[2rem] border border-ink-950/6 bg-white p-8 shadow-card sm:p-10">
              {result ? (
                <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
                  <span className="grid h-16 w-16 place-items-center rounded-full bg-brand-50 text-brand-600">
                    <CheckCircle2 size={30} />
                  </span>
                  <h2 className="font-display mt-6 text-3xl font-semibold">Message sent.</h2>
                  <p className="mt-3 max-w-md text-ink-600">{result} In the meantime, {subject || 'here’s a preview of the details you sent'} — logged and waiting in Malé.</p>
                  <Button to="/packages" variant="dark" className="mt-8">
                    Browse offers <ArrowRight size={15} />
                  </Button>
                </div>
              ) : (
                <form onSubmit={onSubmit}>
                  <SectionHeading eyebrow="Send an enquiry" title="Tell us about the trip." />
                  <div className="mt-8 grid gap-5 sm:grid-cols-2">
                    <label className="block">
                      <span className={LABEL}>Full name *</span>
                      <input required value={form.name} onChange={update('name')} placeholder="Amanda Grey" className={`mt-2 ${INPUT}`} />
                    </label>
                    <label className="block">
                      <span className={LABEL}>Email *</span>
                      <input required type="email" value={form.email} onChange={update('email')} placeholder="you@example.com" className={`mt-2 ${INPUT}`} />
                    </label>
                    <label className="block">
                      <span className={LABEL}>Phone / WhatsApp</span>
                      <input type="tel" value={form.phone} onChange={update('phone')} placeholder="+960…" className={`mt-2 ${INPUT}`} />
                    </label>
                    <label className="block">
                      <span className={LABEL}>I’m interested in *</span>
                      <select required value={interest} onChange={(e) => setInterest(e.target.value)} className={`mt-2 ${INPUT}`}>
                        {buildInterestOptions().map((o) => (
                          <option key={o}>{o}</option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className={LABEL}>Travel dates</span>
                      <input type="date" value={form.travelDates} onChange={update('travelDates')} className={`mt-2 ${INPUT}`} />
                    </label>
                    <label className="block">
                      <span className={LABEL}>Travellers</span>
                      <select value={form.travellers} onChange={update('travellers')} className={`mt-2 ${INPUT}`}>
                        <option value="">Select…</option>
                        {['1 adult', '2 adults', '2 adults + 1 child', '2 adults + 2 children', '3–4 adults', 'Family group'].map((o) => (
                          <option key={o}>{o}</option>
                        ))}
                      </select>
                    </label>
                    <label className="block sm:col-span-2">
                      <span className={LABEL}>Message</span>
                      <textarea rows={5} value={form.message} onChange={update('message')} placeholder="Dream dates, flight ideas, budget range — anything helps." className={`mt-2 ${INPUT}`} />
                    </label>
                  </div>
                  {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
                  <Button type="submit" variant="gold" size="lg" className="mt-7 w-full sm:w-auto" disabled={sending}>
                    {sending ? 'Sending…' : 'Send enquiry'} <Send size={15} />
                  </Button>
                  <p className="mt-4 text-xs text-ink-400">Prefer to talk? Call {CONTACT.phone} — we answer in Malé during business hours, and 24/7 for guests already on the trip.</p>
                </form>
              )}
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}