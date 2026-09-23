import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Facebook,
  Instagram,
  Mail,
  Menu,
  MessageCircle,
  Palmtree,
  Search,
  Send,
  X,
} from 'lucide-react';
import { cx } from './ui';
import { CONTACT, subscribeNewsletter } from '@/lib/enquiry';
import { isModuleEnabled } from '@/lib/modules';
import { applyTheme, getTheme } from '@/lib/theme';
import { getContent } from '@/content/client';
import { OfferPop } from './OfferPop';

const NAV = [
  { key: 'explore', to: '/explore' },
  { key: 'packages', to: '/packages' },
  { key: 'travelGuide', to: '/travel-guide' },
  { key: 'about', to: '/about' },
] as const;

function buildNav() {
  const nav = getContent().nav;
  return [
    ...NAV.map((item) => ({ to: item.to, label: nav[item.key] })),
    ...(isModuleEnabled('outbound') ? [{ to: '/outbound-travel', label: nav.outbound }] : []),
    ...(isModuleEnabled('flights') || isModuleEnabled('visa') || isModuleEnabled('corporate') || isModuleEnabled('insurance')
      ? [{ to: '/travel-services', label: nav.travelServices }]
      : []),
  ] as Array<{ to: string; label: string }>;
}

function Logo() {
  const site = getContent().site;
  return (
    <Link to="/" className="flex items-center gap-3">
      <span className="grid h-10 w-10 place-items-center rounded-full bg-gold-400 text-ink-950 shadow-[0_8px_24px_-8px_rgb(var(--color-gold-400)/0.9)]">
        <Palmtree size={18} strokeWidth={2.4} />
      </span>
      <span className="leading-none">
        <span className="font-display block text-xl font-bold tracking-wide text-ink-950">{site.brandName}</span>
        <span className="mt-0.5 block text-[9px] font-semibold uppercase tracking-[0.32em] text-ink-500">{site.tagline}</span>
      </span>
    </Link>
  );
}

function SearchBar({ onDone }: { onDone: () => void }) {
  const [q, setQ] = useState('');
  const navigate = useNavigate();
  const submit = (e: FormEvent) => {
    e.preventDefault();
    navigate(q.trim() ? `/explore?q=${encodeURIComponent(q.trim())}` : '/explore');
    onDone();
  };
  return (
    <form onSubmit={submit} className="mx-auto flex w-full max-w-xl items-center gap-2 border-b-2 border-ink-950/15 px-1 pb-2">
      <Search size={20} className="text-ink-500" />
      <input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search destinations, packages, resorts…"
        className="w-full bg-transparent py-1 text-sm text-ink-950 placeholder:text-ink-400 focus:outline-none"
      />
      <button type="submit" className="rounded-full bg-brand-600 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-500">
        Search
      </button>
    </form>
  );
}

export function Header() {
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setMenuOpen(false), [location]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const links = useMemo(
    () => (
      <>
        {buildNav().map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cx(
                'text-sm font-medium transition-colors text-ink-700 hover:text-ink-950',
                isActive && 'text-ink-950 underline decoration-gold-500 decoration-2 underline-offset-8'
              )
            }
          >
            {item.label}
          </NavLink>
        ))}
      </>
    ),
    []
  );

  return (
    <>
      <header
        className={cx(
          'fixed inset-x-0 top-0 z-50 border-b transition-shadow duration-300',
          scrolled || searchOpen ? 'border-ink-950/8 bg-cream/95 shadow-[0_10px_40px_-20px_rgba(15,18,20,0.35)] backdrop-blur-md' : 'border-transparent bg-cream/80 backdrop-blur-sm'
        )}
      >
        <div className={cx('mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 lg:max-w-7xl lg:px-8', scrolled || searchOpen ? 'py-2' : 'py-4')}>
          <Logo />

          <nav className="hidden items-center gap-7 lg:flex">{links}</nav>

          <div className="flex items-center gap-2">
            <button
              aria-label="Search"
              onClick={() => setSearchOpen((v) => !v)}
              className="grid h-10 w-10 place-items-center rounded-full text-ink-800 transition-colors hover:bg-ink-950/5"
            >
              <Search size={19} />
            </button>
            <Link
              to="/explore"
              className="hidden items-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-all hover:-translate-y-0.5 hover:bg-brand-500 md:inline-flex"
            >
              Explore stays <ArrowRight size={14} />
            </Link>
            <Link
              to="/book"
              className="hidden items-center gap-2 rounded-full border border-ink-950/15 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-ink-800 transition-all hover:-translate-y-0.5 hover:border-gold-500 hover:bg-gold-500 hover:text-ink-950 md:inline-flex"
            >
              Start a booking
            </Link>
            <button
              aria-label="Menu"
              onClick={() => setMenuOpen((v) => !v)}
              className="grid h-10 w-10 place-items-center rounded-full text-ink-800 transition-colors hover:bg-ink-950/5 lg:hidden"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {searchOpen && <div className="border-t border-ink-950/8 bg-cream pb-4"><SearchBar onDone={() => setSearchOpen(false)} /></div>}
      </header>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 flex flex-col bg-cream pt-24">
          <nav className="flex flex-col gap-1 px-6">
            {buildNav().map((item, i) => (
              <Link
                key={item.to}
                to={item.to}
                className="flex items-center justify-between border-b border-ink-950/10 py-4 text-2xl font-semibold text-ink-950 transition-colors hover:text-brand-700"
              >
                <span>{item.label}</span>
                <span className="text-xs text-ink-300">0{i + 1}</span>
              </Link>
            ))}
          </nav>
          <div className="mt-8 flex flex-col gap-3 px-6">
            <Link to="/explore" className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-600 px-6 py-4 text-sm font-bold text-white">
              Explore stays <ArrowRight size={16} />
            </Link>
            <Link to="/book" className="inline-flex items-center justify-center gap-2 rounded-full bg-gold-500 px-6 py-4 text-sm font-bold text-ink-950">
              Start a booking <ArrowRight size={16} />
            </Link>
            <a href={CONTACT.phoneHref} className="inline-flex items-center justify-center gap-2 rounded-full border border-ink-950/15 px-6 py-4 text-sm font-semibold text-ink-800">
              <MessageCircle size={16} /> {CONTACT.phone}
            </a>
          </div>
          <p className="mt-auto px-6 pb-8 text-xs text-ink-400">Thaa Maldives — Malé, Republic of Maldives</p>
        </div>
      )}
    </>
  );
}

