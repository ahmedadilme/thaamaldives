import type { Service } from '@/types';
import { IMG } from './images';

export const services: Service[] = [
  {
    slug: 'flights',
    name: 'Flights',
    blurb: 'International & domestic flight arrangements.',
    long:
      'From Malé to the world and back, we find the right routes, timings and fares for your journey — including domestic and seaplane connections to your island.',
    image: IMG.airport,
    module: 'flights',
  },
  {
    slug: 'hotels-resorts',
    name: 'Hotels & Resorts',
    blurb: 'From local stays to luxury resorts.',
    long:
      'Direct contracts with countless Maldives resorts and a global hotel network mean honest rates — from guesthouses on local islands to five-star overwater villas.',
    image: IMG.hotel,
  },
  {
    slug: 'holiday-packages',
    name: 'Holiday Packages',
    blurb: 'Ready-made and tailor-made holidays.',
    long:
      'Flights, stays, transfers and experiences bundled into one simple price — or built around you entirely. Tell us your dates and let us design the rest.',
    image: IMG.maldivesResort,
  },
  {
    slug: 'transfers',
    name: 'Transfers',
    blurb: 'Speedboat, seaplane and other transfers.',
    long:
      'Seamless meet-and-greet at Velana International Airport and every connection to your resort — speedboat, seaplane, domestic flight or private transfer, arranged around your arrival.',
    image: IMG.seaplane,
  },
  {
    slug: 'visa',
    name: 'Visa Assistance',
    blurb: 'Support with travel documentation.',
    long:
      'Clear, current guidance and processing support for visas across our key destinations — so your paperwork never delays your departure.',
    image: IMG.tokyo,
    module: 'visa',
  },
  {
    slug: 'corporate',
    name: 'Corporate Travel',
    blurb: 'Business travel and corporate arrangements.',
    long:
      'Reliable business travel management for Maldivian companies — flights, hotels, group rates and a dedicated desk when things change at the last minute.',
    image: IMG.london,
    module: 'corporate',
  },
  {
    slug: 'insurance',
    name: 'Travel Insurance',
    blurb: 'Protection for your journey.',
    long:
      'Recommend and arrange comprehensive travel insurance so the minor setbacks of travel — missed flights, weather, illness — stay minor.',
    image: IMG.tropicalAerial,
    module: 'insurance',
  },
  {
    slug: 'support',
    name: 'Travel Support',
    blurb: 'Help before, during and after your trip.',
    long:
      'A real person on your side at every stage. Before you travel for planning, during for help on the ground, and after so we learn how to do better for you.',
    image: IMG.couple,
  },
];