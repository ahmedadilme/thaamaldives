import type { Story } from '@/types';
import { IMG } from './images';

export const stories: Story[] = [
  {
    slug: 'first-time-maldives',
    title: 'Your first Maldives holiday — the honest guide',
    category: 'Destinations',
    excerpt:
      'Resort vs guesthouse, seaplane vs speedboat, which atoll suits your dates — everything that first-time travellers actually ask us.',
    image: IMG.maldivesAerial,
    readMins: 6,
  },
  {
    slug: 'when-to-book',
    title: 'When to book a Maldives resort to get the best rate',
    category: 'Planning',
    excerpt:
      '"When should I book?" is our most common question. Early bird windows, shoulder seasons and how our contract rates actually work.',
    image: IMG.beachChairs,
    readMins: 4,
  },
  {
    slug: 'japan-itin',
    title: 'Seven perfect nights in Japan — an itinerary',
    category: 'Outbound',
    excerpt:
      'Tokyo, Kyoto and Osaka in one week without running yourself ragged — our favourite trains, temples and late-night bowls of ramen.',
    image: IMG.japanTorii,
    readMins: 7,
    module: 'outbound',
  },
  {
    slug: 'local-islands',
    title: 'Maldives on a local island: beaches without the price tag',
    category: 'Budget',
    excerpt:
      'Guesthouses on inhabited islands unlock the same turquoise water for a fraction of the resort rate. Here is what you trade away.',
    image: IMG.maldivesBeach,
    readMins: 5,
  },
];