import type { ReactNode } from 'react';
import { Reveal } from './ui';

export function PageHero({
  eyebrow,
  title,
  subtitle,
  image,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  subtitle?: ReactNode;
  image: string;
  children?: ReactNode;
}) {
  return (
    <section className="relative flex min-h-[58vh] items-end overflow-hidden bg-cream pt-32">
      <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-90" />
      <div className="absolute inset-0 bg-gradient-to-b from-cream/75 via-cream/55 to-cream/90" />
      <div className="relative z-10 mx-auto w-full max-w-7xl px-5 pb-14 lg:px-8">
        <Reveal>
          <p className="text-[11px] font-bold uppercase tracking-[0.4em] text-brand-700">{eyebrow}</p>
          <h1 className="font-display mt-4 max-w-3xl text-balance text-display-lg font-semibold text-ink-950">{title}</h1>
          {subtitle && <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink-700 sm:text-lg">{subtitle}</p>}
          {children}
        </Reveal>
      </div>
    </section>
  );
}