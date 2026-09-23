import type { PackageOffer } from '@/types';

export interface ContentSite {
  brandName: string;
  tagline: string;
  footerBlurb: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
}

export interface ContentNav {
  explore: string;
  packages: string;
  travelGuide: string;
  about: string;
  outbound: string;
  travelServices: string;
}

export interface HomeHero {
  eyebrow: string;
  titleLine1: string;
  titleAccent: string;
  subtitle: string;
  videos: string[];
}

export interface ContentHome {
  hero: HomeHero;
  marquee: string[];
  stats: Array<{ value: string; label: string }>;
}

export interface ContentTestimonial {
  id: string;
  quote: string;
  name: string;
  trip: string;
  rating: number;
}

export interface ContentOffer {
  id: string;
  title: string;
  subtitle: string;
  badge?: string;
  poster: string;
  ctaLabel: string;
  ctaHref: string;
  sortOrder: number;
  startAt?: string;
  endAt?: string;
}

export interface ContentOutboundDestination {
  slug: string;
  name: string;
  eyebrow: string;
  cities: string[];
  image: string;
  blurb: string;
  fromPrice: number;
}

export interface ContentOutbound {
  title: string;
  blurb: string;
  destinations: ContentOutboundDestination[];
}

export interface OfferPopSettings {
  enabled: boolean;
  delayMs: number;
}

export interface SiteContent {
  site: ContentSite;
  nav: ContentNav;
  home: ContentHome;
  testimonials: ContentTestimonial[];
  packages: PackageOffer[];
  offers: ContentOffer[];
  outbound: ContentOutbound;
  settings: { offerPop: OfferPopSettings };
}