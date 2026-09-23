import type { SiteContent, ContentOffer } from './types';
import { testimonials as dataTestimonials } from '@/data/testimonials';
import { packages as dataPackages } from '@/data/outbound';
import { outboundDestinations } from '@/data/outbound';

export const DEFAULT_OFFERS: ContentOffer[] = [];

export const DEFAULTS: SiteContent = {
  site: {
    brandName: 'THAA MALDIVES',
    tagline: 'Resorts · Hotels · Guesthouses',
    footerBlurb:
      'We sell Maldivian escapes — from five-star resorts to guest houses on local islands — with honest contract rates, transfers, meal plans and add-ons arranged by people who live here.',
    phone: '+960 334 5678',
    whatsapp: '+960 771 2345',
    email: 'hello@thaamaldives.mv',
    address: 'Ameer Ahmed Magu, Malé, Republic of Maldives',
  },
  nav: {
    explore: 'Explore',
    packages: 'Packages',
    travelGuide: 'Travel Guide',
    about: 'About',
    outbound: 'Outbound Travel',
    travelServices: 'Travel Services',
  },
  home: {
    hero: {
      eyebrow: 'Thaa Maldives · Resorts, hotels & guest houses',
      titleLine1: 'The Maldives —',
      titleAccent: 'arranged properly.',
      subtitle:
        'Contract rates straight from the islands. Resorts, hotels and guest houses you can actually book — with live estimates, honest advice and a real person in Malé from first look to final night.',
      videos: [],
    },
    marquee: ['Resorts', 'Hotels', 'Guest Houses', 'Overwater villas', 'Local islands', 'House reefs', 'Sunset cruises', 'Honeymoons'],
    stats: [
      { value: '15+', label: 'Years arranging travel from Malé' },
      { value: '8', label: 'Stays on contract, more every month' },
      { value: '12k', label: 'Travellers looked after' },
      { value: '5★', label: 'Service on the islands, not just at the desk' },
    ],
  },
  testimonials: dataTestimonials.map((t, i) => ({ id: `t${i + 1}`, ...t })),
  packages: dataPackages,
  offers: DEFAULT_OFFERS,
  outbound: {
    title: 'Outbound travel from Malé',
    blurb: 'Japan, Dubai, Thailand and Europe — flights, hotels and routes arranged from Malé.',
    destinations: outboundDestinations,
  },
  settings: {
    offerPop: { enabled: true, delayMs: 3000 },
  },
};