export function Footer() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sent'>('idle');
  const location = useLocation();
  const home = location.pathname === '/';

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    await subscribeNewsletter(email.trim());
    setStatus('sent');
    setEmail('');
  };

  return (
    <footer className="bg-sand-100 text-ink-950">
      {!home && (
        <div className="border-b border-ink-950/10">
          <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 md:grid-cols-2 md:items-center lg:px-8">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-brand-700">Don’t miss the next great escape</p>
              <h3 className="font-display mt-3 text-3xl font-semibold text-ink-950 sm:text-4xl">
                New destinations, offers and inspiration, in your inbox.
              </h3>
            </div>
            <form onSubmit={submit} className="flex w-full max-w-xl items-center gap-2 md:justify-self-end">
              <div className="relative flex-1">
                <Mail size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  className="w-full rounded-full border border-ink-950/12 bg-white py-3.5 pl-11 pr-4 text-sm text-ink-950 placeholder:text-ink-400 focus:border-gold-500 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-full bg-gold-400 px-5 py-3.5 text-sm font-bold text-ink-950 transition-colors hover:bg-gold-300"
              >
                Subscribe <Send size={14} />
              </button>
            </form>
            {status === 'sent' && <p className="text-sm text-brand-700 md:col-span-2 md:text-right">You’re on the list — welcome aboard.</p>}
          </div>
        </div>
      )}

      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div>
          <Logo />
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-ink-600">
            {getContent().site.footerBlurb}
          </p>
          <div className="mt-6 flex gap-3">
            {[Facebook, Instagram, MessageCircle].map((Icon, i) => (
              <a
                key={i}
                href={i === 2 ? CONTACT.phoneHref : '#'}
                className="grid h-10 w-10 place-items-center rounded-full border border-ink-950/15 text-ink-600 transition-colors hover:border-brand-600 hover:text-brand-600"
                aria-label="Social link"
              >
                <Icon size={16} />
              </a>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-ink-400">Explore</p>
          <ul className="mt-5 space-y-3 text-sm text-ink-600">
            <li><Link className="transition-colors hover:text-brand-700" to="/explore">Explore Stays</Link></li>
            <li><Link className="transition-colors hover:text-brand-700" to="/explore?tab=rooms">Rooms</Link></li>
            <li><Link className="transition-colors hover:text-brand-700" to="/packages">Packages</Link></li>
            <li><Link className="transition-colors hover:text-brand-700" to="/travel-guide">Travel Guide</Link></li>
            <li><Link className="transition-colors hover:text-brand-700" to="/about">About Thaa Maldives</Link></li>
          </ul>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-ink-400">Services</p>
          <ul className="mt-5 space-y-3 text-sm text-ink-600">
            <li><Link className="transition-colors hover:text-brand-700" to="/travel-services">Resorts & Stays</Link></li>
            <li><Link className="transition-colors hover:text-brand-700" to="/travel-services">Holiday Packages</Link></li>
            <li><Link className="transition-colors hover:text-brand-700" to="/travel-services">Transfers & Add-ons</Link></li>
            <li><a className="transition-colors hover:text-brand-700" href="https://wa.me/9607712345">WhatsApp Support</a></li>
            <li><Link className="transition-colors hover:text-brand-700" to="/contact">Contact Us</Link></li>
          </ul>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-ink-400">Get in touch</p>
          <ul className="mt-5 space-y-3 text-sm text-ink-600">
            <li><a href={CONTACT.phoneHref} className="transition-colors hover:text-brand-700">{CONTACT.phone}</a></li>
            <li><a href="https://wa.me/9607712345" className="transition-colors hover:text-brand-700">{CONTACT.whatsapp} (WhatsApp)</a></li>
            <li><a href={CONTACT.emailHref} className="transition-colors hover:text-brand-700">{CONTACT.email}</a></li>
            <li className="text-ink-500">{CONTACT.address}</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-ink-950/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-5 py-6 text-xs text-ink-400 sm:flex-row lg:px-8">
          <p>© {new Date().getFullYear()} Thaa Maldives. All rights reserved.</p>
          <p className="flex items-center gap-4">
            <span>Privacy</span>
            <span>·</span>
            <span>Terms</span>
          </p>
        </div>
      </div>
    </footer>
  );
}

export function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) {
        const y = el.getBoundingClientRect().top + window.scrollY - 90;
        window.scrollTo({ top: y, behavior: 'smooth' });
        return;
      }
    }
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname, hash]);
  return null;
}

export function Layout() {
  useEffect(() => {
    applyTheme(getTheme());
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <ScrollToTop />
      <OfferPop />
    </div>
  );
}