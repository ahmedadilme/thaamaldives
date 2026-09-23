import { useEffect, useRef, useState, type ElementType, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

/* ---------------------------------- Button --------------------------------- */

type ButtonVariant = 'gold' | 'dark' | 'outline' | 'light' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

const buttonBase =
  'group/btn inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold tracking-wide transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:opacity-50';

const buttonVariants: Record<ButtonVariant, string> = {
  gold: 'bg-gold-500 text-ink-950 hover:bg-gold-400 shadow-[0_12px_30px_-12px_rgb(var(--color-gold-500)/0.8)] hover:-translate-y-0.5',
  dark: 'bg-brand-600 text-white hover:bg-brand-500 hover:-translate-y-0.5 shadow-[0_12px_30px_-12px_rgb(var(--color-brand-500)/0.7)]',
  outline:
    'border border-ink-950/20 bg-transparent text-ink-950 hover:border-gold-500 hover:bg-gold-500 hover:text-ink-950',
  light:
    'border border-ink-950/10 bg-white text-ink-950 hover:border-brand-500 hover:bg-sand-100 hover:-translate-y-0.5 shadow-card',
  ghost: 'text-ink-800 hover:text-ink-950 hover:bg-ink-950/5',
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'px-4 py-2 text-xs',
  md: 'px-6 py-3 text-sm',
  lg: 'px-8 py-4 text-sm',
};

interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  to?: string;
  href?: string;
  className?: string;
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
  as?: ElementType;
}

export function Button({ variant = 'dark', size = 'md', to, href, className, children, onClick, type = 'button', disabled }: ButtonProps) {
  const cls = cx(buttonBase, buttonVariants[variant], buttonSizes[size], className);
  if (to) {
    return (
      <Link to={to} className={cls} onClick={onClick}>
        {children}
      </Link>
    );
  }
  if (href) {
    return (
      <a href={href} className={cls} onClick={onClick}>
        {children}
      </a>
    );
  }
  return (
    <button type={type} className={cls} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

/* --------------------------------- Eyebrow --------------------------------- */

export function Eyebrow({ children, tone = 'gold' }: { children: ReactNode; tone?: 'gold' | 'light' | 'dark' }) {
  const color =
    tone === 'light'
      ? 'text-white/70'
      : tone === 'dark'
        ? 'text-ink-500'
        : 'text-gold-600';
  const line =
    tone === 'light'
      ? 'bg-gold-400'
      : tone === 'dark'
        ? 'bg-ink-400'
        : 'bg-gold-500';
  return (
    <p className={cx('flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.28em]', color)}>
      <span className={cx('h-px w-8', line)} />
      {children}
    </p>
  );
}

/* ----------------------------- Section heading ----------------------------- */

interface SectionHeadingProps {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: 'left' | 'center';
  tone?: 'dark' | 'light';
  className?: string;
}

export function SectionHeading({ eyebrow, title, description, align = 'left', tone = 'dark', className }: SectionHeadingProps) {
  const titleColor = tone === 'light' ? 'text-white' : 'text-ink-950';
  const descColor = tone === 'light' ? 'text-white/70' : 'text-ink-600';
  return (
    <div className={cx('max-w-2xl', align === 'center' && 'mx-auto text-center', className)}>
      {eyebrow && (
        <div className={cx(align === 'center' && 'flex justify-center')}>
          <Eyebrow tone={tone === 'light' ? 'light' : 'gold'}>{eyebrow}</Eyebrow>
        </div>
      )}
      <h2 className={cx('font-display mt-4 text-balance text-display-md text-4xl sm:text-5xl', titleColor)}>{title}</h2>
      {description && <p className={cx('mt-4 text-base leading-relaxed dark:text-white/80 sm:text-lg', descColor)}>{description}</p>}
    </div>
  );
}

/* ---------------------------------- Badge ---------------------------------- */

export function Badge({ children, tone = 'dark' }: { children: ReactNode; tone?: 'dark' | 'gold' | 'light' }) {
  const styles = {
    dark: 'bg-brand-600 text-white',
    gold: 'bg-gold-400 text-ink-950',
    light: 'bg-white text-ink-950',
  }[tone];
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]', styles)}>
      {children}
    </span>
  );
}

/* ---------------------------------- Stars ---------------------------------- */

export function Stars({ count = 5 }: { count?: number }) {
  return (
    <span className="flex items-center gap-0.5 text-gold-400">
      {Array.from({ length: count }).map((_, i) => (
        <Star key={i} size={14} fill="currentColor" strokeWidth={0} />
      ))}
    </span>
  );
}

/* ---------------------------------- Reveal --------------------------------- */

export function Reveal({
  children,
  delay = 0,
  className,
  as: Tag = 'div',
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: ElementType;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={cx(
        'transition-all duration-700 ease-out will-change-transform',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8',
        className
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}

/* ------------------------------ Marquee strip ------------------------------ */

export function Marquee({ items }: { items: string[] }) {
  const loop = [...items, ...items];
  return (
    <div className="relative overflow-hidden border-y border-ink-950/8 bg-sand-100 py-4">
      <div className="flex w-max animate-marquee items-center gap-10 whitespace-nowrap">
        {loop.map((item, i) => (
          <span key={i} className="flex items-center gap-10 text-xs font-semibold uppercase tracking-[0.3em] text-ink-500">
            {item}
            <span className="h-1 w-1 rounded-full bg-gold-400" />
          </span>
        ))}
      </div>
    </div>
  );
}